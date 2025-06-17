<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import Chart from 'chart.js/auto';
	import type { TooltipItem } from 'chart.js';
	import { supabase } from '$lib/supabaseClient';

	export let student_id: string | null = null;

	let chartCanvas: HTMLCanvasElement;
	let distributionChart: Chart | null = null;
	let isLoading = true;
	let errorMsg: string | null = null;
	let currentStudentId: string | null = null;

	interface CourseGradeDetail {
		courseName: string;
		courseId: number;
		weightedAverageGrade: number | null;
		ects: number;
		error?: string; // For per-course processing issues
	}

	let courseGradeDetails: CourseGradeDetail[] = [];
	let overallWeightedGPA: number | null = null;
	let showNoEnrollmentsHtmlMessage = false; // Flag for specific HTML message

	// Helper function to generate distinct colors for chart bars
	function getBarColors(count: number): { backgrounds: string[]; borders: string[] } {
		const baseColors = [
			{ bg: 'rgba(75, 192, 192, 0.7)', border: 'rgba(75, 192, 192, 1)' }, // Teal
			{ bg: 'rgba(54, 162, 235, 0.7)', border: 'rgba(54, 162, 235, 1)' }, // Blue
			{ bg: 'rgba(255, 206, 86, 0.7)', border: 'rgba(255, 206, 86, 1)' }, // Yellow
			// Add more colors if needed
			{ bg: 'rgba(255, 99, 132, 0.7)', border: 'rgba(255, 99, 132, 1)' }, // Red
			{ bg: 'rgba(153, 102, 255, 0.7)', border: 'rgba(153, 102, 255, 1)' }, // Purple
			{ bg: 'rgba(255, 159, 64, 0.7)', border: 'rgba(255, 159, 64, 1)' } // Orange
		];
		const backgrounds: string[] = [];
		const borders: string[] = [];
		for (let i = 0; i < count; i++) {
			backgrounds.push(baseColors[i % baseColors.length].bg);
			borders.push(baseColors[i % baseColors.length].border);
		}
		return { backgrounds, borders };
	}

	async function fetchDataAndRenderChart() {
		if (!student_id) {
			isLoading = false; // Set isLoading false before renderChart
			errorMsg = 'Student ID not provided.';
			courseGradeDetails = [];
			overallWeightedGPA = null;
			showNoEnrollmentsHtmlMessage = false;
			renderChart();
			return;
		}

		isLoading = true;
		errorMsg = null;
		currentStudentId = student_id;
		courseGradeDetails = [];
		overallWeightedGPA = null;
		showNoEnrollmentsHtmlMessage = false; // Reset flag

		try {
			const studentIdNum = parseInt(student_id);
			if (isNaN(studentIdNum)) {
				throw new Error('Invalid Student ID format.');
			}

			// 1. Fetch enrollments with course details
			const { data: rawEnrollments, error: enrollmentsError } = await supabase
				.from('enrollments')
				.select(
					`
          enrollment_id,
          courses (
            course_id,
            course_name,
            ects,
            active
          )
        `
				)
				.eq('student_id', studentIdNum);

			if (enrollmentsError) {
				throw new Error(`Enrollment data fetch failed: ${enrollmentsError.message}`);
			}

			if (!rawEnrollments || rawEnrollments.length === 0) {
				showNoEnrollmentsHtmlMessage = true; // Set flag for HTML message
				errorMsg = null; // Clear any generic error for canvas
				// State (courseGradeDetails, overallWeightedGPA) is already reset
				return; // Let finally block handle isLoading and renderChart
			}

			const completedEnrollments = rawEnrollments
				.filter((e) => e.courses && e.courses.active === false && e.courses.course_id != null)
				.map((e) => ({
					enrollment_id: e.enrollment_id,
					// eslint-disable-next-line @typescript-eslint/no-non-null-assertion
					course: e.courses! // Asserting courses is not null due to filter
				}));

			if (completedEnrollments.length === 0 && !showNoEnrollmentsHtmlMessage) {
				showNoEnrollmentsHtmlMessage = true;
				errorMsg = null;
				// State (courseGradeDetails, overallWeightedGPA) is already reset
				return; // Let finally block handle isLoading and renderChart
			}

			// 2. Fetch assignments and grades for each completed course
			const courseProcessingPromises = completedEnrollments.map(async (enrollment) => {
				// eslint-disable-next-line @typescript-eslint/no-non-null-assertion
				const { course_id, course_name, ects } = enrollment.course!;
				const enrollmentId = enrollment.enrollment_id;

				const { data: assignments, error: assignmentsError } = await supabase
					.from('assignments')
					.select('assignment_id, weight')
					.eq('course_id', course_id);

				if (assignmentsError) {
					console.error(
						`DEBUG: Failed to fetch assignments for course ${course_name} (ID: ${course_id}):`,
						assignmentsError.message
					);
					return {
						courseName: course_name,
						courseId: course_id,
						weightedAverageGrade: null,
						ects: ects ?? 0,
						error: `Assignments fetch failed: ${assignmentsError.message}`
					};
				}
				if (!assignments || assignments.length === 0) {
					return {
						courseName: course_name,
						courseId: course_id,
						weightedAverageGrade: null,
						ects: ects ?? 0,
						error: 'No assignments found for this course.'
					};
				}

				const assignmentIds = assignments.map((a) => a.assignment_id);
				if (assignmentIds.length === 0) {
					return {
						courseName: course_name,
						courseId: course_id,
						weightedAverageGrade: null,
						ects: ects ?? 0,
						error: 'No assignment IDs found for querying grades.'
					};
				}

				const { data: studentGrades, error: gradesError } = await supabase
					.from('student_grades')
					.select('assignment_id, grade')
					.eq('enrollment_id', enrollmentId)
					.in('assignment_id', assignmentIds);

				if (gradesError) {
					console.error(
						`DEBUG: Failed to fetch grades for course ${course_name} (ID: ${course_id}):`,
						gradesError.message
					);
					return {
						courseName: course_name,
						courseId: course_id,
						weightedAverageGrade: null,
						ects: ects ?? 0,
						error: `Grades fetch failed: ${gradesError.message}`
					};
				}

				let courseWeightedGradeSum = 0;
				let courseTotalWeight = 0;
				let gradedAssignmentsCount = 0;

				for (const assignment of assignments) {
					const studentGradeEntry = studentGrades?.find(
						(sg) => sg.assignment_id === assignment.assignment_id
					);
					if (
						studentGradeEntry &&
						typeof studentGradeEntry.grade === 'number' &&
						typeof assignment.weight === 'number'
					) {
						courseWeightedGradeSum += studentGradeEntry.grade * assignment.weight;
						courseTotalWeight += assignment.weight;
						gradedAssignmentsCount++;
					}
				}

				if (courseTotalWeight > 0 && gradedAssignmentsCount > 0) {
					const weightedAverage = courseWeightedGradeSum / courseTotalWeight;
					return {
						courseName: course_name,
						courseId: course_id,
						weightedAverageGrade: weightedAverage,
						ects: ects ?? 0
					};
				} else {
					return {
						courseName: course_name,
						courseId: course_id,
						weightedAverageGrade: null,
						ects: ects ?? 0,
						error: 'No valid grades or weights to calculate average.'
					};
				}
			});

			courseGradeDetails = await Promise.all(courseProcessingPromises);

			const validCoursesForGpa = courseGradeDetails.filter(
				(c) =>
					typeof c.weightedAverageGrade === 'number' && typeof c.ects === 'number' && c.ects > 0
			);

			if (validCoursesForGpa.length === 0) {
				overallWeightedGPA = null;
				if (
					!errorMsg &&
					completedEnrollments.length > 0 &&
					courseGradeDetails.some((c) => c.error)
				) {
					// If there were completed courses, but none yielded a GPA due to errors in processing
					// errorMsg = "Could not calculate GPA for any course."; // This might be too generic if some courses are fine but just have no grade
				}
			} else {
				const totalWeightedGradeSum = validCoursesForGpa.reduce(
					(sum, course) => sum + (course.weightedAverageGrade as number) * course.ects,
					0
				);
				const totalEctsForGpa = validCoursesForGpa.reduce((sum, course) => sum + course.ects, 0);
				overallWeightedGPA = totalEctsForGpa > 0 ? totalWeightedGradeSum / totalEctsForGpa : null;
			}

			if (
				courseGradeDetails.filter((cgd) => cgd.weightedAverageGrade !== null).length === 0 &&
				!errorMsg &&
				completedEnrollments.length > 0 &&
				!showNoEnrollmentsHtmlMessage
			) {
				errorMsg = 'No grade data could be calculated for display in chart.';
			}
		} catch (e: unknown) {
			console.error('DEBUG: Error fetching or processing grade distribution data:', e);
			if (e instanceof Error) {
				errorMsg = `Failed to load grade distribution: ${e.message}`;
			} else {
				errorMsg = 'An unknown error occurred while loading grade distribution.';
			}
			courseGradeDetails = []; // Ensure clean state on error
			overallWeightedGPA = null;
		} finally {
			isLoading = false;
			renderChart();
		}
	}

	function destroyChart() {
		if (distributionChart) {
			distributionChart.destroy();
			distributionChart = null;
		}
	}

	function getChartTitle(): string {
		let title = 'Course Grade Distribution';
		if (overallWeightedGPA !== null) {
			title += ` (Overall ECTS-Weighted GPA: ${overallWeightedGPA.toFixed(2)})`;
		} else if (
			!isLoading &&
			(courseGradeDetails.length > 0 || showNoEnrollmentsHtmlMessage || errorMsg)
		) {
			title += ` (Overall GPA: N/A)`;
		}
		return title;
	}

	function renderChart() {
		destroyChart();

		if (!chartCanvas) return;
		const ctx = chartCanvas.getContext('2d');
		if (!ctx) return;

		ctx.clearRect(0, 0, chartCanvas.width, chartCanvas.height);

		if (isLoading) {
			ctx.font = '16px Arial';
			ctx.textAlign = 'center';
			ctx.fillStyle = '#6B7280'; // gray-500
			ctx.fillText('Loading Grade Distribution...', chartCanvas.width / 2, chartCanvas.height / 2);
			return;
		}

		// Specific HTML message handles "no enrollments", so errorMsg will be null in that case.
		// Other errors will be caught here.
		if (errorMsg) {
			ctx.font = '16px Arial';
			ctx.textAlign = 'center';
			ctx.fillStyle = '#EF4444'; // red-500
			ctx.fillText(errorMsg, chartCanvas.width / 2, chartCanvas.height / 2);
			return;
		}

		// If showNoEnrollmentsHtmlMessage is true, this block will also be hit as chartableCourses will be empty.
		// The canvas will show a generic "no data" message.
		const chartableCourses = courseGradeDetails.filter(
			(c) => typeof c.weightedAverageGrade === 'number'
		);

		if (chartableCourses.length === 0) {
			ctx.font = '16px Arial';
			ctx.textAlign = 'center';
			ctx.fillStyle = '#6B7280';
			if (courseGradeDetails.length > 0 && !showNoEnrollmentsHtmlMessage) {
				message = 'No courses with calculable grades to display.';
			}
			ctx.fillText(message, chartCanvas.width / 2, chartCanvas.height / 2);
			return;
		}

		const courseNames = chartableCourses.map((c) => c.courseName);
		const courseGrades = chartableCourses.map((c) => c.weightedAverageGrade as number);
		const colors = getBarColors(chartableCourses.length);

		distributionChart = new Chart(ctx, {
			type: 'bar',
			data: {
				labels: courseNames,
				datasets: [
					{
						label: 'Weighted Average Grade',
						data: courseGrades,
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
					y: {
						beginAtZero: true,
						suggestedMax: 6, // Assuming a grading scale (e.g., 1-6 or 0-100, adjust as needed)
						title: {
							display: true,
							text: 'Grade'
						}
					},
					x: {
						title: {
							display: true,
							text: 'Courses'
						}
					}
				},
				plugins: {
					legend: {
						display: courseNames.length > 1, // Show legend if multiple courses
						position: 'top'
					},
					title: {
						display: true,
						text: getChartTitle(),
						font: {
							size: 16,
							weight: 'bold'
						},
						padding: { top: 10, bottom: 20 }
					},
					tooltip: {
						callbacks: {
							label: function (context: TooltipItem<'bar'>) {
								let label = context.dataset.label || '';
								if (label) {
									label += ': ';
								}
								if (context.parsed.y !== null) {
									label += context.parsed.y.toFixed(2);
								}
								const detail = courseGradeDetails.find((c) => c.courseName === context.label);
								if (detail && detail.ects) {
									label += ` (ECTS: ${detail.ects})`;
								}
								if (detail && detail.error) {
									label += ` (Note: ${detail.error})`;
								}
								return label;
							}
						}
					}
				}
			}
		});
	}

	onMount(() => {
		fetchDataAndRenderChart();
	});

	onDestroy(() => {
		destroyChart();
	});

	$: if (student_id !== currentStudentId && typeof student_id === 'string') {
		fetchDataAndRenderChart();
	}
</script>

<div class="relative h-96 p-6">
	{#if showNoEnrollmentsHtmlMessage}
		<div class="py-2 text-center">
			<p class="text-gray-600">No courses have been completed yet.</p>
		</div>
	{:else}
		<canvas bind:this={chartCanvas}></canvas>
	{/if}
</div>
