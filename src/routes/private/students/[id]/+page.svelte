<script lang="ts">
	import { deleteStudent, updateStudent } from '$lib/api/students.ts';
	import { deleteAuthUser } from '$lib/api/auth.ts';
	import { goto, invalidateAll } from '$app/navigation';
	import ProgressChart from '$lib/components/ProgressChart.svelte';
	import GradeDistributionStudentChart from '$lib/components/GradeDistributionStudentChart.svelte';
	import type { ActionData, PageData } from './$types';
	import { formSubmitIndicator } from '$lib/actions/formSubmitIndicator';
	import type { ActionResult } from '@sveltejs/kit';

	export let data: PageData;
	export let form: ActionData;

	// Interfaces basierend auf PageData (von +page.server.ts abgeleitet)
	interface Assignment {
		assignment_id: string;
		assignment_name: string;
		grade: number | null; // Angepasst an Serverdaten
		weight: number | null; // Angepasst an Serverdaten und DB
		due_date: string | null;
		// max_points entfernt, da nicht direkt in DB 'assignments' oder von Serverdaten bereitgestellt
	}

	interface CourseInfo {
		course_id: number;
		course_name: string;
	}

	interface CourseEnrollment {
		enrollment_id: number;
		courses: (CourseInfo & { assignments: Assignment[] }) | null; // Sicherstellen, dass assignments hier ist
	}

	interface Student {
		student_id: number;
		first_name: string;
		last_name: string;
		email: string;
		user_id: string | null;
	}

	interface AvailableCourse {
		course_id: number;
		course_name: string;
	}

	let student: Student | null = data.student as Student | null;
	let editing = false;
	// Sicherstellen, dass enrolledCourses und availableCourses korrekt initialisiert werden
	let enrolledCourses: CourseEnrollment[] = (data.enrolledCourses as CourseEnrollment[]) || [];
	let availableCourses: AvailableCourse[] = (data.availableCourses as AvailableCourse[]) || [];

	$: {
		student = data.student as Student | null;
		availableCourses = (data.availableCourses as AvailableCourse[]) || [];
		enrolledCourses = (data.enrolledCourses as CourseEnrollment[]) || [];
		if (form?.success) {
			// form = null; // oder spezifische Eigenschaften zurücksetzen
		}
	}

	// Die handleDelete und handleUpdateSubmit Funktionen bleiben wie zuvor,
	// da sie sich auf Studenten-Entitäten und nicht direkt auf die Assignment-Anzeige beziehen.
	// Die Logik für das Löschen und Aktualisieren von Studenten wird über Formularaktionen gehandhabt.

	async function handleDelete() {
		if (
			student &&
			confirm('Are you sure you want to delete this student? This action cannot be undone.')
		) {
			const studentIdToDelete = student.student_id;
			const authUserIdToDelete = student.user_id;

			try {
				// Diese Logik sollte idealerweise auch eine Server-Aktion sein, ähnlich wie bei Staff.
				// Für Konsistenz und Robustheit. Hier wird die bestehende Client-seitige Logik beibehalten.
				await deleteStudent(studentIdToDelete);
				console.log(`Student record ${studentIdToDelete} deleted successfully.`);

				if (authUserIdToDelete) {
					try {
						await deleteAuthUser(authUserIdToDelete);
						console.log(`Auth user ${authUserIdToDelete} deleted successfully.`);
					} catch (authError: any) {
						console.error(`Failed to delete auth user ${authUserIdToDelete}:`, authError);
						alert(
							`Student record was deleted, but failed to delete the associated authentication user: ${authError.message}. You might need to manually remove the user from the authentication system.`
						);
					}
				}

				await invalidateAll();
				await goto('/private/students', { replaceState: true });
			} catch (dbError: any) {
				console.error(`Failed to delete student ${studentIdToDelete}:`, dbError);
				alert(
					`Failed to delete student: ${dbError.message}. This might be due to existing related data (like enrollments) or a server error. The authentication user (if any) was not attempted to be deleted. Check the console for more details.`
				);
			}
		}
	}

	const handleUpdateSubmit = () => {
		return async ({ result }: { result: ActionResult; update: () => Promise<void> }) => {
			if (result.type === 'success' && result.data?.success) {
				editing = false;
			}
			await invalidateAll();
		};
	};
</script>

<div class="container mx-auto p-4 sm:p-6 lg:p-8">
	<div class="mb-8 flex items-center justify-between">
		<h1 class="text-3xl font-bold text-gray-800">Student Detail</h1>
		<a
			href="/private/students"
			class="text-blue-600 transition duration-150 ease-in-out hover:text-blue-800 hover:underline"
		>
			&larr; Back to Students List
		</a>
	</div>

	{#if student}
		<div class="mb-8 rounded-xl bg-white p-6 shadow-xl">
			{#if editing}
				<form method="POST" action="?/updateStudent" use:formSubmitIndicator={handleUpdateSubmit}>
					<input type="hidden" name="student_id" value={student.student_id} />
					<div class="mb-6 grid grid-cols-1 gap-6 md:grid-cols-2">
						<div>
							<label for="first_name" class="mb-1 block text-sm font-medium text-gray-700"
								>First Name</label
							>
							<input
								type="text"
								name="first_name"
								id="first_name"
								bind:value={student.first_name}
								class="mt-1 block w-full rounded-md border border-gray-300 px-4 py-2 shadow-sm focus:border-blue-500 focus:ring-blue-500 focus:outline-none sm:text-sm"
								required
							/>
						</div>
						<div>
							<label for="last_name" class="mb-1 block text-sm font-medium text-gray-700"
								>Last Name</label
							>
							<input
								type="text"
								name="last_name"
								id="last_name"
								bind:value={student.last_name}
								class="mt-1 block w-full rounded-md border border-gray-300 px-4 py-2 shadow-sm focus:border-blue-500 focus:ring-blue-500 focus:outline-none sm:text-sm"
								required
							/>
						</div>
						<div>
							<label for="email" class="mb-1 block text-sm font-medium text-gray-700">Email</label>
							<input
								type="email"
								name="email"
								id="email"
								bind:value={student.email}
								class="mt-1 block w-full rounded-md border border-gray-300 px-4 py-2 shadow-sm focus:border-blue-500 focus:ring-blue-500 focus:outline-none sm:text-sm"
								required
							/>
						</div>
					</div>
					<div class="flex justify-end space-x-3">
						<button
							type="button"
							on:click={() => (editing = false)}
							class="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:outline-none"
						>
							Cancel
						</button>
						<button
							type="submit"
							class="rounded-md border border-transparent bg-green-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-green-700 focus:ring-2 focus:ring-green-500 focus:ring-offset-2 focus:outline-none"
						>
							Save Changes
						</button>
					</div>
				</form>
				{#if form?.updateError}
					<p class="mt-4 rounded-md bg-red-100 p-3 text-sm text-red-600">
						{form.message || 'An error occurred during update.'}
					</p>
				{/if}
			{:else}
				<div class="mb-6 grid grid-cols-1 gap-x-8 gap-y-4 md:grid-cols-2">
					<div>
						<strong class="font-semibold text-gray-700">Student ID:</strong>
						<span class="text-gray-600">{student.student_id}</span>
					</div>
					<div>
						<strong class="font-semibold text-gray-700">First Name:</strong>
						<span class="text-gray-600">{student.first_name}</span>
					</div>
					<div>
						<strong class="font-semibold text-gray-700">Last Name:</strong>
						<span class="text-gray-600">{student.last_name}</span>
					</div>
					<div>
						<strong class="font-semibold text-gray-700">Email:</strong>
						<span class="text-gray-600">{student.email}</span>
					</div>
					{#if student.user_id}
						<div>
							<strong class="font-semibold text-gray-700">Auth User ID:</strong>
							<span class="text-gray-600">{student.user_id}</span>
						</div>
					{/if}
				</div>
				<div class="flex justify-end space-x-3">
					<button
						on:click={() => (editing = true)}
						class="flex items-center space-x-2 rounded-md border border-transparent bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:outline-none"
					>
						<svg
							xmlns="http://www.w3.org/2000/svg"
							viewBox="0 0 20 20"
							fill="currentColor"
							class="h-4 w-4"
							><path
								d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z"
							></path></svg
						>
						<span>Edit</span>
					</button>
					<!-- Der Lösch-Button verwendet die client-seitige handleDelete Funktion -->
					<button
						on:click={handleDelete}
						class="flex items-center space-x-2 rounded-md border border-transparent bg-red-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-red-700 focus:ring-2 focus:ring-red-500 focus:ring-offset-2 focus:outline-none"
					>
						<svg
							xmlns="http://www.w3.org/2000/svg"
							viewBox="0 0 20 20"
							fill="currentColor"
							class="h-4 w-4"
							><path
								fill-rule="evenodd"
								d="M8.75 1A2.75 2.75 0 006 3.75v.443c-.795.077-1.58.177-2.34.297A1.75 1.75 0 002.25 6H1.75a.75.75 0 000 1.5h.563c.015.04.032.078.049.117l.69 6.9A2.75 2.75 0 005.75 17h8.5A2.75 2.75 0 0017.002 14.517l.69-6.9c.017-.04.034-.077.049-.117h.563a.75.75 0 000-1.5h-.5a1.75 1.75 0 00-1.41-1.509c-.76-.12-1.545-.22-2.34-.297V3.75A2.75 2.75 0 0011.25 1h-2.5zM7.5 3.75c0-.966.784-1.75 1.75-1.75h1.5c.966 0 1.75.784 1.75 1.75v.443c-.563.065-1.14.14-1.716.226a.75.75 0 00-.568 0c-.575-.087-1.153-.16-1.716-.226V3.75zM4.249 6h11.502c.176.02.34.058.5.107l-.66 6.604a1.25 1.25 0 01-1.24 1.164H5.65a1.25 1.25 0 01-1.24-1.164L3.75 6.107A1.733 1.733 0 014.249 6z"
								clip-rule="evenodd"
							></path></svg
						>
						<span>Delete</span>
					</button>
				</div>
			{/if}
		</div>

		{#if student?.student_id}
			<div class="mb-8 rounded-xl bg-white p-6 shadow-xl">
				<h2 class="mb-6 text-2xl font-semibold text-gray-800">Performance Overview</h2>
				<div class="grid grid-cols-1 gap-6 xl:grid-cols-2">
					<ProgressChart student_id={student.student_id.toString()} />
					<GradeDistributionStudentChart student_id={student.student_id.toString()} />
				</div>
			</div>
		{/if}

		<div class="mb-8 rounded-xl bg-white p-6 shadow-xl">
			<h2 class="mb-6 text-2xl font-semibold text-gray-800">Enrolled Courses & Assignments</h2>
			{#if enrolledCourses.length > 0}
				<ul class="space-y-6">
					{#each enrolledCourses as enrollment (enrollment.enrollment_id)}
						<li
							class="rounded-lg border border-gray-200 p-4 transition-shadow duration-150 ease-in-out hover:shadow-md"
						>
							{#if enrollment.courses}
								<div class="mb-3 flex items-center justify-between">
									<a
										href={`/private/courses/${enrollment.courses.course_id}`}
										class="text-xl font-medium text-blue-600 hover:text-blue-800 hover:underline"
									>
										{enrollment.courses.course_name}
									</a>
									<span class="text-sm text-gray-500"
										>Course ID: {enrollment.courses.course_id}</span
									>
								</div>

								{#if enrollment.courses.assignments && enrollment.courses.assignments.length > 0}
									<h4
										class="text-md mt-3 mb-2 border-t border-gray-200 pt-3 font-semibold text-gray-700"
									>
										Assignments:
									</h4>
									<ul class="list-inside list-disc space-y-1.5 pl-4 text-sm">
										{#each enrollment.courses.assignments as assignment (assignment.assignment_id)}
											<li>
												<span class="font-medium">{assignment.assignment_name}</span>
												{#if assignment.grade !== null && assignment.grade !== undefined}
													- Grade: {assignment.grade}
												{/if}
												{#if assignment.weight !== null && assignment.weight !== undefined}
													<span class="text-xs text-gray-500">
														(Weight: {assignment.weight * 100}%)</span
													>
												{/if}
												{#if assignment.due_date}
													<span class="text-xs text-gray-500 italic">
														(Due: {new Date(assignment.due_date).toLocaleDateString()})</span
													>
												{/if}
											</li>
										{/each}
									</ul>
								{:else}
									<p class="mt-2 border-t border-gray-100 pt-2 text-sm text-gray-500">
										No assignments recorded for this course.
									</p>
								{/if}
							{:else}
								<p class="text-sm text-gray-500">Course details not available.</p>
							{/if}
						</li>
					{/each}
				</ul>
			{:else}
				<div class="py-6 text-center">
					<svg
						xmlns="http://www.w3.org/2000/svg"
						fill="none"
						viewBox="0 0 24 24"
						stroke-width="1.5"
						stroke="currentColor"
						class="mx-auto mb-3 h-12 w-12 text-gray-400"
					>
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z"
						/>
					</svg>
					<p class="text-lg text-gray-500">Not enrolled in any courses yet.</p>
				</div>
			{/if}
		</div>

		<div class="mb-8 rounded-xl bg-white p-6 shadow-xl">
			<h2 class="mb-6 text-2xl font-semibold text-gray-800">Available Courses to Enroll</h2>
			{#if form?.message}
				<div
					class={`mb-4 rounded-md p-3 text-sm ${form.success ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}
				>
					{form.message}
				</div>
			{/if}
			{#if availableCourses.length > 0}
				<ul class="space-y-3">
					{#each availableCourses as course (course.course_id)}
						<li
							class="flex items-center justify-between rounded-md border border-gray-200 p-3 transition-colors duration-150 ease-in-out hover:bg-gray-50"
						>
							<div>
								<a
									href={`/private/courses/${course.course_id}`}
									class="font-medium text-blue-600 hover:text-blue-800 hover:underline"
								>
									{course.course_name}
								</a>
								<span class="ml-2 text-sm text-gray-500">(ID: {course.course_id})</span>
							</div>
							<form method="POST" action="?/enrollStudent" use:formSubmitIndicator>
								<input type="hidden" name="course_id" value={course.course_id} />
								<button
									type="submit"
									class="rounded-md border border-transparent bg-green-600 px-3 py-1.5 text-sm font-medium text-white shadow-sm hover:bg-green-700 focus:ring-2 focus:ring-green-500 focus:ring-offset-2 focus:outline-none"
								>
									Enroll
								</button>
							</form>
						</li>
					{/each}
				</ul>
			{:else}
				<div class="py-6 text-center">
					<svg
						xmlns="http://www.w3.org/2000/svg"
						fill="none"
						viewBox="0 0 24 24"
						stroke-width="1.5"
						stroke="currentColor"
						class="mx-auto mb-3 h-12 w-12 text-gray-400"
					>
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25"
						/>
					</svg>
					<p class="text-lg text-gray-500">
						No other courses available for enrollment at this time.
					</p>
				</div>
			{/if}
		</div>
	{:else}
		<div class="rounded-lg bg-white p-6 text-center shadow-md">
			<svg
				xmlns="http://www.w3.org/2000/svg"
				fill="none"
				viewBox="0 0 24 24"
				stroke-width="1.5"
				stroke="currentColor"
				class="mx-auto mb-4 h-16 w-16 text-red-500"
			>
				<path
					stroke-linecap="round"
					stroke-linejoin="round"
					d="M12 9v3.75m0-10.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.75c0 5.592 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.57-.598-3.75h-.152c-3.196 0-6.1-1.249-8.25-3.286zm0 13.036h.008v.008H12v-.008z"
				/>
			</svg>
			<p class="text-xl font-semibold text-red-600">Student Not Found</p>
			<p class="mt-2 text-gray-500">
				The student with the requested ID could not be found or data is unavailable.
			</p>
			<a
				href="/private/students"
				class="mt-6 inline-block rounded bg-blue-600 px-6 py-2.5 text-xs leading-tight font-medium text-white uppercase shadow-md transition duration-150 ease-in-out hover:bg-blue-700 hover:shadow-lg focus:bg-blue-700 focus:shadow-lg focus:ring-0 focus:outline-none active:bg-blue-800 active:shadow-lg"
			>
				Return to Students List
			</a>
		</div>
	{/if}
</div>
