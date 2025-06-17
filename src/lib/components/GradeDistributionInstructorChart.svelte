<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import Chart from 'chart.js/auto';
	import type { TooltipItem } from 'chart.js';
	import { supabase } from '$lib/supabaseClient';

	export let instructor_id: string | null = null;

	let chartCanvas: HTMLCanvasElement | undefined;
	let distributionChart: Chart | null = null;

	let isLoading = true;
	let errorMsg: string | null = null;
	let coursesList: { course_id: string; course_name: string }[] = [];
	let selectedView: string = 'overallInstructor'; // 'overallInstructor' or a course_id as string

	let chartDisplayData: { labels: string[]; data: number[] } | null = null;
	let averageGradeDisplay: string | null = null;

	let currentInstructorIdInternal: string | null = null;
	let showNoCoursesMessage = false;

	function roundToNearestQuarter(value: number): number {
		return Math.round(value * 4) / 4;
	}

	function getBarColors(count: number): { backgrounds: string[]; borders: string[] } {
		const baseColors = [
			{ bg: 'rgba(75, 192, 192, 0.7)', border: 'rgba(75, 192, 192, 1)' },
			{ bg: 'rgba(54, 162, 235, 0.7)', border: 'rgba(54, 162, 235, 1)' },
			{ bg: 'rgba(255, 206, 86, 0.7)', border: 'rgba(255, 206, 86, 1)' },
			{ bg: 'rgba(255, 99, 132, 0.7)', border: 'rgba(255, 99, 132, 1)' },
			{ bg: 'rgba(153, 102, 255, 0.7)', border: 'rgba(153, 102, 255, 1)' },
			{ bg: 'rgba(255, 159, 64, 0.7)', border: 'rgba(255, 159, 64, 1)' }
		];
		const backgrounds: string[] = [];
		const borders: string[] = [];
		for (let i = 0; i < count; i++) {
			backgrounds.push(baseColors[i % baseColors.length].bg);
			borders.push(baseColors[i % baseColors.length].border);
		}
		return { backgrounds, borders };
	}

	async function fetchSingleCourseGradeDistribution(courseIdNum: number) {
		chartDisplayData = null;
		averageGradeDisplay = null;

		const { data: courseAssignmentsWithWeight, error: assignmentsError } = await supabase
			.from('assignments')
			.select('assignment_id, weight')
			.eq('course_id', courseIdNum);

		if (assignmentsError || !courseAssignmentsWithWeight) {
			throw new Error(
				`Failed to fetch assignment weights for course ${courseIdNum}: ${assignmentsError?.message}`
			);
		}

		const usableAssignments = courseAssignmentsWithWeight.filter(
			(a) => typeof a.weight === 'number' && a.weight > 0 && a.assignment_id
		);

		if (usableAssignments.length === 0) {
			chartDisplayData = { labels: [], data: [] };
			averageGradeDisplay = 'N/A (No weighted assignments)';
			return;
		}

		const { data: enrollments, error: enrollmentsError } = await supabase
			.from('enrollments')
			.select('enrollment_id')
			.eq('course_id', courseIdNum);

		if (enrollmentsError)
			throw new Error(
				`Failed to fetch enrollments for course ${courseIdNum}: ${enrollmentsError.message}`
			);
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
				.in(
					'assignment_id',
					usableAssignments.map((a) => a.assignment_id)
				);

			if (gradesError) {
				console.warn(
					`Could not fetch grades for enrollment ${enrollment.enrollment_id} in course ${courseIdNum}: ${gradesError.message}`
				);
				continue;
			}

			let totalWeightedGrade = 0;
			let totalWeight = 0;
			if (studentGrades && studentGrades.length > 0) {
				for (const ca of usableAssignments) {
					const gradeEntry = studentGrades.find((sg) => sg.assignment_id === ca.assignment_id);
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
			errorMsg =
				'No final student grades could be calculated for this course with the available data.';
			chartDisplayData = { labels: [], data: [] };
			averageGradeDisplay = 'N/A';
			return;
		}

		const gradeCounts: { [key: string]: number } = {};
		studentFinalGrades.forEach((grade) => {
			const roundedGrade = roundToNearestQuarter(grade);
			const bin = roundedGrade.toFixed(2);
			gradeCounts[bin] = (gradeCounts[bin] || 0) + 1;
		});

		const sortedBins = Object.keys(gradeCounts).sort((a, b) => parseFloat(a) - parseFloat(b));
		chartDisplayData = {
			labels: sortedBins,
			data: sortedBins.map((bin) => gradeCounts[bin])
		};
		const sumOfGrades = studentFinalGrades.reduce((acc, grade) => acc + grade, 0);
		averageGradeDisplay = (sumOfGrades / studentFinalGrades.length).toFixed(2);
	}

	async function fetchOverallInstructorDistribution(
		instructorIdNum: number,
		currentCourses: { course_id: string; course_name: string }[]
	) {
		chartDisplayData = null;
		averageGradeDisplay = null;
		let allStudentFinalGradesAcrossCourses: number[] = [];

		for (const course of currentCourses) {
			const courseIdNumForLoop = parseInt(course.course_id);
			if (isNaN(courseIdNumForLoop)) continue;

			const { data: courseAssignmentsWithWeight, error: assignmentsError } = await supabase
				.from('assignments')
				.select('assignment_id, weight')
				.eq('course_id', courseIdNumForLoop);

			if (assignmentsError || !courseAssignmentsWithWeight) {
				console.warn(
					`Failed to fetch assignment weights for course ${course.course_name}: ${assignmentsError?.message}`
				);
				continue;
			}
			const usableAssignments = courseAssignmentsWithWeight.filter(
				(a) => typeof a.weight === 'number' && a.weight > 0 && a.assignment_id
			);
			if (usableAssignments.length === 0) continue;

			const { data: enrollments, error: enrollmentsError } = await supabase
				.from('enrollments')
				.select('enrollment_id')
				.eq('course_id', courseIdNumForLoop);

			if (enrollmentsError || !enrollments || enrollments.length === 0) {
				console.warn(
					`Failed to fetch enrollments or no enrollments for course ${course.course_name}: ${enrollmentsError?.message}`
				);
				continue;
			}

			for (const enrollment of enrollments) {
				const { data: studentGrades, error: gradesError } = await supabase
					.from('student_grades')
					.select('assignment_id, grade')
					.eq('enrollment_id', enrollment.enrollment_id)
					.in(
						'assignment_id',
						usableAssignments.map((a) => a.assignment_id)
					);

				if (gradesError) {
					console.warn(
						`Could not fetch grades for enrollment ${enrollment.enrollment_id} in course ${course.course_name}: ${gradesError.message}`
					);
					continue;
				}

				let totalWeightedGrade = 0;
				let totalWeight = 0;
				if (studentGrades && studentGrades.length > 0) {
					for (const ca of usableAssignments) {
						const gradeEntry = studentGrades.find((sg) => sg.assignment_id === ca.assignment_id);
						if (gradeEntry && typeof gradeEntry.grade === 'number' && ca.weight && ca.weight > 0) {
							totalWeightedGrade += gradeEntry.grade * ca.weight;
							totalWeight += ca.weight;
						}
					}
				}
				if (totalWeight > 0) {
					allStudentFinalGradesAcrossCourses.push(totalWeightedGrade / totalWeight);
				}
			}
		}

		if (allStudentFinalGradesAcrossCourses.length === 0) {
			errorMsg =
				'No final student grades could be calculated across all courses with the available data.';
			chartDisplayData = { labels: [], data: [] };
			averageGradeDisplay = 'N/A';
			return;
		}

		const gradeCounts: { [key: string]: number } = {};
		allStudentFinalGradesAcrossCourses.forEach((grade) => {
			const roundedGrade = roundToNearestQuarter(grade);
			const bin = roundedGrade.toFixed(2);
			gradeCounts[bin] = (gradeCounts[bin] || 0) + 1;
		});

		const sortedBins = Object.keys(gradeCounts).sort((a, b) => parseFloat(a) - parseFloat(b));
		chartDisplayData = {
			labels: sortedBins,
			data: sortedBins.map((bin) => gradeCounts[bin])
		};
		const sumOfGrades = allStudentFinalGradesAcrossCourses.reduce((acc, grade) => acc + grade, 0);
		averageGradeDisplay = (sumOfGrades / allStudentFinalGradesAcrossCourses.length).toFixed(2);
	}

	async function fetchData() {
		if (!currentInstructorIdInternal) {
			isLoading = false;
			errorMsg = 'Instructor ID not available.';
			return;
		}

		isLoading = true;
		errorMsg = null;
		showNoCoursesMessage = false;
		chartDisplayData = null;
		averageGradeDisplay = null;

		const instructorIdNum = parseInt(currentInstructorIdInternal);
		if (isNaN(instructorIdNum)) {
			errorMsg = 'Invalid Instructor ID format.';
			isLoading = false;
			return;
		}

		try {
			// Fetch courses for the instructor if coursesList is empty (e.g., on initial load or instructor change)
			if (coursesList.length === 0) {
				const { data: fetchedCourses, error: coursesError } = await supabase
					.from('courses')
					.select('course_id, course_name')
					.eq('instructor_id', instructorIdNum) // Ensure this column name 'instructor_id' is correct for your 'courses' table
					.order('course_name');
				if (coursesError) throw new Error(`Failed to fetch courses: ${coursesError.message}`);
				coursesList = fetchedCourses || [];
			}

			if (coursesList.length === 0) {
				showNoCoursesMessage = true;
				chartDisplayData = { labels: [], data: [] };
				averageGradeDisplay = 'N/A';
			} else {
				showNoCoursesMessage = false;
				if (selectedView === 'overallInstructor') {
					await fetchOverallInstructorDistribution(instructorIdNum, coursesList);
				} else {
					// selectedView is a course_id (string)
					const courseIdToFetch = parseInt(selectedView);
					if (isNaN(courseIdToFetch)) throw new Error('Invalid course selected.');
					await fetchSingleCourseGradeDistribution(courseIdToFetch);
				}
			}
		} catch (e: any) {
			console.error('Error fetching instructor grade data:', e);
			errorMsg = e.message || 'An unknown error occurred.';
			chartDisplayData = null;
			averageGradeDisplay = null;
			showNoCoursesMessage = false; // Don't show "no courses" if it's a general fetch error
		} finally {
			isLoading = false;
		}
	}

	function getChartTitle(): string {
		if (isLoading && !showNoCoursesMessage) return 'Loading Grade Distribution...';
		if (showNoCoursesMessage) return 'Instructor Grade Distribution';
		if (errorMsg && !isLoading) return 'Instructor Grade Distribution';

		let title = 'Instructor Grade Distribution';
		if (selectedView === 'overallInstructor') {
			title = 'Overall Instructor Performance';
		} else {
			const selectedCourse = coursesList.find((c) => c.course_id === selectedView);
			if (selectedCourse) {
				title = `${selectedCourse.course_name} - Grade Distribution`;
			} else {
				title = 'Course Grade Distribution'; // Fallback if course not found in list
			}
		}

		if (
			averageGradeDisplay &&
			averageGradeDisplay !== 'N/A' &&
			!isLoading &&
			!errorMsg &&
			chartDisplayData &&
			chartDisplayData.labels.length > 0
		) {
			title += ` (Avg: ${averageGradeDisplay})`;
		} else if (
			averageGradeDisplay === 'N/A' &&
			!isLoading &&
			!errorMsg &&
			chartDisplayData &&
			chartDisplayData.labels.length > 0
		) {
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
		if (!chartCanvas) return;
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
				datasets: [
					{
						label: 'Number of Students/Grades',
						data: chartDisplayData.data,
						backgroundColor: colors.backgrounds,
						borderColor: colors.borders,
						borderWidth: 1
					}
				]
			},
			options: {
				responsive: true,
				maintainAspectRatio: false,
				scales: {
					y: { beginAtZero: true, title: { display: true, text: 'Count' }, ticks: { stepSize: 1 } },
					x: { title: { display: true, text: 'Grade Bins (Rounded to nearest 0.25)' } }
				},
				plugins: {
					legend: { display: false },
					title: {
						display: true,
						text: getChartTitle(),
						font: { size: 16, weight: 'bold' },
						padding: { top: 10, bottom: 20 }
					},
					tooltip: {
						callbacks: {
							label: function (context: TooltipItem<'bar'>) {
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
		if (instructor_id) {
			currentInstructorIdInternal = instructor_id;
			fetchData();
		} else {
			isLoading = false;
			errorMsg = 'Instructor ID not provided on mount.';
		}
	});

	onDestroy(() => {
		destroyChart();
	});

	$: if (instructor_id && instructor_id !== currentInstructorIdInternal) {
		currentInstructorIdInternal = instructor_id;
		selectedView = 'overallInstructor';
		coursesList = []; // Clear courses to force re-fetch for new instructor
		chartDisplayData = null;
		averageGradeDisplay = null;
		showNoCoursesMessage = false;
		errorMsg = null;
		fetchData();
	}

	function handleViewChange() {
		errorMsg = null; // Clear previous error messages on view change
		// chartDisplayData and averageGradeDisplay are reset in fetchData
		if (currentInstructorIdInternal) {
			// Ensure instructor ID is set
			fetchData();
		}
	}

	$: {
		if (
			chartCanvas &&
			!isLoading &&
			!showNoCoursesMessage &&
			!errorMsg &&
			chartDisplayData &&
			chartDisplayData.labels.length > 0
		) {
			renderChart();
		} else if (distributionChart) {
			// If chart exists but shouldn't be shown, destroy it and clear canvas
			destroyChart();
			if (chartCanvas) {
				const ctx = chartCanvas.getContext('2d');
				if (ctx) ctx.clearRect(0, 0, chartCanvas.width, chartCanvas.height);
			}
		}
	}
</script>

<div class="h-full p-1">
	<div class="flex h-96 flex-col overflow-hidden rounded-lg bg-white shadow-lg">
		<div class="flex-shrink-0 border-b border-gray-200 bg-gray-50 p-4">
			<div class="flex flex-col items-center justify-between sm:flex-row">
				<label
					for="instructorGradeViewSelect"
					class="text-md mb-2 font-semibold text-gray-700 sm:mr-3 sm:mb-0"
					>View Distribution For:</label
				>
				<select
					id="instructorGradeViewSelect"
					bind:value={selectedView}
					on:change={handleViewChange}
					class="w-full rounded-md border border-gray-300 p-2 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:w-auto sm:text-sm"
					disabled={isLoading ||
						(showNoCoursesMessage && coursesList.length === 0) ||
						(coursesList.length === 0 && !showNoCoursesMessage && !isLoading && !errorMsg)}
				>
					<option value="overallInstructor">Overall Instructor Performance</option>
					{#if coursesList.length > 0}
						<optgroup label="Individual Courses">
							{#each coursesList as course (course.course_id)}
								<option value={course.course_id}>
									{course.course_name}
								</option>
							{/each}
						</optgroup>
					{/if}
				</select>
			</div>
		</div>

		<div class="relative flex-grow p-4">
			{#if isLoading}
				<div class="absolute inset-0 flex items-center justify-center">
					<p class="text-lg text-gray-500">Loading Grade Distribution...</p>
				</div>
			{:else if errorMsg}
				<div class="absolute inset-0 flex items-center justify-center p-2 text-center">
					<p class="text-md text-red-500">{errorMsg}</p>
				</div>
			{:else if showNoCoursesMessage}
				<div class="absolute inset-0 flex flex-col items-center justify-center p-2 text-center">
					<svg
						xmlns="http://www.w3.org/2000/svg"
						class="mb-2 h-10 w-10 text-blue-400"
						fill="none"
						viewBox="0 0 24 24"
						stroke="currentColor"
						stroke-width="2"
					>
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
						/>
					</svg>
					<p class="text-lg font-semibold text-gray-700">No Courses Found</p>
					<p class="mt-1 text-sm text-gray-500">
						This instructor is not associated with any courses, or no courses have grade data.
					</p>
				</div>
			{:else if !chartDisplayData || chartDisplayData.labels.length === 0}
				<div class="absolute inset-0 flex items-center justify-center p-2 text-center">
					<p class="text-md text-gray-500">No grade data available for this view.</p>
				</div>
			{:else}
				<canvas bind:this={chartCanvas}></canvas>
			{/if}
		</div>
	</div>
</div>
