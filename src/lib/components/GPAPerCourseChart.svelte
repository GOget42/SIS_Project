<script lang="ts">
	export let courses: Array<{ course_name: string; average_grade: number | null }> = [];
	export let title: string = 'Average GPA per Course';

	let maxGPA = 0;
	$: {
		if (courses && courses.length > 0) {
			const validGrades = courses.map(c => c.average_grade).filter(g => g !== null) as number[];
			if (validGrades.length > 0) {
				maxGPA = Math.max(...validGrades, 0);
			} else {
				maxGPA = 0;
			}
		} else {
			maxGPA = 0;
		}
	}

	function getBarWidth(grade: number | null): string {
		if (grade === null || maxGPA === 0) return '0%';
		// Assuming GPA is on a scale where maxGPA is the visual 100%
		// If your GPA scale is fixed (e.g., 1-5 or 1-4), you might want to use that fixed max for consistency.
		// For this example, we'll scale relative to the current max observed GPA.
		const percentage = (grade / maxGPA) * 100;
		return `${percentage}%`;
	}

	function getGradeColor(grade: number | null): string {
		if (grade === null) return 'bg-gray-300'; // Neutral color for N/A
		if (grade >= 4.0) return 'bg-green-500'; // Example: Adjust to your grading scale
		if (grade >= 3.0) return 'bg-blue-500';
		if (grade >= 2.0) return 'bg-yellow-500';
		return 'bg-red-500';
	}
</script>

<div class="bg-white shadow-md rounded-lg p-4 sm:p-6">
	<h3 class="text-lg font-medium text-gray-700 mb-4">{title}</h3>
	{#if courses && courses.length > 0}
		<div class="space-y-3">
			{#each courses as course (course.course_name)}
				<div class="grid grid-cols-3 items-center gap-2 text-sm">
					<div class="col-span-1 truncate text-gray-600" title={course.course_name}>{course.course_name}</div>
					<div class="col-span-2">
						<div class="flex items-center">
							<div class="w-full bg-gray-200 rounded-full h-4 overflow-hidden mr-2">
								<div
									class="h-4 rounded-full transition-all duration-500 ease-out {getGradeColor(course.average_grade)}"
									style:width={getBarWidth(course.average_grade)}
								></div>
							</div>
							<span class="font-semibold text-gray-700 w-10 text-right">
								{course.average_grade !== null ? course.average_grade.toFixed(2) : 'N/A'}
							</span>
						</div>
					</div>
				</div>
			{/each}
		</div>
	{:else}
		<p class="text-gray-500 text-sm">No GPA data available to display.</p>
	{/if}
</div>