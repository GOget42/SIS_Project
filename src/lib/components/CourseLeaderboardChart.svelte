<script lang="ts">
	import { onMount } from 'svelte';
	import { supabase } from '$lib/supabaseClient';

	export let course_id: string;

	type StudentLeaderboardEntry = {
		studentId: string;
		name: string;
		averageGpa: number;
	};

	let leaderboard: StudentLeaderboardEntry[] = [];
	let isLoading = true;
	let error: string | null = null;

	// Helper function to get rank icon
	function getRankIcon(rank: number): string {
		switch (rank) {
			case 1:
				return '🥇'; // Gold Crown
			case 2:
				return '🥈'; // Silver Medal
			case 3:
				return '🥉'; // Bronze Medal
			case 4:
				return '4️⃣'; // Diamond
			case 5:
				return '5️⃣'; // Star
			default:
				return '';
		}
	}

	onMount(async () => {
		if (!course_id) {
			error = "Kurs-ID ist erforderlich.";
			isLoading = false;
			return;
		}
		await fetchLeaderboardData();
	});

	async function fetchLeaderboardData() {
		isLoading = true;
		error = null;
		try {
			const { data: enrollmentsData, error: enrollmentsError } = await supabase
				.from('enrollments')
				.select('enrollment_id, student_id, students!inner(student_id, first_name, last_name)')
				.eq('course_id', course_id);

			if (enrollmentsError) throw enrollmentsError;
			if (!enrollmentsData || enrollmentsData.length === 0) {
				leaderboard = [];
				isLoading = false;
				return;
			}

			const { data: courseAssignmentsData, error: assignmentsError } = await supabase
				.from('assignments')
				.select('assignment_id, weight')
				.eq('course_id', course_id)
				.not('weight', 'is', null)
				.gt('weight', 0);

			if (assignmentsError) throw assignmentsError;

			if (!courseAssignmentsData || courseAssignmentsData.length === 0) {
				leaderboard = enrollmentsData.map(enrollment => ({
					studentId: enrollment.students.student_id,
					name: `${enrollment.students.first_name} ${enrollment.students.last_name}`,
					averageGpa: 0,
				})).sort((a,b) => a.name.localeCompare(b.name))
					.slice(0,5);
				isLoading = false;
				return;
			}

			const assignmentWeights = new Map(courseAssignmentsData.map(a => [a.assignment_id, a.weight as number]));
			const assignmentIds = courseAssignmentsData.map(a => a.assignment_id);

			const enrollmentIds = enrollmentsData.map(e => e.enrollment_id);
			const { data: studentGradesData, error: gradesError } = await supabase
				.from('student_grades')
				.select('enrollment_id, assignment_id, grade')
				.in('enrollment_id', enrollmentIds)
				.in('assignment_id', assignmentIds)
				.not('grade', 'is', null);

			if (gradesError) throw gradesError;

			const studentData = enrollmentsData.map((enrollment) => {
				const student = enrollment.students;
				const gradesForStudent = studentGradesData?.filter(sg => sg.enrollment_id === enrollment.enrollment_id) || [];

				let totalWeightedScore = 0;
				let totalEffectiveWeight = 0;

				gradesForStudent.forEach(sg => {
					const weight = assignmentWeights.get(sg.assignment_id);
					if (sg.grade !== null && weight !== undefined && weight > 0) {
						totalWeightedScore += (sg.grade as number) * weight;
						totalEffectiveWeight += weight;
					}
				});

				const averageGpa = totalEffectiveWeight > 0 ? totalWeightedScore / totalEffectiveWeight : 0;

				return {
					studentId: student.student_id,
					name: `${student.first_name} ${student.last_name}`,
					averageGpa,
				};
			});

			leaderboard = studentData
				.sort((a, b) => b.averageGpa - a.averageGpa)
				.slice(0, 5);

		} catch (e: any) {
			console.error("Fehler beim Laden der Leaderboard-Daten:", e);
			error = e.message || "Fehler beim Laden der Leaderboard-Daten.";
			leaderboard = [];
		} finally {
			isLoading = false;
		}
	}
</script>

<div class="course-leaderboard bg-white shadow-md rounded-lg p-6">
	<h3 class="text-xl font-semibold text-gray-700 mb-4">Top 5 Studenten</h3>
	{#if isLoading}
		<p class="text-gray-500">Leaderboard wird geladen...</p>
	{:else if error}
		<p class="text-red-500">Fehler: {error}</p>
	{:else if leaderboard.length === 0}
		<p class="text-gray-500">Keine Studentendaten für das Leaderboard verfügbar.</p>
	{:else}
		<ol class="space-y-3">
			{#each leaderboard as student, i (student.studentId)}
				<li class="flex items-center justify-between p-3 bg-gray-50 rounded-md hover:bg-gray-100 transition-colors">
					<div class="flex items-center">
						<span class="text-2xl w-8 text-center">{getRankIcon(i + 1)}</span>
						<span class="ml-3 font-medium text-gray-700">{i + 1}. {student.name}</span>
					</div>
					<span class="text-sm font-semibold text-blue-600 bg-blue-100 px-2 py-1 rounded-full">
            GPA: {student.averageGpa.toFixed(2)}
          </span>
				</li>
			{/each}
		</ol>
	{/if}
</div>

<style>
    /* Stil-Anpassungen können hier vorgenommen werden, falls nötig */
</style>