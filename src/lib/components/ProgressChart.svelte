<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
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
	function getCourseColors(count: number): { backgrounds: string[], borders: string[] } {
		const baseColors = [
			{ bg: 'rgba(75, 192, 192, 0.7)', border: 'rgba(75, 192, 192, 1)' }, // Teal
			{ bg: 'rgba(54, 162, 235, 0.7)', border: 'rgba(54, 162, 235, 1)' },  // Blue
			{ bg: 'rgba(255, 206, 86, 0.7)', border: 'rgba(255, 206, 86, 1)' }, // Yellow
			{ bg: 'rgba(153, 102, 255, 0.7)', border: 'rgba(153, 102, 255, 1)' },// Purple
			{ bg: 'rgba(255, 159, 64, 0.7)', border: 'rgba(255, 159, 64, 1)' }, // Orange
			{ bg: 'rgba(255, 99, 132, 0.7)', border: 'rgba(255, 99, 132, 1)' },   // Pink
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

			const courseIds = enrollments.map(e => e.course_id).filter(id => id !== null) as number[];

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
				const filteredCourses = coursesData
					.filter(course => course.active === false && typeof course.ects === 'number' && course.course_name);

				completedCoursesDetails = filteredCourses.map(course => ({
					name: course.course_name!, // course_name ist als non-null im Schema definiert
					ects: course.ects          // ects ist als non-null im Schema definiert
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

		// Die Meldung "No completed courses to display." wurde entfernt.
		// Das Diagramm wird auch gerendert, wenn completedCoursesDetails.length === 0 ist.
		// In diesem Fall werden keine Segmente im Doughnut angezeigt, aber der Titel bleibt.

		const courseNames = completedCoursesDetails.map(c => c.name);
		const courseEcts = completedCoursesDetails.map(c => c.ects);
		const colors = getCourseColors(completedCoursesDetails.length);

		progressChart = new Chart(ctx, {
			type: 'doughnut',
			data: {
				labels: courseNames,
				datasets: [{
					label: 'ECTS per Course',
					data: courseEcts,
					backgroundColor: colors.backgrounds,
					borderColor: colors.borders,
					borderWidth: 1
				}]
			},
			options: {
				responsive: true,
				maintainAspectRatio: false,
				cutout: '60%',
				plugins: {
					legend: {
						// Legende nur anzeigen, wenn es Daten gibt
						display: completedCoursesDetails.length > 0,
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
						// Tooltips nur aktivieren, wenn es Daten gibt
						enabled: completedCoursesDetails.length > 0,
						callbacks: {
							label: function(context: TooltipItem<'doughnut'>) {
								const courseIndex = context.dataIndex;
								const course = completedCoursesDetails[courseIndex];
								if (course) {
									return `${course.name}: ${course.ects} ECTS (GPA: Placeholder)`;
								}
								// Fallback, sollte normalerweise nicht erreicht werden, wenn completedCoursesDetails korrekt ist
								const value = context.parsed;
								return `ECTS: ${value} (GPA: Placeholder)`;
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

<div class="p-6 h-96">
	<canvas bind:this={progressCanvas}></canvas>
</div>

<!-- Previous version:
<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import Chart from 'chart.js/auto';
	import { supabase } from '$lib/supabaseClient'; // Stellen Sie sicher, dass dieser Pfad zu Ihrer Supabase-Client-Initialisierung korrekt ist.
	import type { Tables } from '$lib/database.types';

	export let student_id: string | null = null;

	let progressCanvas: HTMLCanvasElement;
	let progressChart: Chart | null = null;
	let achievedEcts = 0;
	const totalEcts = 180;
	let isLoading = true;
	let errorMsg: string | null = null;

	let currentStudentId: string | null = null;

	async function fetchDataAndRenderChart() {
		if (!student_id) {
			isLoading = false;
			achievedEcts = 0;
			errorMsg = 'Student ID not provided.';
			renderChart();
			return;
		}

		isLoading = true;
		errorMsg = null;
		currentStudentId = student_id; // Track current ID for reactive updates

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

			const courseIds = enrollments.map(e => e.course_id).filter(id => id !== null) as number[];

            if (courseIds.length === 0) {
                achievedEcts = 0;
                isLoading = false;
                renderChart();
                return;
            }

			const { data: coursesData, error: coursesError } = await supabase
				.from('courses')
				.select('ects, active')
				.in('course_id', courseIds)
				.returns<Pick<Tables<'courses'>, 'ects' | 'active'>[]>();

			if (coursesError) throw coursesError;

			if (coursesData) {
				achievedEcts = coursesData
					.filter(course => course.active === false && typeof course.ects === 'number')
					.reduce((sum, course) => sum + (course.ects || 0), 0);
			} else {
				achievedEcts = 0;
			}
		} catch (error: any) {
			console.error('Error fetching ECTS progress:', error);
			errorMsg = `Failed to load data: ${error.message}`;
			achievedEcts = 0; // Reset ECTS on error
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

		const remainingEcts = Math.max(0, totalEcts - achievedEcts);

		progressChart = new Chart(ctx, {
			type: 'doughnut',
			data: {
				labels: ['Achieved ECTS', 'Remaining ECTS'],
				datasets: [{
					label: 'ECTS Points',
					data: [achievedEcts, remainingEcts],
					backgroundColor: [
						'rgba(16, 185, 129, 0.7)', // emerald-500
						'rgba(209, 213, 219, 0.7)'  // gray-300
					],
					borderColor: [
						'rgba(16, 185, 129, 1)',
						'rgba(209, 213, 219, 1)'
					],
					borderWidth: 1
				}]
			},
			options: {
				responsive: true,
				maintainAspectRatio: false,
				cutout: '60%',
				plugins: {
					legend: {
						position: 'bottom',
						labels: {
							padding: 20,
							font: {
								size: 14
							}
						}
					},
					title: {
						display: true,
						text: `ECTS Progress: ${achievedEcts} / ${totalEcts}`,
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
						callbacks: {
							label: function(context) {
								let label = context.dataset.label || '';
								if (label) {
									label += ': ';
								}
								if (context.parsed !== null) {
									label += context.parsed + ' ECTS';
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

<div class="p-6 h-96">
	<canvas bind:this={progressCanvas}></canvas>
</div>
-->