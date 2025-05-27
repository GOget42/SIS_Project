<script lang="ts">
	import { onMount } from 'svelte';
	import { supabase } from '$lib/supabaseClient.js';
	import Chart from 'chart.js/auto';

	export let student_id: string; // Geändert von 'student' zu 'student_id'

	// Variablen für Chart-Daten, die von Noten abhängen, werden vorerst nicht berechnet
	// let completedCourses = [];
	let completedECTS = 0;
	let totalECTS = 180; // Beispielwert, sollte idealerweise dynamisch sein
	// let gpa = 0;

	let progressCanvas: HTMLCanvasElement;
	let gradeCanvas: HTMLCanvasElement;

	onMount(async () => {
		if (!student_id) return;

		// Laden der Einschreibungen und Kurse, um ECTS zu berechnen
		// Die Noten (`grade`) sind jetzt in `assignments` und erfordern eine andere Logik
		const { data: enrollments, error: enrollmentsError } = await supabase
			.from('enrollments')
			.select(`
        enrollment_id,
        courses ( course_id, course_name, ects ),
        assignments ( assignment_id, grade )
      `) // Lade assignments, um später zu entscheiden, ob ein Kurs bestanden ist
			.eq('student_id', student_id); // student_id direkt verwenden

		if (enrollmentsError) {
			console.error("Error fetching enrollments for charts:", enrollmentsError.message);
			return;
		}

		if (enrollments) {
			// Berechnung von completedECTS muss angepasst werden.
			// Annahme: Ein Kurs gilt als abgeschlossen, wenn er z.B. mindestens eine bestandene Leistung hat.
			// Diese Logik ist hier noch nicht implementiert und dient als Platzhalter.
			// Fürs Erste zählen wir ECTS für alle eingeschriebenen Kurse, was nicht korrekt ist.
			// Eine korrekte Implementierung würde die 'assignments' prüfen.
			completedECTS = enrollments.reduce((acc, e) => acc + (e.courses?.ects || 0), 0);

			// GPA und Notenverteilung erfordern eine Neuberechnung basierend auf `assignments`.
			// Diese Teile werden vorerst auskommentiert.
			/*
			const gradedAssignments = enrollments.flatMap(e => e.assignments?.filter(a => a.grade != null) || []);
			if (gradedAssignments.length > 0 && enrollments.length > 0) {
				// GPA-Berechnung hier anpassen (z.B. Durchschnitt der Assignment-Noten oder gewichteter Durchschnitt)
				// gpa = ...
			}
			*/
		}

		// Progress Chart (ECTS)
		if (progressCanvas) {
			new Chart(progressCanvas, {
				type: 'bar',
				data: {
					labels: ['ECTS Progress'],
					datasets: [
						{
							label: `Attempted: ${completedECTS}`, // Geändert von "Completed" zu "Attempted"
							data: [completedECTS],
							backgroundColor: '#34d399'
						},
						{
							label: `Remaining: ${Math.max(totalECTS - completedECTS, 0)}`,
							data: [Math.max(totalECTS - completedECTS, 0)],
							backgroundColor: '#d1d5db'
						}
					]
				},
				options: {
					indexAxis: 'y',
					responsive: true,
					aspectRatio: 2.5,
					plugins: {
						legend: { position: 'bottom' },
						title: {
							display: true,
							text: `Progress: ${completedECTS} / ${totalECTS} ECTS (Attempted)`
						}
					},
					scales: {
						x: { stacked: true, max: totalECTS, beginAtZero: true },
						y: { stacked: true }
					}
				}
			});
		}

		// Grade Distribution Chart (vorerst deaktiviert/vereinfacht)
		if (gradeCanvas) {
			// Da die Notenlogik komplexer wird mit Assignments,
			// wird dieser Chart vorerst nicht mit Daten gefüllt oder vereinfacht dargestellt.
			// Man könnte hier z.B. die Anzahl der Assignments anzeigen oder eine leere Nachricht.
			const ctx = gradeCanvas.getContext('2d');
			if (ctx) {
				ctx.font = "16px Arial";
				ctx.textAlign = "center";
				ctx.fillText("Grade distribution chart will be updated.", gradeCanvas.width / 2, gradeCanvas.height / 2);
			}
		}
	});
</script>

<div class="grid grid-cols-1 xl:grid-cols-2 gap-6 mt-10">
	<div class="bg-white shadow-xl rounded-xl p-6">
		<canvas bind:this={progressCanvas}></canvas>
	</div>

	<div class="bg-white shadow-xl rounded-xl p-6">
		<canvas bind:this={gradeCanvas}></canvas>
	</div>
</div>