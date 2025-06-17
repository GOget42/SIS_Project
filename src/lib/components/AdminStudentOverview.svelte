<script lang="ts">
	import { onMount } from 'svelte';
	import { supabase } from '$lib/supabaseClient'; // Adjust path if necessary
	import type { Tables } from '$lib/database.types'; // Adjust path if necessary

	interface StudentDisplayData {
		id: number;
		fullName: string;
		email: string;
		coursesEnrolledIn: number;
		averageGpa: number | null; // Changed to number | null for sorting
		finishedEcts: number;
	}

	let studentsDisplayData: StudentDisplayData[] = [];
	let loading = true;
	let errorLoading: string | null = null;

	let sortKey: keyof StudentDisplayData | null = null;
	let sortOrder: 'asc' | 'desc' = 'asc';

	onMount(async () => {
		try {
			loading = true;
			errorLoading = null;

			// 1. Fetch all students
			const { data: students, error: studentsError } = await supabase
				.from('students')
				.select('student_id, first_name, last_name, email');

			if (studentsError) throw studentsError;
			if (!students) throw new Error('No students found.');

			// 2. Fetch all enrollments
			const { data: allEnrollments, error: enrollmentsError } = await supabase
				.from('enrollments')
				.select('enrollment_id, student_id, course_id');

			if (enrollmentsError) throw enrollmentsError;
			if (!allEnrollments) throw new Error('Could not load enrollments.');

			const enrollmentIds = allEnrollments.map((e) => e.enrollment_id);
			let allStudentGrades: Tables<'student_grades'>[] = [];
			if (enrollmentIds.length > 0) {
				// 3. Fetch all student_grades for these enrollments
				const { data: studentGradesData, error: studentGradesError } = await supabase
					.from('student_grades')
					.select('enrollment_id, grade')
					.in('enrollment_id', enrollmentIds);
				if (studentGradesError) throw studentGradesError;
				allStudentGrades = studentGradesData || [];
			}

			const courseIds = [
				...new Set(allEnrollments.map((e) => e.course_id).filter((id) => id !== null))
			] as number[];
			let allCourses: Pick<Tables<'courses'>, 'course_id' | 'ects'>[] = [];
			if (courseIds.length > 0) {
				// 4. Fetch all relevant courses for ECTS
				const { data: coursesData, error: coursesError } = await supabase
					.from('courses')
					.select('course_id, ects')
					.in('course_id', courseIds);
				if (coursesError) throw coursesError;
				allCourses = coursesData || [];
			}

			// Process data for each student
			studentsDisplayData = students.map((student) => {
				const studentEnrollments = allEnrollments.filter(
					(e) => e.student_id === student.student_id
				);
				const coursesEnrolledIn = studentEnrollments.length;

				let sumGpa = 0;
				let countGpa = 0;
				let totalFinishedEcts = 0;

				studentEnrollments.forEach((enrollment) => {
					const gradesForEnrollment = allStudentGrades.filter(
						(sg) => sg.enrollment_id === enrollment.enrollment_id && sg.grade !== null
					);

					let courseHasGrades = false;
					gradesForEnrollment.forEach((sg) => {
						// sg.grade is confirmed not null by the filter above
						sumGpa += sg.grade!;
						countGpa++;
						courseHasGrades = true;
					});

					if (courseHasGrades) {
						const course = allCourses.find((c) => c.course_id === enrollment.course_id);
						if (course && typeof course.ects === 'number') {
							totalFinishedEcts += course.ects;
						}
					}
				});

				const averageGpaValue = countGpa > 0 ? parseFloat((sumGpa / countGpa).toFixed(1)) : null;

				return {
					id: student.student_id,
					fullName: `${student.first_name} ${student.last_name}`,
					email: student.email,
					coursesEnrolledIn,
					averageGpa: averageGpaValue,
					finishedEcts: totalFinishedEcts
				};
			});
		} catch (e: any) {
			console.error('Error loading student overview data:', e);
			errorLoading = e.message || 'An unknown error occurred.';
		} finally {
			loading = false;
		}
	});

	function sortBy(key: keyof StudentDisplayData) {
		if (sortKey === key) {
			sortOrder = sortOrder === 'asc' ? 'desc' : 'asc';
		} else {
			sortKey = key;
			sortOrder = 'asc';
		}
	}

	$: sortedStudentsDisplayData = [...studentsDisplayData].sort((a, b) => {
		if (!sortKey) return 0;

		const aVal = a[sortKey];
		const bVal = b[sortKey];

		if (sortKey === 'averageGpa') {
			// Handle nulls for averageGpa
			if (aVal === null && bVal !== null) return sortOrder === 'asc' ? 1 : -1;
			if (aVal !== null && bVal === null) return sortOrder === 'asc' ? -1 : 1;
			if (aVal === null && bVal === null) return 0;
		}

		let comparison = 0;
		if (typeof aVal === 'string' && typeof bVal === 'string') {
			comparison = aVal.localeCompare(bVal);
		} else if (typeof aVal === 'number' && typeof bVal === 'number') {
			comparison = aVal - bVal;
		} else if (aVal === null && bVal !== null) {
			comparison = 1; // nulls last
		} else if (aVal !== null && bVal === null) {
			comparison = -1; // nulls last
		}

		return sortOrder === 'asc' ? comparison : comparison * -1;
	});

	function getSortIndicator(key: keyof StudentDisplayData): string {
		if (sortKey === key) {
			return sortOrder === 'asc' ? '▲' : '▼';
		}
		return '↕';
	}
</script>

<div class="container mx-auto p-4">
	<h1 class="mb-4 text-2xl font-bold">Student Overview</h1>

	{#if loading}
		<p class="text-center text-gray-500">Loading student data...</p>
	{:else if errorLoading}
		<div
			class="relative rounded border border-red-400 bg-red-100 px-4 py-3 text-red-700"
			role="alert"
		>
			<strong class="font-bold">Error!</strong>
			<span class="block sm:inline">{errorLoading}</span>
		</div>
	{:else if sortedStudentsDisplayData.length === 0}
		<p class="text-center text-gray-500">No students found.</p>
	{:else}
		<div class="overflow-x-auto shadow-md sm:rounded-lg">
			<table class="min-w-full divide-y divide-gray-200">
				<thead class="bg-gray-50">
					<tr>
						<th
							scope="col"
							class="cursor-pointer px-6 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase"
							on:click={() => sortBy('fullName')}
						>
							Student {getSortIndicator('fullName')}
						</th>
						<th
							scope="col"
							class="cursor-pointer px-6 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase"
							on:click={() => sortBy('coursesEnrolledIn')}
						>
							Courses Enrolled {getSortIndicator('coursesEnrolledIn')}
						</th>
						<th
							scope="col"
							class="cursor-pointer px-6 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase"
							on:click={() => sortBy('averageGpa')}
						>
							Average GPA {getSortIndicator('averageGpa')}
						</th>
						<th
							scope="col"
							class="cursor-pointer px-6 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase"
							on:click={() => sortBy('finishedEcts')}
						>
							Finished ECTS {getSortIndicator('finishedEcts')}
						</th>
					</tr>
				</thead>
				<tbody class="divide-y divide-gray-200 bg-white">
					{#each sortedStudentsDisplayData as student (student.id)}
						<tr>
							<td class="px-6 py-4 whitespace-nowrap">
								<div class="text-sm font-medium text-gray-900">{student.fullName}</div>
								<div class="text-sm text-gray-500">{student.email}</div>
							</td>
							<td class="px-6 py-4 text-sm whitespace-nowrap text-gray-500">
								{student.coursesEnrolledIn}
							</td>
							<td class="px-6 py-4 text-sm whitespace-nowrap text-gray-500">
								{student.averageGpa !== null ? student.averageGpa.toFixed(1) : 'N/A'}
							</td>
							<td class="px-6 py-4 text-sm whitespace-nowrap text-gray-500">
								{student.finishedEcts}
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
