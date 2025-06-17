<script lang="ts">
	import { onDestroy, onMount } from 'svelte';
	import Chart from 'chart.js/auto';
	import type { Tables } from '$lib/database.types';

	export let allStudentGradesForCourse: Tables<'student_grades'>[] | null = null;
	export let assignments: Tables<'assignments'>[] | null = null; // Used to get assignment name
	export let selectedAssignmentId: string | null = null; // If null, show overall. If set, show for specific assignment.

	let gradeCanvas: HTMLCanvasElement;
	let gradeChart: Chart | null = null;

	const GRADE_STEPS = Array.from({ length: (6.0 - 1.0) / 0.25 + 1 }, (_, i) => 1.0 + i * 0.25);

	function destroyChart() {
		if (gradeChart) {
			gradeChart.destroy();
			gradeChart = null;
		}
	}

	function renderChart() {
		destroyChart();

		if (!gradeCanvas || !allStudentGradesForCourse) {
			if (gradeCanvas) {
				const ctx = gradeCanvas.getContext('2d');
				if (ctx) {
					ctx.clearRect(0, 0, gradeCanvas.width, gradeCanvas.height);
					ctx.font = '16px Arial';
					ctx.textAlign = 'center';
					ctx.fillText(
						'Loading data or no data available.',
						gradeCanvas.width / 2,
						gradeCanvas.height / 2
					);
				}
			}
			return;
		}

		let gradesToDisplay: Tables<'student_grades'>[] = [];
		let chartTitle = 'Overall Grade Distribution';

		if (selectedAssignmentId && assignments) {
			gradesToDisplay = allStudentGradesForCourse.filter(
				(g) => g.assignment_id === selectedAssignmentId && g.grade !== null
			);
			const selectedAssignment = assignments.find((a) => a.assignment_id === selectedAssignmentId);
			if (selectedAssignment) {
				chartTitle = `Grade Distribution for "${selectedAssignment.assignment_name}"`;
			} else {
				chartTitle = `Grade Distribution for Selected Assignment`;
			}
		} else {
			gradesToDisplay = allStudentGradesForCourse.filter((g) => g.grade !== null);
		}

		if (gradesToDisplay.length === 0) {
			const ctx = gradeCanvas.getContext('2d');
			if (ctx) {
				ctx.clearRect(0, 0, gradeCanvas.width, gradeCanvas.height);
				ctx.font = '16px Arial';
				ctx.textAlign = 'center';
				ctx.fillText(
					selectedAssignmentId
						? 'No grades available for this assignment.'
						: 'No grades available for distribution.',
					gradeCanvas.width / 2,
					gradeCanvas.height / 2
				);
			}
			return;
		}

		const gradeCounts = new Array(GRADE_STEPS.length).fill(0);

		gradesToDisplay.forEach((sg) => {
			if (sg.grade !== null) {
				// Round grade to 2 decimal places before finding index
				const gradeValue = parseFloat(sg.grade.toFixed(2));
				const index = GRADE_STEPS.findIndex((step) => Math.abs(step - gradeValue) < 0.001); // Check for floating point equality
				if (index !== -1) {
					gradeCounts[index]++;
				} else {
					console.warn(
						`Processed grade ${gradeValue} (original: ${sg.grade}) for student_grade_id ${sg.student_grade_id} did not map to a GRADE_STEP.`
					);
				}
			}
		});

		const gradeChartConfig: any = {
			type: 'bar',
			data: {
				labels: GRADE_STEPS.map((g) => g.toFixed(2)),
				datasets: [
					{
						label: 'Number of Students',
						data: gradeCounts,
						backgroundColor: 'rgba(54, 162, 235, 0.6)',
						borderColor: 'rgba(54, 162, 235, 1)',
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
						title: {
							display: true,
							text: 'Count'
						},
						ticks: {
							stepSize: 1 // Show only whole numbers on the y-axis
						}
					},
					x: {
						title: {
							display: true,
							text: 'Grade'
						},
						min: 1.0,
						max: 6.0,
						ticks: {
							stepSize: 0.25,
							callback: function (value: number | string) {
								// Ensure labels are formatted correctly if Chart.js doesn't use the exact label string for ticks
								const numericValue = typeof value === 'string' ? parseFloat(value) : value;
								const stepIndex = GRADE_STEPS.indexOf(numericValue);
								if (stepIndex !== -1) {
									return GRADE_STEPS[stepIndex].toFixed(2);
								}
								// Fallback for intermediate ticks if Chart.js generates them
								if (
									typeof numericValue === 'number' &&
									numericValue >= 1.0 &&
									numericValue <= 6.0
								) {
									return numericValue.toFixed(2);
								}
								return value;
							}
						}
					}
				},
				plugins: {
					legend: {
						display: true,
						position: 'top'
					},
					title: {
						display: true,
						text: chartTitle,
						font: {
							size: 18
						}
					}
				}
			}
		};
		gradeChart = new Chart(gradeCanvas, gradeChartConfig);
	}

	onMount(() => {
		// Initial render
		renderChart();
	});

	onDestroy(() => {
		destroyChart();
	});

	// $: triggers re-render when these props change
	$: if (allStudentGradesForCourse || selectedAssignmentId || assignments) {
		if (gradeCanvas) {
			// Ensure canvas is available before trying to re-render
			renderChart();
		}
	}
</script>

<div class="mt-2 grid grid-cols-1 gap-6">
	<div class="h-96 p-6">
		<canvas bind:this={gradeCanvas}></canvas>
	</div>
</div>
