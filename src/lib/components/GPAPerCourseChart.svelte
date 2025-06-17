<script lang="ts">
	import { onMount } from 'svelte';
	import type { SupabaseClient } from '@supabase/supabase-js';
	// Ensure the path to your type definitions is correct
	import type { Database, Tables } from '$lib/database.types';

	// Prop for the Supabase client. Must be provided by a parent component
	// or via context.
	export let supabase: SupabaseClient<Database>;

	// Type for the calculated GPA data
	type GpaDataItem = {
		courseName: string;
		courseId: number;
		gpa: number | null;
	};

	let gpaData: GpaDataItem[] = [];
	let isLoading = true;
	let error: string | null = null;

	/**
	 * Calculates the GPA for each course based on assignments and student grades.
	 */
	function calculateGpaPerCourse(
		allCourses: Tables<'courses'>[],
		allAssignments: Tables<'assignments'>[],
		allStudentGrades: Pick<Tables<'student_grades'>, 'assignment_id' | 'grade'>[]
	): GpaDataItem[] {
		const gpaResults: GpaDataItem[] = [];

		for (const course of allCourses) {
			// Überspringe Kurse ohne ID oder Namen
			if (course.course_id === null || !course.course_name) continue;

			const courseAssignments = allAssignments.filter((a) => a.course_id === course.course_id);

			// Wenn ein Kurs keine Aufgaben hat, ist der GPA null.
			if (courseAssignments.length === 0) {
				gpaResults.push({ courseName: course.course_name, courseId: course.course_id, gpa: null });
				continue;
			}

			let totalWeightedGradeSum = 0;
			let totalWeightSum = 0;
			let courseHasAssignmentsWithGradesAndWeight = false;

			for (const assignment of courseAssignments) {
				// Skip assignments without an ID, without weighting or with a non-positive weight.
				// Das Feld 'weight' ist in 'database.types.ts' als 'number' definiert, nicht 'number |The 'weight' field is defined as 'number' in 'database.types.ts', not 'number | null'.
				// The null check here is an extra safety measure in case the type changes.
				if (
					assignment.assignment_id === null ||
					assignment.weight === null ||
					assignment.weight <= 0
				) {
					continue;
				}

				const gradesForAssignment = allStudentGrades.filter(
					(sg) => sg.assignment_id === assignment.assignment_id && sg.grade !== null
				);

				if (gradesForAssignment.length > 0) {
					courseHasAssignmentsWithGradesAndWeight = true;
					// Ensure grades are numeric for summation.
					const sumOfGrades = gradesForAssignment.reduce(
						(sum, sg) => sum + (Number(sg.grade) || 0),
						0
					);
					const avgAssignmentGrade = sumOfGrades / gradesForAssignment.length;

					totalWeightedGradeSum += avgAssignmentGrade * assignment.weight;
					totalWeightSum += assignment.weight;
				}
			}

			if (totalWeightSum > 0 && courseHasAssignmentsWithGradesAndWeight) {
				gpaResults.push({
					courseName: course.course_name,
					courseId: course.course_id,
					gpa: totalWeightedGradeSum / totalWeightSum
				});
			} else {
				// If there are no weighted assignments with grades, the GPA is null.
				gpaResults.push({ courseName: course.course_name, courseId: course.course_id, gpa: null });
			}
		}
		return gpaResults;
	}

	async function fetchDataAndCalculateGPA() {
		isLoading = true;
		error = null;
		try {
			const { data: courses, error: coursesError } = await supabase
				.from('courses')
				.select('course_id, course_name'); // Select only required fields
			if (coursesError) throw coursesError;
			if (!courses) throw new Error('No courses found');

			const { data: assignments, error: assignmentsError } = await supabase
				.from('assignments')
				.select('assignment_id, course_id, weight'); // Select only required fields
			if (assignmentsError) throw assignmentsError;
			if (!assignments) throw new Error('No assignments found');

			const { data: studentGrades, error: studentGradesError } = await supabase
				.from('student_grades')
				.select('assignment_id, grade'); // Select only required fields
			if (studentGradesError) throw studentGradesError;
			if (!studentGrades) throw new Error('No student grades found');

			// Ensure that the types match, especially for studentGrades
			gpaData = calculateGpaPerCourse(
				courses,
				assignments,
				studentGrades as Pick<Tables<'student_grades'>, 'assignment_id' | 'grade'>[]
			);
		} catch (e: any) {
			error = `Error loading or calculating GPA data: ${e.message}`;
			console.error('Error fetching or calculating GPA data:', e);
		} finally {
			isLoading = false;
		}
	}

	onMount(() => {
		if (supabase) {
			fetchDataAndCalculateGPA();
		} else {
			error = 'Supabase client is not initialized. GPA data cannot be loaded.';
			isLoading = false;
			console.error('Supabase client not available in GPAPerCourseChart.svelte onMount.');
		}
	});
</script>

<div>
	{#if isLoading}
		<p>Loading GPA data...</p>
	{:else if error}
		<p style="color: red;">{error}</p>
	{:else if gpaData.length === 0}
		<p>No GPA data available.</p>
	{:else}
		<div>
			<h2>GPA pro Kurs</h2>
			<ul>
				{#each gpaData as item}
					<li>
						{item.courseName} (ID: {item.courseId}): {item.gpa !== null
							? item.gpa.toFixed(2)
							: 'N/A'}
					</li>
				{/each}
			</ul>
		</div>
	{/if}
</div>

<style>
	ul {
		list-style-type: none;
		padding: 0;
	}
	li {
		margin-bottom: 0.5em;
	}
</style>
