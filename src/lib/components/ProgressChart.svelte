<script lang="ts">
	import { onDestroy, onMount } from 'svelte';
	import Chart from 'chart.js/auto';
	import type { TooltipItem } from 'chart.js';
	import { supabase } from '$lib/supabaseClient';
	import type { Tables } from '$lib/database.types';

	export let student_id: string | null = null;

	let progressCanvas: HTMLCanvasElement;
	let progressChart: Chart | null = null;
	let achievedEcts = 0;
	const totalEcts = 180;
	let isLoading = true;
	let errorMsg: string | null = null;

	let currentStudentId: string | null = null;

	interface CompletedCourseDetail {
		name: string;
		ects: number;
	}
	let completedCoursesDetails: CompletedCourseDetail[] = [];

	// Helper function to generate distinct colors for chart segments
	function getCourseColors(count: number): { backgrounds: string[]; borders: string[] } {
		const baseColors = [
			{ bg: 'rgba(75, 192, 192, 0.7)', border: 'rgba(75, 192, 192, 1)' }, // Teal
			{ bg: 'rgba(54, 162, 235, 0.7)', border: 'rgba(54, 162, 235, 1)' }, // Blue
			{ bg: 'rgba(255, 206, 86, 0.7)', border: 'rgba(255, 206, 86, 1)' }, // Yellow
			{ bg: 'rgba(153, 102, 255, 0.7)', border: 'rgba(153, 102, 255, 1)' }, // Purple
			{ bg: 'rgba(255, 159, 64, 0.7)', border: 'rgba(255, 159, 64, 1)' }, // Orange
			{ bg: 'rgba(255, 99, 132, 0.7)', border: 'rgba(255, 99, 132, 1)' }, // Pink
			{ bg: 'rgba(16, 185, 129, 0.7)', border: 'rgba(16, 185, 129, 1)' } // Emerald
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
			isLoading = false;
			achievedEcts = 0;
			completedCoursesDetails = [];
			errorMsg = 'Student ID not provided.';
			renderChart();
			return;
		}

		isLoading = true;
		errorMsg = null;
		currentStudentId = student_id;
		completedCoursesDetails = []; // Reset vor dem Fetch

		try {
			const studentIdNum = parseInt(student_id);
			if (isNaN(studentIdNum)) {
				throw new Error('Invalid Student ID format.');
			}

			const { data: enrollments, error: enrollmentsError } = await supabase
				.from('enrollments')
				.select('course_id')
				.eq('student_id', studentIdNum)
				.returns<Pick<Tables<'enrollments'>, 'course_id'>[]>();

			if (enrollmentsError) throw enrollmentsError;

			if (!enrollments || enrollments.length === 0) {
				achievedEcts = 0;
				isLoading = false;
				renderChart();
				return;
			}

			const courseIds = enrollments.map((e) => e.course_id).filter((id) => id !== null) as number[];

			if (courseIds.length === 0) {
				achievedEcts = 0;
				isLoading = false;
				renderChart();
				return;
			}

			const { data: coursesData, error: coursesError } = await supabase
				.from('courses')
				.select('course_name, ects, active') // course_name hinzugefügt
				.in('course_id', courseIds)
				.returns<Pick<Tables<'courses'>, 'course_name' | 'ects' | 'active'>[]>();

			if (coursesError) throw coursesError;

			if (coursesData) {
				const filteredCourses = coursesData.filter(
					(course) =>
						course.active === false && typeof course.ects === 'number' && course.course_name
				);

				completedCoursesDetails = filteredCourses.map((course) => ({
					name: course.course_name!,
					ects: course.ects!
				}));

				achievedEcts = completedCoursesDetails.reduce((sum, course) => sum + course.ects, 0);
			} else {
				achievedEcts = 0;
			}
		} catch (error: unknown) {
			console.error('Error fetching ECTS progress:', error);
			if (error instanceof Error) {
				errorMsg = `Failed to load data: ${error.message}`;
			} else {
				errorMsg = 'Failed to load data due to an unknown error.';
			}
			achievedEcts = 0;
			completedCoursesDetails = [];
		} finally {
			isLoading = false;
			renderChart();
		}
	}

	function destroyChart() {
		if (progressChart) {
			progressChart.destroy();
			progressChart = null;
		}
	}

	function renderChart() {
		destroyChart();

		if (!progressCanvas) {
			return;
		}
		const ctx = progressCanvas.getContext('2d');
		if (!ctx) {
			return;
		}

		ctx.clearRect(0, 0, progressCanvas.width, progressCanvas.height);

		if (isLoading) {
			ctx.font = '16px Arial';
			ctx.textAlign = 'center';
			ctx.fillStyle = '#6B7280'; // gray-500
			ctx.fillText('Loading ECTS Progress...', progressCanvas.width / 2, progressCanvas.height / 2);
			return;
		}

		if (errorMsg) {
			ctx.font = '16px Arial';
			ctx.textAlign = 'center';
			ctx.fillStyle = '#EF4444'; // red-500
			ctx.fillText(errorMsg, progressCanvas.width / 2, progressCanvas.height / 2);
			return;
		}

		const courseNames = completedCoursesDetails.map((c) => c.name);
		const courseEcts = completedCoursesDetails.map((c) => c.ects);
		const colors = getCourseColors(completedCoursesDetails.length);

		const remainingEcts = Math.max(0, totalEcts - achievedEcts);

		const chartLabels = [...courseNames];
		const chartData = [...courseEcts];
		const chartBackgroundColors = [...colors.backgrounds];
		const chartBorderColors = [...colors.borders];

		if (remainingEcts > 0 || achievedEcts === 0) {
			// Always display when progress is not 100% or is zero
			chartLabels.push('Remaining ECTS');
			chartData.push(remainingEcts);
			chartBackgroundColors.push('rgba(209, 213, 219, 0.7)'); // light-grey
			chartBorderColors.push('rgba(156, 163, 175, 1)'); // darker-grey for border
		}

		progressChart = new Chart(ctx, {
			type: 'doughnut',
			data: {
				labels: chartLabels,
				datasets: [
					{
						label: 'ECTS Points',
						data: chartData,
						backgroundColor: chartBackgroundColors,
						borderColor: chartBorderColors,
						borderWidth: 1
					}
				]
			},
			options: {
				responsive: true,
				maintainAspectRatio: false,
				cutout: '60%',
				plugins: {
					legend: {
						display: chartData.length > 0 && (achievedEcts > 0 || remainingEcts > 0), // Legende nur anzeigen, wenn es Daten gibt (erreicht oder verbleibend)
						position: 'bottom',
						labels: {
							padding: 15,
							font: {
								size: 12
							}
						}
					},
					title: {
						display: true,
						text: `Total Achieved ECTS: ${achievedEcts} / ${totalEcts}`,
						font: {
							size: 18,
							weight: 'bold'
						},
						padding: {
							top: 10,
							bottom: 20
						}
					},
					tooltip: {
						enabled: chartData.length > 0 && (achievedEcts > 0 || remainingEcts > 0),
						callbacks: {
							label: function (context: TooltipItem<'doughnut'>) {
								const labelIndex = context.dataIndex;
								const dataValue = context.parsed;

								if (labelIndex < completedCoursesDetails.length) {
									// Es ist ein abgeschlossener Kurs
									const course = completedCoursesDetails[labelIndex];
									return `${course.name}: ${course.ects} ECTS`;
								} else if (context.label === 'Remaining ECTS') {
									// Es sind die verbleibenden ECTS
									return `Remaining: ${dataValue} ECTS`;
								}
								return `ECTS: ${dataValue}`;
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

<div class="h-96 p-6">
	<canvas bind:this={progressCanvas}></canvas>
</div>
