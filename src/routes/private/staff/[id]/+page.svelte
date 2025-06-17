<script lang="ts">
	import { deleteAuthUser } from '$lib/api/auth.ts';
	import { goto, invalidateAll } from '$app/navigation';
	import type { ActionData, PageData } from './$types';
	import { formSubmitIndicator } from '$lib/actions/formSubmitIndicator';
	import type { ActionResult } from '@sveltejs/kit';
	import GradeDistributionInstructorChart from '$lib/components/GradeDistributionInstructorChart.svelte';
	import StudentsPerCourseChart from '$lib/components/StudentsPerCourseChart.svelte'; // Importiert das neue Diagramm

	export let data: PageData;
	export let form: ActionData;

	interface Assignment {
		assignment_id: string;
		assignment_name: string;
		due_date: string | null;
		weight: number | null;
	}

	interface CourseInfo {
		course_id: number;
		course_name: string;
		student_count?: number; // Hinzugefügt für die Anzahl der Studenten
	}

	interface StaffCourseAssignment {
		assignment_id: number; // Hält die course_id für den Svelte #each key (wahrscheinlich course_id gemeint)
		course: CourseInfo | null;
		assignments: Assignment[];
	}

	interface StaffMember {
		instructor_id: number;
		first_name: string;
		last_name: string;
		email: string;
		user_id: string | null;
		role?: string;
		department?: string;
	}

	interface AvailableTask {
		task_id: string;
		task_name: string;
		description?: string;
	}

	let staffMember: StaffMember | null = data.staffMember as StaffMember | null;
	let editing = false;
	let staffCourseAssignments: StaffCourseAssignment[] = data.assignedCourses as StaffCourseAssignment[] || [];
	let availableTasks: AvailableTask[] = data.availableTasks as AvailableTask[] || [];

	let studentEnrollmentChartData: Array<{ course_name: string; student_count: number }> = [];

	$: {
		staffMember = data.staffMember as StaffMember | null;
		availableTasks = data.availableTasks as AvailableTask[] || [];
		staffCourseAssignments = data.assignedCourses as StaffCourseAssignment[] || [];

		// Bereitet Daten für das StudentsPerCourseChart vor
		// Annahme: data.assignedCourses enthält jetzt Kurse mit course.student_count
		if (staffCourseAssignments) {
			studentEnrollmentChartData = staffCourseAssignments
				.filter(sca => sca.course && typeof sca.course.student_count === 'number')
				.map(sca => ({
					course_name: sca.course!.course_name,
					student_count: sca.course!.student_count!
				}));
		} else {
			studentEnrollmentChartData = [];
		}

		if (form?.success && form.action === '?/assignTask') {
			// form = null; // Optional: Formular nach Erfolg zurücksetzen
		}
	}

	async function handleDeleteStaffMember() {
		if (staffMember && confirm("Are you sure you want to delete this staff member? This action cannot be undone.")) {
			// Logik wird durch Server-Aktion gehandhabt
		}
	}

	const handleUpdateSubmit = () => {
		return async ({ result }: { result: ActionResult, update: () => Promise<void> }) => {
			if (result.type === 'success' && result.data?.success) {
				editing = false;
			}
			await invalidateAll();
		};
	};
</script>

<div class="container mx-auto p-4 sm:p-6 lg:p-8">
	<div class="flex justify-between items-center mb-8">
		<h1 class="text-3xl font-bold text-gray-800">Staff Member Detail</h1>
		<a href="/private/staff" class="text-blue-600 hover:text-blue-800 hover:underline transition duration-150 ease-in-out">
			&larr; Back to Staff List
		</a>
	</div>

	{#if staffMember}
		<div class="bg-white shadow-xl rounded-xl p-6 mb-8">
			{#if editing}
				<form method="POST" action="?/updateStaffMember" use:formSubmitIndicator={handleUpdateSubmit}>
					<input type="hidden" name="instructor_id" value={staffMember.instructor_id} />
					<div class="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
						<div>
							<label for="first_name" class="block text-sm font-medium text-gray-700 mb-1">First Name</label>
							<input type="text" name="first_name" id="first_name" bind:value={staffMember.first_name} class="mt-1 block w-full px-4 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm" required />
						</div>
						<div>
							<label for="last_name" class="block text-sm font-medium text-gray-700 mb-1">Last Name</label>
							<input type="text" name="last_name" id="last_name" bind:value={staffMember.last_name} class="mt-1 block w-full px-4 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm" required />
						</div>
						<div>
							<label for="email" class="block text-sm font-medium text-gray-700 mb-1">Email</label>
							<input type="email" name="email" id="email" bind:value={staffMember.email} class="mt-1 block w-full px-4 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm" required />
						</div>
					</div>
					<div class="flex justify-end space-x-3">
						<button type="button" on:click={() => editing = false} class="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500">
							Cancel
						</button>
						<button type="submit" class="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500">
							Save Changes
						</button>
					</div>
				</form>
				{#if form?.updateError && form.action === '?/updateStaffMember'}
					<p class="mt-4 text-sm text-red-600 bg-red-100 p-3 rounded-md">{form.message || 'An error occurred.'}</p>
				{/if}
			{:else}
				<div class="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4 mb-6">
					<div><strong class="font-semibold text-gray-700">Staff ID:</strong> <span class="text-gray-600">{staffMember.instructor_id}</span></div>
					<div><strong class="font-semibold text-gray-700">First Name:</strong> <span class="text-gray-600">{staffMember.first_name}</span></div>
					<div><strong class="font-semibold text-gray-700">Last Name:</strong> <span class="text-gray-600">{staffMember.last_name}</span></div>
					<div><strong class="font-semibold text-gray-700">Email:</strong> <span class="text-gray-600">{staffMember.email}</span></div>
					{#if staffMember.user_id}
						<div><strong class="font-semibold text-gray-700">Auth User ID:</strong> <span class="text-gray-600">{staffMember.user_id}</span></div>
					{/if}
				</div>
				<div class="flex justify-end space-x-3">
					<button on:click={() => editing = true} class="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 flex items-center space-x-2">
						<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" class="w-4 h-4"><path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z"></path></svg>
						<span>Edit</span>
					</button>
					<form method="POST" action="?/deleteStaffMember" on:submit={() => confirm("Are you sure you want to delete this staff member? This action cannot be undone.") || event.preventDefault()}>
						<input type="hidden" name="instructor_id" value={staffMember.instructor_id} />
						<button type="submit" class="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 flex items-center space-x-2">
							<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" class="w-4 h-4"><path fill-rule="evenodd" d="M8.75 1A2.75 2.75 0 006 3.75v.443c-.795.077-1.58.177-2.34.297A1.75 1.75 0 002.25 6H1.75a.75.75 0 000 1.5h.563c.015.04.032.078.049.117l.69 6.9A2.75 2.75 0 005.75 17h8.5A2.75 2.75 0 0017.002 14.517l.69-6.9c.017-.04.034-.077.049-.117h.563a.75.75 0 000-1.5h-.5a1.75 1.75 0 00-1.41-1.509c-.76-.12-1.545-.22-2.34-.297V3.75A2.75 2.75 0 0011.25 1h-2.5zM7.5 3.75c0-.966.784-1.75 1.75-1.75h1.5c.966 0 1.75.784 1.75 1.75v.443c-.563.065-1.14.14-1.716.226a.75.75 0 00-.568 0c-.575-.087-1.153-.16-1.716-.226V3.75zM4.249 6h11.502c.176.02.34.058.5.107l-.66 6.604a1.25 1.25 0 01-1.24 1.164H5.65a1.25 1.25 0 01-1.24-1.164L3.75 6.107A1.733 1.733 0 014.249 6z" clip-rule="evenodd"></path></svg>
							<span>Delete</span>
						</button>
					</form>
				</div>
			{/if}
		</div>

		<!-- Performance Overview Section -->
		{#if staffMember?.instructor_id}
			<div class="bg-white shadow-xl rounded-xl p-6 mb-8">
				<h2 class="text-2xl font-semibold text-gray-800 mb-6">Performance Overview</h2>
				<div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
					<div>
						<GradeDistributionInstructorChart instructor_id={staffMember.instructor_id.toString()} />
					</div>
					<div>
						{#if staffCourseAssignments.length > 0}
							<StudentsPerCourseChart courses={studentEnrollmentChartData} title="Student Enrollment per Course" />
						{:else}
							<div class="flex flex-col items-center justify-center h-full bg-gray-50 p-4 rounded-lg text-center">
								<svg xmlns="http://www.w3.org/2000/svg" class="h-10 w-10 text-gray-400 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
									<path stroke-linecap="round" stroke-linejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-2.277M17 20H7m10 0v-2c0-.653-.084-1.283-.24-1.88M7 16H5m2 0v-1a3 3 0 013-3h4a3 3 0 013 3v1m-9 4h10M5 20H3.28A1.99 1.99 0 011.5 18.225V18a2 2 0 012-2h1.161M12 12a3 3 0 100-6 3 3 0 000 6z" />
								</svg>
								<p class="text-md font-semibold text-gray-600">Student Enrollment Data</p>
								<p class="text-sm text-gray-500 mt-1">
									No courses assigned to this instructor to display enrollment data, or student counts are unavailable.
								</p>
							</div>
						{/if}
					</div>
				</div>
			</div>
		{/if}

		{#if staffMember?.instructor_id}
			<div class="bg-white shadow-xl rounded-xl p-6 mb-8">
				<h2 class="text-2xl font-semibold text-gray-800 mb-6">Assigned Courses & Assignments</h2>
				{#if staffCourseAssignments.length > 0}
					<ul class="space-y-6">
						{#each staffCourseAssignments as staffCourse (staffCourse.course?.course_id || Math.random())} <!-- Sicherstellen, dass ein eindeutiger Key verwendet wird -->
							<li class="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow duration-150 ease-in-out">
								{#if staffCourse.course}
									<div class="flex justify-between items-center mb-3">
										<a href={`/private/courses/${staffCourse.course.course_id}`} class="text-xl font-medium text-blue-600 hover:text-blue-800 hover:underline">
											{staffCourse.course.course_name}
										</a>
										<span class="text-sm text-gray-500">Course ID: {staffCourse.course.course_id}</span>
									</div>
									{#if typeof staffCourse.course.student_count === 'number'}
										<p class="text-sm text-gray-600 mb-2">Enrolled Students: <span class="font-semibold">{staffCourse.course.student_count}</span></p>
									{/if}

									{#if staffCourse.assignments && staffCourse.assignments.length > 0}
										<h4 class="text-md font-semibold text-gray-700 mb-2 mt-3 pt-3 border-t border-gray-200">Assignments in this Course:</h4>
										<ul class="list-disc list-inside space-y-1.5 pl-4 text-sm">
											{#each staffCourse.assignments as assignment (assignment.assignment_id)}
												<li>
													<span class="font-medium">{assignment.assignment_name}</span>
													{#if assignment.due_date}
														<span class="text-xs text-gray-500 italic"> (Due: {new Date(assignment.due_date).toLocaleDateString()})</span>
													{/if}
													{#if assignment.weight !== null && assignment.weight !== undefined}
														<span class="text-xs text-gray-500"> (Weight: {assignment.weight * 100}%)</span>
													{/if}
												</li>
											{/each}
										</ul>
									{:else}
										<p class="text-sm text-gray-500 mt-2 pt-2 border-t border-gray-100">No assignments recorded for this course.</p>
									{/if}
								{:else}
									<p class="text-sm text-gray-500">Course details not available.</p>
								{/if}
							</li>
						{/each}
					</ul>
				{:else}
					<div class="text-center py-6">
						<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-12 h-12 mx-auto text-gray-400 mb-3">
							<path stroke-linecap="round" stroke-linejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
						</svg>
						<p class="text-gray-500 text-lg">Not assigned to any courses or no courses found.</p>
					</div>
				{/if}
			</div>
		{/if}

	{:else}
		<div class="bg-white shadow-md rounded-lg p-6 text-center">
			<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-16 h-16 mx-auto text-red-500 mb-4">
				<path stroke-linecap="round" stroke-linejoin="round" d="M12 9v3.75m0-10.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.75c0 5.592 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.57-.598-3.75h-.152c-3.196 0-6.1-1.249-8.25-3.286zm0 13.036h.008v.008H12v-.008z" />
			</svg>
			<p class="text-xl text-red-600 font-semibold">Staff Member Not Found</p>
			<p class="text-gray-500 mt-2">The staff member with the requested ID could not be found or data is unavailable.</p>
			<a href="/private/staff" class="mt-6 inline-block px-6 py-2.5 bg-blue-600 text-white font-medium text-xs leading-tight uppercase rounded shadow-md hover:bg-blue-700 hover:shadow-lg focus:bg-blue-700 focus:shadow-lg focus:outline-none focus:ring-0 active:bg-blue-800 active:shadow-lg transition duration-150 ease-in-out">
				Return to Staff List
			</a>
		</div>
	{/if}
</div>