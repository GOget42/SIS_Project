<script lang="ts">
	import { onMount } from 'svelte';
	import { supabase } from '$lib/supabaseClient';

	type CourseStatistic = {
		id: number;
		name: string;
		studentCount: number;
		averageGpa: number | null;
		ects: number;
	};

	let courseStatistics: CourseStatistic[] = [];
	let isLoading = true;
	let errorMessage: string | null = null;

	let sortKey: keyof CourseStatistic | null = null;
	let sortOrder: 'asc' | 'desc' = 'asc';

	onMount(async () => {
		try {
			isLoading = true;
			errorMessage = null;
			// 1. Fetch courses, including ECTS
			const { data: courses, error: coursesError } = await supabase
				.from('courses')
				.select('course_id, course_name, ects');

			if (coursesError) throw coursesError;
			if (!courses) throw new Error('No courses found.');

			// 2. Fetch enrollments
			const { data: enrollments, error: enrollmentsError } = await supabase
				.from('enrollments')
				.select('course_id, student_id, enrollment_id');

			if (enrollmentsError) throw enrollmentsError;
			if (!enrollments) throw new Error('No enrollments found.');

			// 3. Fetch student grades
			const { data: gradesData, error: gradesError } = await supabase
				.from('student_grades')
				.select('enrollment_id, grade');

			if (gradesError) throw gradesError;
			if (!gradesData) throw new Error('No grade data found.');

			// 4. Process data
			const statistics: CourseStatistic[] = courses.map((course) => {
				const courseEnrollments = enrollments.filter((e) => e.course_id === course.course_id);
				const studentIds = new Set(courseEnrollments.map((e) => e.student_id));
				const studentCount = studentIds.size;
				const enrollmentIdsForCourse = courseEnrollments.map((e) => e.enrollment_id);

				const courseGrades = gradesData
					.filter((g) => enrollmentIdsForCourse.includes(g.enrollment_id) && g.grade !== null)
					.map((g) => g.grade as number);

				let averageGpa: number | null = null;
				if (courseGrades.length > 0) {
					const sumGpa = courseGrades.reduce((acc, curr) => acc + curr, 0);
					averageGpa = parseFloat((sumGpa / courseGrades.length).toFixed(1)); // Changed to toFixed(1)
				}

				return {
					id: course.course_id,
					name: course.course_name,
					studentCount,
					averageGpa,
					ects: course.ects
				};
			});

			courseStatistics = statistics;
		} catch (error: unknown) {
			console.error('Error fetching admin overview data:', error);
			let specificMessage = 'An unknown error occurred while fetching data.';
			if (error instanceof Error) {
				specificMessage = error.message;
			} else if (
				error &&
				typeof error === 'object' &&
				'message' in error &&
				typeof error.message === 'string'
			) {
				specificMessage = error.message;
			}
			errorMessage = specificMessage;
		} finally {
			isLoading = false;
		}
	});

	function sortBy(key: keyof CourseStatistic) {
		if (sortKey === key) {
			sortOrder = sortOrder === 'asc' ? 'desc' : 'asc';
		} else {
			sortKey = key;
			sortOrder = 'asc';
		}
	}

	$: sortedCourseStatistics = [...courseStatistics].sort((a, b) => {
		if (!sortKey) return 0;

		const aVal = a[sortKey];
		const bVal = b[sortKey];

		if (sortKey === 'averageGpa') {
			if (aVal === null && bVal !== null) return 1;
			if (aVal !== null && bVal === null) return -1;
			if (aVal === null && bVal === null) return 0;
		}

		let comparison = 0;
		if (typeof aVal === 'string' && typeof bVal === 'string') {
			comparison = aVal.localeCompare(bVal);
		} else if (typeof aVal === 'number' && typeof bVal === 'number') {
			comparison = aVal - bVal;
		}

		return sortOrder === 'asc' ? comparison : comparison * -1;
	});

	function getSortIndicator(key: keyof CourseStatistic): string {
		if (sortKey === key) {
			return sortOrder === 'asc' ? '▲' : '▼';
		}
		return '↕';
	}
</script>

<div class="container mx-auto p-4">
	<h1 class="mb-4 text-2xl font-bold">Course Overview</h1>

	{#if isLoading}
		<p class="text-center text-gray-500">Loading course data...</p>
	{:else if errorMessage}
		<div
			class="relative rounded border border-red-400 bg-red-100 px-4 py-3 text-red-700"
			role="alert"
		>
			<strong class="font-bold">Error!</strong>
			<span class="block sm:inline">{errorMessage}</span>
		</div>
	{:else if sortedCourseStatistics.length === 0}
		<p class="text-center text-gray-500">No courses found.</p>
	{:else}
		<div class="overflow-x-auto shadow-md sm:rounded-lg">
			<table class="min-w-full divide-y divide-gray-200">
				<thead class="bg-gray-50">
					<tr>
						<th
							scope="col"
							class="cursor-pointer px-6 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase"
							on:click={() => sortBy('name')}
						>
							Course {getSortIndicator('name')}
						</th>
						<th
							scope="col"
							class="cursor-pointer px-6 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase"
							on:click={() => sortBy('studentCount')}
						>
							Students {getSortIndicator('studentCount')}
						</th>
						<th
							scope="col"
							class="cursor-pointer px-6 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase"
							on:click={() => sortBy('averageGpa')}
						>
							AVERAGE GPA {getSortIndicator('averageGpa')}
						</th>
						<th
							scope="col"
							class="cursor-pointer px-6 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase"
							on:click={() => sortBy('ects')}
						>
							ECTS {getSortIndicator('ects')}
						</th>
					</tr>
				</thead>
				<tbody class="divide-y divide-gray-200 bg-white">
					{#each sortedCourseStatistics as stat (stat.id)}
						<tr>
							<td class="px-6 py-4 whitespace-nowrap">
								<div class="text-sm font-medium text-gray-900">{stat.name}</div>
							</td>
							<td class="px-6 py-4 text-sm whitespace-nowrap text-gray-500">
								{stat.studentCount}
							</td>
							<td class="px-6 py-4 text-sm whitespace-nowrap text-gray-500">
								{stat.averageGpa !== null ? stat.averageGpa.toFixed(1) : 'N/A'}
							</td>
							<td class="px-6 py-4 text-sm whitespace-nowrap text-gray-500">
								{stat.ects}
							</td>
						</tr>
					{/each}
				</tbody>
			</table>
		</div>
	{/if}
</div>

<style>
	.container {
		max-width: 1200px;
	}
	.cursor-pointer {
		cursor: pointer;
	}
</style>
