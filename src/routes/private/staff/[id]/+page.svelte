<script lang="ts">
	import { deleteStudent, updateStudent } from '$lib/api/students.js';
	// supabase-Client wird hier nicht mehr direkt für Noten benötigt
	import { goto, invalidateAll } from '$app/navigation';
	import StudentCharts from '$lib/components/StudentCharts.svelte';
	import type { ActionData, PageData } from './$types';
	import { enhance } from '$app/forms';

	export let data: PageData;
	export let form: ActionData;

	// Typ für einzelne Prüfungsleistung (Assignment)
	interface Assignment {
		assignment_id: string;
		assignment_name: string;
		grade: number | string | null;
		weight?: number | null;
		max_points?: number | null;
		due_date?: string | null;
	}

	interface CourseEnrollment {
		enrollment_id: string;
		course_id: string;
		course_name: string;
		ects?: number;
		assignments: Assignment[]; // Array von Prüfungsleistungen
	}
	interface Student {
		student_id: string;
		first_name: string;
		last_name: string;
		email: string;
		enrollment_date: string;
	}
	interface AvailableCourse {
		course_id: string;
		course_name: string;
	}

	let student: Student | null = data.student ? { ...data.student } : null;
	let editing = false;
	let enrolledCourses: CourseEnrollment[] = data.enrolledCourses || [];
	let availableCourses: AvailableCourse[] = data.availableCourses || [];

	const user = data.user;

	$: {
		student = data.student ? { ...data.student } : null;
		availableCourses = data.availableCourses || [];
		enrolledCourses = data.enrolledCourses || [];
	}


	async function handleDelete() {
		if (student && confirm("Are you sure you want to delete this student?")) {
			try {
				await deleteStudent(student.student_id);
				alert("Student deleted.");
				goto("/private/students");
			} catch (err: unknown) {
				let message = 'An unknown error occurred';
				if (err instanceof Error) {
					message = err.message;
				}
				console.error("Error deleting student:", message);
				alert("Failed to delete student: " + message);
			}
		}
	}

	async function handleUpdate() {
		if (student) {
			try {
				await updateStudent(student.student_id, student);
				alert("Student updated.");
				editing = false;
				await invalidateAll();
			} catch (err: unknown) {
				let message = 'An unknown error occurred';
				if (err instanceof Error) {
					message = err.message;
				}
				console.error("Error updating student:", message);
				alert("Failed to update student: " + message);
			}
		}
	}

	// Die Funktion saveGrade wird nicht mehr benötigt, da Noten über Assignments verwaltet werden.
	// async function saveGrade(...) { ... }

</script>

<h1>Student Detail</h1>

{#if student}
	{#if editing}
		<form on:submit|preventDefault={handleUpdate}>
			<label>First Name: <input bind:value={student.first_name} /></label><br />
			<label>Last Name: <input bind:value={student.last_name} /></label><br />
			<label>Email: <input type="email" bind:value={student.email} /></label><br />
			<label>Enrollment Date: <input type="date" bind:value={student.enrollment_date} /></label><br />
			<button type="submit">Save</button>
			<button type="button" on:click={() => {
        editing = false;
        student = data.student ? { ...data.student } : null;
      }}>Cancel</button>
		</form>
	{:else}
		<p><strong>Name:</strong> {student.first_name} {student.last_name}</p>
		<p><strong>Email:</strong> {student.email}</p>
		<p><strong>Enrollment Date:</strong> {student.enrollment_date}</p>
		<button on:click={() => editing = true}>Edit</button>
		<button on:click={handleDelete}>Delete</button>
	{/if}

	<h2>Enrolled Courses</h2>
	{#if enrolledCourses.length > 0}
		<ul>
			{#each enrolledCourses as course (course.enrollment_id)}
				<li>
					<a href={`/private/courses/${course.course_id}`}>{course.course_name}</a>
					<!-- Anzeige der einzelnen Assignments und deren Noten würde hier folgen -->
					{#if course.assignments && course.assignments.length > 0}
						<ul style="margin-left: 20px; font-size: 0.9em;">
							{#each course.assignments as assignment (assignment.assignment_id)}
								<li>
									{assignment.assignment_name}: {assignment.grade ?? 'No grade'}
									{#if assignment.weight}(Weight: {assignment.weight * 100}%){/if}
								</li>
							{/each}
						</ul>
					{:else}
						<p style="margin-left: 20px; font-size: 0.9em; color: grey;">No assignments for this course yet.</p>
					{/if}
					<!-- Das Input-Feld für die Gesamtnote wurde entfernt -->
				</li>
			{/each}
		</ul>
	{:else}
		<p>This student is not enrolled in any courses.</p>
	{/if}

	{#if availableCourses && availableCourses.length > 0 && (user?.user_metadata?.role === 'admin' || user?.user_metadata?.role === 'instructor')}
		<div style="margin-top: 20px;">
			<h3>Enroll in New Course</h3>
			<form
				method="POST"
				action="?/enrollStudent"
				use:enhance={() => {
                return async ({ result }) => { // 'update' Parameter entfernt
                    await invalidateAll();
                    if (result.type === 'failure' && result.data?.error) {
                        alert(`Error: ${result.data.error}`);
                    } else if (result.type === 'success' && result.data?.message) {
                        alert(result.data.message);
                    }
                };
            }}
			>
				<label for="course_id">Select Course:</label>
				<select name="course_id" id="course_id" required>
					{#each availableCourses as course (course.course_id)}
						<option value={course.course_id}>{course.course_name}</option>
					{/each}
				</select>
				<button type="submit" style="margin-left: 10px;">Enroll Student</button>
			</form>
			{#if form?.error}
				<p style="color: red;">{form.error}</p>
			{/if}
			{#if form?.message}
				<p style="color: green;">{form.message}</p>
			{/if}
		</div>
	{:else if user?.user_metadata?.role === 'admin' || user?.user_metadata?.role === 'instructor'}
		<p style="margin-top: 20px;">No other courses available for enrollment or student is enrolled in all courses.</p>
	{/if}


	{#if student?.student_id}
		<StudentCharts student_id={student.student_id} />
	{/if}

{:else}
	<p>Student not found or data is loading...</p>
{/if}