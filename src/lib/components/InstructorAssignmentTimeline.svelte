<script lang="ts">
	import { onMount } from 'svelte';
	import { supabase } from '$lib/supabaseClient';

	export let instructor_id: string;

	interface Assignment {
		assignment_id: string;
		assignment_name: string;
		due_date: string | null;
		course_name: string;
		course_id: number;
	}

	let assignments: Assignment[] = [];
	let isLoading = true;
	let error: string | null = null;

	onMount(async () => {
		if (!instructor_id) {
			error = "Instructor ID is required to load assignments.";
			isLoading = false;
			return;
		}
		try {
			// 1. Kurse des Dozenten abrufen, um Kurs-IDs zu erhalten
			const { data: instructorCourses, error: coursesError } = await supabase
				.from('courses')
				.select('course_id')
				.eq('instructor_id', parseInt(instructor_id));

			if (coursesError) throw coursesError;
			if (!instructorCourses || instructorCourses.length === 0) {
				assignments = []; // Keine Kurse, also keine Aufgaben
				isLoading = false;
				return;
			}

			const courseIds = instructorCourses.map(c => c.course_id);

			if (courseIds.length === 0) {
				assignments = [];
				isLoading = false;
				return;
			}

			// 2. Alle Aufgaben für diese Kurse abrufen, inklusive Kursdetails (Kursname)
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

			// 3. Aufgabendaten mappen
			assignments = courseAssignmentsData.map(a => {
				// Typ-Assertion für bessere Typsicherheit mit Supabase-Antworten
				const assignmentTyped = a as {
					assignment_id: string;
					assignment_name: string;
					due_date: string | null;
					course_id: number;
					courses: { course_name: string } | null; // Verknüpfte Kursdaten
				};
				return {
					assignment_id: assignmentTyped.assignment_id,
					assignment_name: assignmentTyped.assignment_name,
					due_date: assignmentTyped.due_date,
					course_name: assignmentTyped.courses?.course_name || 'N/A',
					course_id: assignmentTyped.course_id,
				};
			});

		} catch (e: any) {
			console.error("Error loading assignments for instructor:", e);
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
		<p class="text-gray-500">No assignments found for this instructor's courses.</p>
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
						<!-- Grade display removed as it's not applicable for instructor view -->
					</div>
					<p class="text-xs text-gray-500 mt-1">
						Fällig am: {formatDate(assignment.due_date)}
					</p>
				</div>
			{/each}
		</div>
	{/if}
</div>