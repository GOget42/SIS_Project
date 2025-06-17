<script lang="ts">
	import { onMount } from 'svelte';
	import type { SupabaseClient } from '@supabase/supabase-js';
	// Stellen Sie sicher, dass der Pfad zu Ihren Typdefinitionen korrekt ist
	import type { Database, Tables } from '$lib/database.types';

	// Prop für den Supabase-Client. Dieser muss von einer übergeordneten Komponente
	// oder über den Kontext bereitgestellt werden.
	export let supabase: SupabaseClient<Database>;

	// Typ für die berechneten GPA-Daten
	type GpaDataItem = {
		courseName: string;
		courseId: number;
		gpa: number | null;
	};

	let gpaData: GpaDataItem[] = [];
	let isLoading = true;
	let error: string | null = null;

	/**
	 * Berechnet den GPA für jeden Kurs basierend auf den Aufgaben und Studentnoten.
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

			const courseAssignments = allAssignments.filter(a => a.course_id === course.course_id);

			// Wenn ein Kurs keine Aufgaben hat, ist der GPA null.
			if (courseAssignments.length === 0) {
				gpaResults.push({ courseName: course.course_name, courseId: course.course_id, gpa: null });
				continue;
			}

			let totalWeightedGradeSum = 0;
			let totalWeightSum = 0;
			let courseHasAssignmentsWithGradesAndWeight = false;

			for (const assignment of courseAssignments) {
				// Überspringe Aufgaben ohne ID, ohne Gewichtung oder mit nicht-positiver Gewichtung.
				// Das Feld 'weight' ist in 'database.types.ts' als 'number' definiert, nicht 'number | null'.
				// Die Prüfung auf 'null' ist hier also eine zusätzliche Sicherheitsmaßnahme oder falls sich der Typ ändert.
				if (assignment.assignment_id === null || assignment.weight === null || assignment.weight <= 0) {
					continue;
				}

				const gradesForAssignment = allStudentGrades.filter(
					sg => sg.assignment_id === assignment.assignment_id && sg.grade !== null
				);

				if (gradesForAssignment.length > 0) {
					courseHasAssignmentsWithGradesAndWeight = true;
					// Stelle sicher, dass Noten Zahlen sind für die Summenbildung.
					const sumOfGrades = gradesForAssignment.reduce((sum, sg) => sum + (Number(sg.grade) || 0), 0);
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
				// Wenn keine gewichteten Aufgaben mit Noten vorhanden sind, ist der GPA null.
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
				.select('course_id, course_name'); // Nur benötigte Felder auswählen
			if (coursesError) throw coursesError;
			if (!courses) throw new Error('Keine Kurse gefunden');

			const { data: assignments, error: assignmentsError } = await supabase
				.from('assignments')
				.select('assignment_id, course_id, weight'); // Nur benötigte Felder auswählen
			if (assignmentsError) throw assignmentsError;
			if (!assignments) throw new Error('Keine Aufgaben gefunden');

			const { data: studentGrades, error: studentGradesError } = await supabase
				.from('student_grades')
				.select('assignment_id, grade'); // Nur benötigte Felder auswählen
			if (studentGradesError) throw studentGradesError;
			if (!studentGrades) throw new Error('Keine Studentnoten gefunden');

			// Stelle sicher, dass die Typen übereinstimmen, insbesondere für studentGrades
			gpaData = calculateGpaPerCourse(courses, assignments, studentGrades as Pick<Tables<'student_grades'>, 'assignment_id' | 'grade'>[]);

		} catch (e: any) {
			error = `Fehler beim Laden oder Berechnen der GPA-Daten: ${e.message}`;
			console.error("Error fetching or calculating GPA data:", e);
		} finally {
			isLoading = false;
		}
	}

	onMount(() => {
		if (supabase) {
			fetchDataAndCalculateGPA();
		} else {
			error = "Supabase Client ist nicht initialisiert. GPA-Daten können nicht geladen werden.";
			isLoading = false;
			console.error("Supabase client not available in GPAPerCourseChart.svelte onMount.");
		}
	});

</script>

<div>
	{#if isLoading}
		<p>Lade GPA-Daten...</p>
	{:else if error}
		<p style="color: red;">{error}</p>
	{:else if gpaData.length === 0}
		<p>Keine GPA-Daten verfügbar.</p>
	{:else}
		<div>
			<h2>GPA pro Kurs</h2>
			<ul>
				{#each gpaData as item}
					<li>
						{item.courseName} (ID: {item.courseId}): {item.gpa !== null ? item.gpa.toFixed(2) : 'N/A'}
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