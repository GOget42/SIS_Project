<script lang="ts">
	export let courses: Array<{ course_name: string; student_count: number }> = [];
	export let title: string = 'Students per Course';

	let maxStudents = 0;
	$: {
		if (courses && courses.length > 0) {
			maxStudents = Math.max(...courses.map((c) => c.student_count), 0);
		} else {
			maxStudents = 0;
		}
	}

	function getBarWidth(studentCount: number): string {
		if (maxStudents === 0) return '0%';
		const percentage = (studentCount / maxStudents) * 100;
		return `${percentage}%`;
	}
</script>

<div class="rounded-lg bg-white p-4 shadow-md sm:p-6">
	<h3 class="mb-4 text-lg font-medium text-gray-700">{title}</h3>
	{#if courses && courses.length > 0}
		<div class="space-y-3">
			{#each courses as course (course.course_name)}
				<div class="grid grid-cols-3 items-center gap-2 text-sm">
					<div class="col-span-1 truncate text-gray-600" title={course.course_name}>
						{course.course_name}
					</div>
					<div class="col-span-2">
						<div class="flex items-center">
							<div class="mr-2 h-4 w-full overflow-hidden rounded-full bg-gray-200">
								<div
									class="h-4 rounded-full bg-blue-500 transition-all duration-500 ease-out"
									style:width={getBarWidth(course.student_count)}
								></div>
							</div>
							<span class="w-8 text-right font-semibold text-gray-700">{course.student_count}</span>
						</div>
					</div>
				</div>
			{/each}
		</div>
	{:else}
		<p class="text-sm text-gray-500">No course data available to display.</p>
	{/if}
</div>
