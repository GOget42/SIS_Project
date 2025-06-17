<script lang="ts">
	import { onMount } from 'svelte';
	import { supabase } from '$lib/supabaseClient';

	export let student_id: string;

	interface Assignment {
		assignment_id: string;
		assignment_name: string;
		due_date: string | null;
		grade: number | null;
		course_name: string;
		course_id: number;
	}

	let assignments: Assignment[] = [];
	let isLoading = true;
	let error: string | null = null;

	onMount(async () => {
		if (!student_id) {
			error = "Student ID is required to load assignments.";
			isLoading = false;
			return;
		}
		try {
			// 1. Einschreibungen des Studenten abrufen, um Kurs-IDs und Einschreibungs-IDs zu erhalten
			const { data: studentEnrollments, error: enrollmentsError } = await supabase
				.from('enrollments')
				.select('enrollment_id, course_id')
				.eq('student_id', parseInt(student_id));

			if (enrollmentsError) throw enrollmentsError;
			if (!studentEnrollments || studentEnrollments.length === 0) {
				assignments = []; // Keine Kurse, also keine Aufgaben
				isLoading = false;
				return;
			}

			const courseIds = studentEnrollments.map(e => e.course_id);
			const enrollmentIds = studentEnrollments.map(e => e.enrollment_id);

			if (courseIds.length === 0) {
				assignments = [];
				isLoading = false;
				return;
			}

			// 2. Alle Aufgaben für diese Kurse abrufen, inklusive Kursdetails
			const { data: courseAssignmentsData, error: assignmentsError } = await supabase
				.from('assignments')
				.select(`
                    assignment_id,
                    assignment_name,
                    due_date,
                    course_id,
                    courses (
                        course_name
                    )
                `)
				.in('course_id', courseIds)
				.order('due_date', { ascending: true });

			if (assignmentsError) throw assignmentsError;
			if (!courseAssignmentsData) {
				assignments = [];
				isLoading = false;
				return;
			}

			// 3. Noten des Studenten für diese Einschreibungen abrufen
			let gradesMap = new Map<string, number | null>();
			if (enrollmentIds.length > 0) {
				const { data: studentGradesData, error: gradesError } = await supabase
					.from('student_grades')
					.select('assignment_id, grade')
					.in('enrollment_id', enrollmentIds);

				if (gradesError) throw gradesError;

				if (studentGradesData) {
					studentGradesData.forEach(sg => {
						if (sg.assignment_id) { // Sicherstellen, dass assignment_id nicht null ist
							gradesMap.set(sg.assignment_id, sg.grade);
						}
					});
				}
			}

			// 4. Aufgabendaten mit Noten kombinieren
			assignments = courseAssignmentsData.map(a => {
				// Typ-Assertion für bessere Typsicherheit mit Supabase-Antworten
				const assignmentTyped = a as {
					assignment_id: string;
					assignment_name: string;
					due_date: string | null;
					course_id: number; // course_id aus assignments Tabelle
					courses: { course_name: string } | null; // Verknüpfte Kursdaten
				};
				return {
					assignment_id: assignmentTyped.assignment_id,
					assignment_name: assignmentTyped.assignment_name,
					due_date: assignmentTyped.due_date,
					grade: gradesMap.get(assignmentTyped.assignment_id) ?? null,
					course_name: assignmentTyped.courses?.course_name || 'N/A',
					course_id: assignmentTyped.course_id,
				};
			});

		} catch (e: any) {
			console.error("Error loading assignments:", e);
			error = e.message || "Failed to load assignments.";
		} finally {
			isLoading = false;
		}
	});

	function formatDate(dateString: string | null): string {
		if (!dateString) return 'N/A';
		return new Date(dateString).toLocaleDateString('de-DE', {
			year: 'numeric',
			month: 'short',
			day: 'numeric'
		});
	}
</script>

<div class="bg-white shadow-md rounded-lg p-6">
	<h2 class="text-xl font-semibold text-gray-700 mb-4">Assignment Timeline</h2>
	{#if isLoading}
		<p class="text-gray-500">Loading assignments...</p>
	{:else if error}
		<div class="bg-red-100 border-l-4 border-red-500 text-red-700 p-4" role="alert">
			<p class="font-bold">Error</p>
			<p>{error}</p>
		</div>
	{:else if assignments.length === 0}
		<p class="text-gray-500">No assignments found for this student.</p>
	{:else}
		<div class="space-y-4">
			{#each assignments as assignment (assignment.assignment_id)}
				<div class="border rounded-lg p-4 hover:shadow-lg transition-shadow duration-200 ease-in-out">
					<div class="flex justify-between items-start">
						<div>
							<h3 class="font-semibold text-gray-800">{assignment.assignment_name}</h3>
							<a href={`/private/courses/${assignment.course_id}`} class="text-sm text-blue-600 hover:underline">
								{assignment.course_name}
							</a>
						</div>
						{#if assignment.grade !== null && assignment.grade !== undefined}
							<span class="text-lg font-bold text-green-600">{assignment.grade}</span>
						{:else}
							<span class="text-sm text-gray-400">Not yet graded</span>
						{/if}
					</div>
					<p class="text-xs text-gray-500 mt-1">
						Fällig am: {formatDate(assignment.due_date)}
					</p>
				</div>
			{/each}
		</div>
	{/if}
</div>