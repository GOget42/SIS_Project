<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import Chart from 'chart.js/auto';
	import type { TooltipItem } from 'chart.js';
	import { supabase } from '$lib/supabaseClient';

	export let course_id: string | null = null;

	let chartCanvas: HTMLCanvasElement;
	let distributionChart: Chart | null = null;

	let isLoading = true;
	let errorMsg: string | null = null;
	let courseName: string | null = null;
	let assignmentsList: { assignment_id: number; assignment_name: string }[] = [];
	let selectedView: string = 'overall'; // 'overall' or assignment_id as string

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

		const usableAssignments = courseAssignmentsWithWeight.filter(a => typeof a.weight === 'number' && a.weight > 0);

		if (usableAssignments.length === 0) {
			errorMsg = 'No assignments with defined weights found to calculate overall grades.';
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
				.in('assignment_id', usableAssignments.map(a => a.assignment_id));

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
			const bin = roundedGrade.toFixed(2); // Format as "X.00", "X.25", "X.50", "X.75"
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

	async function fetchAssignmentGradeDistribution(courseIdNum: number, assignmentIdNum: number) {
		chartDisplayData = null;
		averageGradeDisplay = null;

		const { data: gradesData, error: gradesError } = await supabase
			.from('student_grades')
			.select('grade, enrollments!inner(course_id)')
			.eq('assignment_id', assignmentIdNum)
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
			const bin = roundedGrade.toFixed(2); // Format as "X.00", "X.25", "X.50", "X.75"
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
			renderChart();
			return;
		}

		isLoading = true;
		errorMsg = null;
		showNoAssignmentsMessage = false;

		const courseIdNum = parseInt(currentCourseIdInternal);
		if (isNaN(courseIdNum)) {
			errorMsg = 'Invalid Course ID format.';
			isLoading = false;
			renderChart();
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
					.select('assignment_id, assignment_name')
					.eq('course_id', courseIdNum)
					.order('assignment_name');
				if (assignmentsFetchError) throw new Error(`Failed to fetch assignments: ${assignmentsFetchError.message}`);
				assignmentsList = fetchedAssignments || [];
			}

			if (assignmentsList.length === 0) {
				showNoAssignmentsMessage = true;
				errorMsg = "No assignments have been created yet.";
				chartDisplayData = { labels: [], data: [] };
				averageGradeDisplay = 'N/A';
			} else {
				showNoAssignmentsMessage = false;
				if (selectedView === 'overall') {
					await fetchOverallGradeDistribution(courseIdNum);
				} else {
					const assignmentIdNum = parseInt(selectedView);
					if (isNaN(assignmentIdNum)) throw new Error('Invalid assignment selected.');
					await fetchAssignmentGradeDistribution(courseIdNum, assignmentIdNum);
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
			renderChart();
		}
	}

	function getChartTitle(): string {
		if (!courseName && !isLoading && !showNoAssignmentsMessage) return 'Grade Distribution';
		if (isLoading && !showNoAssignmentsMessage) return 'Loading Grade Distribution...';
		if (showNoAssignmentsMessage && courseName) return `${courseName} - Grade Distribution`;
		if (showNoAssignmentsMessage) return 'Grade Distribution';


		let title = `${courseName || 'Course'} - Grade Distribution`;
		const selectedAssignment = assignmentsList.find(a => a.assignment_id.toString() === selectedView);

		if (selectedView === 'overall') {
			title += ' (Overall Student Performance)';
		} else if (selectedAssignment) {
			title += ` (${selectedAssignment.assignment_name})`;
		}

		if (averageGradeDisplay && averageGradeDisplay !== 'N/A' && !isLoading) {
			title += ` (Avg: ${averageGradeDisplay})`;
		} else if (averageGradeDisplay === 'N/A' && !isLoading) {
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
		if (showNoAssignmentsMessage || !chartCanvas) {
			return;
		}
		const ctx = chartCanvas.getContext('2d');
		if (!ctx) return;

		ctx.clearRect(0, 0, chartCanvas.width, chartCanvas.height);

		if (errorMsg && (!chartDisplayData || chartDisplayData.labels.length === 0)) {
			ctx.font = '16px Arial';
			ctx.textAlign = 'center';
			ctx.fillStyle = '#EF4444'; // red-500
			ctx.fillText(errorMsg, chartCanvas.width / 2, chartCanvas.height / 2);
			return;
		}

		if (!chartDisplayData || chartDisplayData.labels.length === 0) {
			ctx.font = '16px Arial';
			ctx.textAlign = 'center';
			ctx.fillStyle = '#6B7280';
			let noDataMessage = 'No grade data available for this view.';
			if (errorMsg) noDataMessage = errorMsg;
			ctx.fillText(noDataMessage, chartCanvas.width / 2, chartCanvas.height / 2);
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
							stepSize: 1 // Ensure y-axis ticks are integers
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
									// Ensure the label shows the bin correctly (e.g., "3.25")
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
			renderChart();
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
		fetchData();
	}

	function handleViewChange() {
		if (course_id && !showNoAssignmentsMessage) {
			fetchData();
		}
	}

</script>

<div class="p-1">
	<div class="h-96 relative">
		<div class="p-4 bg-gray-50 rounded-lg shadow mb-4 ">
			<div class="flex flex-col sm:flex-row justify-between items-center mb-3">
				<label for="gradeViewSelect" class="text-md font-semibold text-gray-700 mb-2 sm:mb-0 sm:mr-3">View Distribution For:</label>
				<select id="gradeViewSelect" bind:value={selectedView} on:change={handleViewChange}
								class="p-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm w-full sm:w-auto"
								disabled={isLoading || showNoAssignmentsMessage}>
					<option value="overall">Overall Course Performance</option>
					{#if assignmentsList.length > 0}
						<optgroup label="Individual Assignments">
							{#each assignmentsList as assignment (assignment.assignment_id)}
								<option value={assignment.assignment_id.toString()}>
									{assignment.assignment_name}
								</option>
							{/each}
						</optgroup>
					{/if}
				</select>
			</div>
		</div>
		{#if isLoading}
			<div class="bg-white shadow-lg rounded-lg p-4 h-full flex items-center justify-center">
				<p class="text-gray-500 text-lg">Loading Grade Distribution...</p>
				<!-- Optional: Add a spinner SVG here -->
			</div>
		{:else if showNoAssignmentsMessage}
			<div class="bg-white shadow-lg rounded-lg p-6 h-full flex flex-col items-center justify-center text-center">
				<svg xmlns="http://www.w3.org/2000/svg" class="h-12 w-12 text-blue-400 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
					<path stroke-linecap="round" stroke-linejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
				</svg>
				<p class="text-xl font-semibold text-gray-700">No Assignments Yet</p>
				<p class="text-md text-gray-500 mt-1">No assignments have been created yet for this course.</p>
			</div>
		{:else}
			<div class="bg-white shadow-lg rounded-lg p-4 h-3/4">
				<canvas bind:this={chartCanvas}></canvas>
			</div>
		{/if}
	</div>
</div>