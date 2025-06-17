<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import Chart from 'chart.js/auto';
	import type { TooltipItem } from 'chart.js';
	import { supabase } from '$lib/supabaseClient';

	export let course_id: string | null = null;

	let chartCanvas: HTMLCanvasElement | undefined; // Canvas kann undefined sein, wenn nicht im DOM
	let distributionChart: Chart | null = null;

	let isLoading = true;
	let errorMsg: string | null = null;
	let courseName: string | null = null;
	// Änderung: assignment_id ist jetzt string
	let assignmentsList: { assignment_id: string; assignment_name: string }[] = [];
	let selectedView: string = 'overall'; // 'overall' oder assignment_id als string

	let chartDisplayData: { labels: string[]; data: number[] } | null = null;
	let averageGradeDisplay: string | null = null;

	let currentCourseIdInternal: string | null = null;

	let showNoAssignmentsMessage = false;

	// Helper function to round to nearest 0.25
	function roundToNearestQuarter(value: number): number {
		return Math.round(value * 4) / 4;
	}

	function getBarColors(count: number): { backgrounds: string[]; borders: string[] } {
		const baseColors = [
			{ bg: 'rgba(75, 192, 192, 0.7)', border: 'rgba(75, 192, 192, 1)' }, // Teal
			{ bg: 'rgba(54, 162, 235, 0.7)', border: 'rgba(54, 162, 235, 1)' }, // Blue
			{ bg: 'rgba(255, 206, 86, 0.7)', border: 'rgba(255, 206, 86, 1)' }, // Yellow
			{ bg: 'rgba(255, 99, 132, 0.7)', border: 'rgba(255, 99, 132, 1)' },  // Red
			{ bg: 'rgba(153, 102, 255, 0.7)', border: 'rgba(153, 102, 255, 1)' },// Purple
			{ bg: 'rgba(255, 159, 64, 0.7)', border: 'rgba(255, 159, 64, 1)' }  // Orange
		];
		const backgrounds: string[] = [];
		const borders: string[] = [];
		for (let i = 0; i < count; i++) {
			backgrounds.push(baseColors[i % baseColors.length].bg);
			borders.push(baseColors[i % baseColors.length].border);
		}
		return { backgrounds, borders };
	}

	async function fetchOverallGradeDistribution(courseIdNum: number) {
		chartDisplayData = null;
		averageGradeDisplay = null;

		const { data: courseAssignmentsWithWeight, error: assignmentsError } = await supabase
			.from('assignments')
			.select('assignment_id, weight')
			.eq('course_id', courseIdNum);

		if (assignmentsError || !courseAssignmentsWithWeight) {
			throw new Error(`Failed to fetch assignment weights for overall calculation: ${assignmentsError?.message}`);
		}

		// Annahme: assignment_id von Supabase ist string (UUID)
		const usableAssignments = courseAssignmentsWithWeight.filter(a => typeof a.weight === 'number' && a.weight > 0 && a.assignment_id);

		if (usableAssignments.length === 0) {
			chartDisplayData = { labels: [], data: [] };
			averageGradeDisplay = 'N/A';
			return;
		}

		const { data: enrollments, error: enrollmentsError } = await supabase
			.from('enrollments')
			.select('enrollment_id')
			.eq('course_id', courseIdNum);

		if (enrollmentsError) throw new Error(`Failed to fetch enrollments: ${enrollmentsError.message}`);
		if (!enrollments || enrollments.length === 0) {
			errorMsg = 'No students enrolled in this course.';
			chartDisplayData = { labels: [], data: [] };
			averageGradeDisplay = 'N/A';
			return;
		}

		const studentFinalGrades: number[] = [];
		for (const enrollment of enrollments) {
			const { data: studentGrades, error: gradesError } = await supabase
				.from('student_grades')
				.select('assignment_id, grade')
				.eq('enrollment_id', enrollment.enrollment_id)
				.in('assignment_id', usableAssignments.map(a => a.assignment_id)); // assignment_id ist hier string

			if (gradesError) {
				console.warn(`Could not fetch grades for enrollment ${enrollment.enrollment_id}: ${gradesError.message}`);
				continue;
			}

			let totalWeightedGrade = 0;
			let totalWeight = 0;
			if (studentGrades && studentGrades.length > 0) {
				for (const ca of usableAssignments) {
					const gradeEntry = studentGrades.find(sg => sg.assignment_id === ca.assignment_id);
					if (gradeEntry && typeof gradeEntry.grade === 'number' && ca.weight && ca.weight > 0) {
						totalWeightedGrade += gradeEntry.grade * ca.weight;
						totalWeight += ca.weight;
					}
				}
			}
			if (totalWeight > 0) {
				studentFinalGrades.push(totalWeightedGrade / totalWeight);
			}
		}

		if (studentFinalGrades.length === 0) {
			errorMsg = 'No final student grades could be calculated with the available data.';
			chartDisplayData = { labels: [], data: [] };
			averageGradeDisplay = 'N/A';
			return;
		}

		const gradeCounts: { [key: string]: number } = {};
		studentFinalGrades.forEach(grade => {
			const roundedGrade = roundToNearestQuarter(grade);
			const bin = roundedGrade.toFixed(2);
			gradeCounts[bin] = (gradeCounts[bin] || 0) + 1;
		});

		const sortedBins = Object.keys(gradeCounts).sort((a, b) => parseFloat(a) - parseFloat(b));
		chartDisplayData = {
			labels: sortedBins,
			data: sortedBins.map(bin => gradeCounts[bin])
		};
		const sumOfGrades = studentFinalGrades.reduce((acc, grade) => acc + grade, 0);
		averageGradeDisplay = (sumOfGrades / studentFinalGrades.length).toFixed(2);
	}

	// Änderung: assignmentId ist jetzt string
	async function fetchAssignmentGradeDistribution(courseIdNum: number, assignmentId: string) {
		chartDisplayData = null;
		averageGradeDisplay = null;

		const { data: gradesData, error: gradesError } = await supabase
			.from('student_grades')
			.select('grade, enrollments!inner(course_id)')
			.eq('assignment_id', assignmentId) // assignmentId ist string
			.eq('enrollments.course_id', courseIdNum)
			.not('grade', 'is', null);


		if (gradesError) throw new Error(`Failed to fetch grades for assignment: ${gradesError.message}`);
		if (!gradesData || gradesData.length === 0) {
			errorMsg = 'No grades found for this assignment in this course.';
			chartDisplayData = { labels: [], data: [] };
			averageGradeDisplay = 'N/A';
			return;
		}

		const gradesForAssignment = gradesData.map(g => g.grade).filter(g => typeof g === 'number') as number[];

		if (gradesForAssignment.length === 0) {
			errorMsg = 'No valid grades found for this assignment.';
			chartDisplayData = { labels: [], data: [] };
			averageGradeDisplay = 'N/A';
			return;
		}

		const gradeCounts: { [key: string]: number } = {};
		gradesForAssignment.forEach(grade => {
			const roundedGrade = roundToNearestQuarter(grade);
			const bin = roundedGrade.toFixed(2);
			gradeCounts[bin] = (gradeCounts[bin] || 0) + 1;
		});

		const sortedBins = Object.keys(gradeCounts).sort((a, b) => parseFloat(a) - parseFloat(b));
		chartDisplayData = {
			labels: sortedBins,
			data: sortedBins.map(bin => gradeCounts[bin])
		};
		const sumOfGrades = gradesForAssignment.reduce((acc, grade) => acc + grade, 0);
		averageGradeDisplay = (sumOfGrades / gradesForAssignment.length).toFixed(2);
	}

	async function fetchData() {
		if (!currentCourseIdInternal) {
			isLoading = false;
			errorMsg = 'Course ID not available.';
			return;
		}

		isLoading = true;
		errorMsg = null;
		showNoAssignmentsMessage = false;
		chartDisplayData = null;
		averageGradeDisplay = null;


		const courseIdNum = parseInt(currentCourseIdInternal);
		if (isNaN(courseIdNum)) {
			errorMsg = 'Invalid Course ID format.';
			isLoading = false;
			return;
		}

		try {
			const { data: courseDetails, error: courseError } = await supabase
				.from('courses')
				.select('course_name')
				.eq('course_id', courseIdNum)
				.single();
			if (courseError || !courseDetails) throw new Error(courseError?.message || 'Failed to fetch course name.');
			courseName = courseDetails.course_name;

			if (assignmentsList.length === 0) {
				const { data: fetchedAssignments, error: assignmentsFetchError } = await supabase
					.from('assignments')
					.select('assignment_id, assignment_name') // assignment_id kommt als string (UUID)
					.eq('course_id', courseIdNum)
					.order('assignment_name');
				if (assignmentsFetchError) throw new Error(`Failed to fetch assignments: ${assignmentsFetchError.message}`);
				assignmentsList = fetchedAssignments || []; // Typ von assignmentsList.assignment_id ist jetzt string
			}

			if (assignmentsList.length === 0) {
				showNoAssignmentsMessage = true;
				chartDisplayData = { labels: [], data: [] };
				averageGradeDisplay = 'N/A';
			} else {
				showNoAssignmentsMessage = false;
				if (selectedView === 'overall') {
					await fetchOverallGradeDistribution(courseIdNum);
				} else {
					// Änderung: selectedView direkt als string übergeben
					if (!selectedView) throw new Error('Invalid assignment selected.'); // Sicherheitscheck
					await fetchAssignmentGradeDistribution(courseIdNum, selectedView);
				}
			}
		} catch (e: any) {
			console.error('Error fetching course grade data:', e);
			errorMsg = e.message || 'An unknown error occurred.';
			chartDisplayData = null;
			averageGradeDisplay = null;
			showNoAssignmentsMessage = false;
		} finally {
			isLoading = false;
		}
	}

	function getChartTitle(): string {
		if (isLoading && !showNoAssignmentsMessage) return 'Loading Grade Distribution...';
		if (showNoAssignmentsMessage && courseName) return `${courseName} - Grade Distribution`;
		if (showNoAssignmentsMessage) return 'Grade Distribution';
		if (errorMsg && !isLoading) return courseName ? `${courseName} - Grade Distribution` : 'Grade Distribution';


		let title = `${courseName || 'Course'} - Grade Distribution`;
		const selectedAssignment = assignmentsList.find(a => a.assignment_id === selectedView); // Direkter Vergleich mit string

		if (selectedView === 'overall') {
			title += ' (Overall Student Performance)';
		} else if (selectedAssignment) {
			title += ` (${selectedAssignment.assignment_name})`;
		}

		if (averageGradeDisplay && averageGradeDisplay !== 'N/A' && !isLoading && !errorMsg && chartDisplayData && chartDisplayData.labels.length > 0) {
			title += ` (Avg: ${averageGradeDisplay})`;
		} else if (averageGradeDisplay === 'N/A' && !isLoading && !errorMsg && chartDisplayData && chartDisplayData.labels.length > 0) {
			title += ` (Avg: N/A)`;
		}
		return title;
	}

	function destroyChart() {
		if (distributionChart) {
			distributionChart.destroy();
			distributionChart = null;
		}
	}

	function renderChart() {
		destroyChart();

		if (!chartCanvas) {
			return;
		}
		if (!chartDisplayData || chartDisplayData.labels.length === 0) {
			const ctx = chartCanvas.getContext('2d');
			if (ctx) ctx.clearRect(0, 0, chartCanvas.width, chartCanvas.height);
			return;
		}

		const ctx = chartCanvas.getContext('2d');
		if (!ctx) {
			console.error('Failed to get 2D context from canvas for chart rendering.');
			return;
		}

		const colors = getBarColors(chartDisplayData.labels.length);
		distributionChart = new Chart(ctx, {
			type: 'bar',
			data: {
				labels: chartDisplayData.labels,
				datasets: [{
					label: 'Number of Students/Grades',
					data: chartDisplayData.data,
					backgroundColor: colors.backgrounds,
					borderColor: colors.borders,
					borderWidth: 1
				}]
			},
			options: {
				responsive: true,
				maintainAspectRatio: false,
				scales: {
					y: {
						beginAtZero: true,
						title: {
							display: true,
							text: 'Count'
						},
						ticks: {
							stepSize: 1
						}
					},
					x: {
						title: {
							display: true,
							text: 'Grade Bins (Rounded to nearest 0.25)'
						}
					}
				},
				plugins: {
					legend: {
						display: false,
					},
					title: {
						display: true,
						text: getChartTitle(),
						font: { size: 16, weight: 'bold' },
						padding: { top: 10, bottom: 20 }
					},
					tooltip: {
						callbacks: {
							label: function(context: TooltipItem<'bar'>) {
								let countLabel = context.dataset.label || 'Count';
								if (context.parsed.y !== null) {
									const binLabel = parseFloat(context.label).toFixed(2);
									return `${binLabel}: ${context.parsed.y} ${countLabel.includes('Students') ? 'students' : 'grades'}`;
								}
								return '';
							}
						}
					}
				}
			}
		});
	}

	onMount(() => {
		if (course_id) {
			currentCourseIdInternal = course_id;
			fetchData();
		} else {
			isLoading = false;
			errorMsg = "Course ID not provided on mount.";
		}
	});

	onDestroy(() => {
		destroyChart();
	});

	$: if (course_id && course_id !== currentCourseIdInternal) {
		currentCourseIdInternal = course_id;
		selectedView = 'overall';
		assignmentsList = [];
		chartDisplayData = null;
		averageGradeDisplay = null;
		showNoAssignmentsMessage = false;
		errorMsg = null;
		fetchData();
	}

	function handleViewChange() {
		errorMsg = null;
		if (course_id && !showNoAssignmentsMessage) {
			fetchData();
		}
	}

	$: {
		if (chartCanvas && !isLoading && !showNoAssignmentsMessage && !errorMsg && chartDisplayData && chartDisplayData.labels.length > 0) {
			renderChart();
		} else if (distributionChart) {
			destroyChart();
			if (chartCanvas) {
				const ctx = chartCanvas.getContext('2d');
				if (ctx) ctx.clearRect(0, 0, chartCanvas.width, chartCanvas.height);
			}
		}
	}

</script>

<div class="p-1 h-full">
	<div class="flex flex-col h-96 bg-white shadow-lg rounded-lg overflow-hidden">
		<div class="p-4 bg-gray-50 border-b border-gray-200 flex-shrink-0">
			<div class="flex flex-col sm:flex-row justify-between items-center">
				<label for="gradeViewSelect" class="text-md font-semibold text-gray-700 mb-2 sm:mb-0 sm:mr-3">View Distribution For:</label>
				<select id="gradeViewSelect" bind:value={selectedView} on:change={handleViewChange}
								class="p-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm w-full sm:w-auto"
								disabled={isLoading || (showNoAssignmentsMessage && assignmentsList.length === 0) }>
					<option value="overall">Overall Course Performance</option>
					{#if assignmentsList.length > 0}
						<optgroup label="Individual Assignments">
							{#each assignmentsList as assignment (assignment.assignment_id)}
								<option value={assignment.assignment_id}> <!-- value ist jetzt string -->
									{assignment.assignment_name}
								</option>
							{/each}
						</optgroup>
					{/if}
				</select>
			</div>
		</div>

		<div class="flex-grow p-4 relative">
			{#if isLoading}
				<div class="absolute inset-0 flex items-center justify-center">
					<p class="text-gray-500 text-lg">Loading Grade Distribution...</p>
				</div>
			{:else if showNoAssignmentsMessage}
				<div class="absolute inset-0 flex flex-col items-center justify-center text-center p-2">
					<svg xmlns="http://www.w3.org/2000/svg" class="h-10 w-10 text-blue-400 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
						<path stroke-linecap="round" stroke-linejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
					</svg>
					<p class="text-lg font-semibold text-gray-700">No Assignments Yet</p>
					<p class="text-sm text-gray-500 mt-1">No assignments have been created yet for this course.</p>
				</div>
			{:else if errorMsg}
				<div class="absolute inset-0 flex items-center justify-center text-center p-2">
					<p class="text-md text-red-500">{errorMsg}</p>
				</div>
			{:else if !chartDisplayData || chartDisplayData.labels.length === 0}
				<div class="absolute inset-0 flex items-center justify-center text-center p-2">
					<p class="text-md text-gray-500">No grade data available for this view.</p>
				</div>
			{:else}
				<canvas bind:this={chartCanvas}></canvas>
			{/if}
		</div>
	</div>
</div>