<script lang="ts">
  import { deleteStudent, updateStudent } from '$lib/api/students.ts';
  import { goto, invalidateAll } from '$app/navigation';
  import StudentCharts from '$lib/components/StudentCharts.svelte';
  import type { ActionData, PageData } from './$types';
  import { enhance } from '$app/forms';

  export let data: PageData;
  export let form: ActionData;

  // Interfaces basierend auf PageData (von +page.server.ts abgeleitet)
  interface Assignment {
    assignment_id: string;
    assignment_name: string;
    grade: number | string | null; // string für potenzielle Formularbindungen, obwohl hier nicht bearbeitet
    weight: number | string | null;
    max_points: number | string | null;
    due_date: string | null;
  }

  interface CourseInfo { // Entspricht dem 'courses' Objekt in EnrolledCourseData
    course_id: number;
    course_name: string;
  }

  interface CourseEnrollment { // Entspricht EnrolledCourseData von Server
    enrollment_id: number;
    courses: CourseInfo | null; // Das eingebettete Kursobjekt
    assignments: Assignment[];
  }

  interface Student { // Annahme: student_id ist number
    student_id: number;
    first_name: string;
    last_name: string;
    email: string;
    enrollment_date: string; // YYYY-MM-DD
  }

  interface AvailableCourse { // Entspricht AvailableCourseData von Server
    course_id: number;
    course_name: string;
  }

  let student: Student | null = data.student ? { ...data.student, student_id: Number(data.student.student_id) } : null;
  let editing = false;
  let enrolledCourses: CourseEnrollment[] = data.enrolledCourses || [];
  let availableCourses: AvailableCourse[] = data.availableCourses || [];

  const user = data.user;

  $: {
    // student = data.student ? { ...data.student, student_id: Number(data.student.student_id) } : null;
    // Die obige Zeile kann zu Problemen führen, wenn data.student bereits korrekt typisiert ist.
    // Besser: Typen in PageData sollten bereits korrekt sein.
    student = data.student;
    availableCourses = data.availableCourses || [];
    enrolledCourses = data.enrolledCourses || [];
  }

  async function handleDelete() {
    if (student && confirm("Are you sure you want to delete this student?")) {
      try {
        // updateStudent erwartet string ID, getStudentById auch? Konsistenz ist wichtig.
        await deleteStudent(String(student.student_id));
        alert("Student deleted.");
        goto("/private/students");
      } catch (err: any) {
        console.error("Error deleting student:", err.message);
        alert("Failed to delete student: " + err.message);
      }
    }
  }

  async function handleUpdate() {
    if (student) {
      try {
        // student.enrollment_date muss im Format YYYY-MM-DD sein
        const studentToUpdate = {
          ...student,
          enrollment_date: student.enrollment_date ? student.enrollment_date.split('T')[0] : new Date().toISOString().split('T')[0]
        };
        await updateStudent(String(student.student_id), studentToUpdate);
        alert("Student updated.");
        editing = false;
        await invalidateAll();
      } catch (err: any) {
        console.error("Error updating student:", err.message);
        alert("Failed to update student: " + err.message);
      }
    }
  }

  // saveGrade Funktion wird entfernt, da Noten nun Teil von Assignments sind
  // und auf der Kursdetailseite verwaltet werden.

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
        student = data.student ? { ...data.student, student_id: Number(data.student.student_id) } : null;
      }}>Cancel</button>
    </form>
  {:else}
    <p><strong>Name:</strong> {student.first_name} {student.last_name}</p>
    <p><strong>Email:</strong> {student.email}</p>
    <p><strong>Enrollment Date:</strong> {student.enrollment_date ? new Date(student.enrollment_date).toLocaleDateString() : 'N/A'}</p>
    {#if user?.user_metadata?.role === 'admin' || user?.user_metadata?.role === 'instructor'}
      <button on:click={() => editing = true}>Edit</button>
      <button on:click={handleDelete}>Delete</button>
    {/if}
  {/if}

  <h2>Enrolled Courses & Assignments</h2>
  {#if enrolledCourses.length > 0}
    <ul>
      {#each enrolledCourses as enrollment (enrollment.enrollment_id)}
        <li>
          {#if enrollment.courses}
            <strong><a href={`/private/courses/${enrollment.courses.course_id}`}>{enrollment.courses.course_name}</a></strong>
            {#if enrollment.assignments && enrollment.assignments.length > 0}
              <ul style="margin-left: 20px; list-style-type: disc;">
                {#each enrollment.assignments as assignment (assignment.assignment_id)}
                  <li>
                    {assignment.assignment_name}:
                    {#if assignment.grade !== null} Grade: {assignment.grade} {/if}
                    {#if assignment.weight !== null} (Weight: {assignment.weight * 100}%) {/if}
                    {#if assignment.max_points !== null} (Max Points: {assignment.max_points}) {/if}
                    {#if assignment.due_date} (Due: {new Date(assignment.due_date).toLocaleDateString()}) {/if}
                  </li>
                {/each}
              </ul>
            {:else}
              <p style="margin-left: 20px;"><em>No assignments for this course.</em></p>
            {/if}
          {:else}
            <em>Course details not available.</em>
          {/if}
        </li>
      {/each}
    </ul>
  {:else}
    <p>This student is not enrolled in any courses.</p>
  {/if}

  <!-- Neues Formular zur Kurseinschreibung -->
  {#if availableCourses && availableCourses.length > 0 && (user?.user_metadata?.role === 'admin' || user?.user_metadata?.role === 'instructor')}
    <div style="margin-top: 20px;">
      <h3>Enroll in New Course</h3>
      <form
        method="POST"
        action="?/enrollStudent"
        use:enhance={() => {
          return async ({ result, update }) => {
            await invalidateAll(); // Einfacher als update() für diesen Fall
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
    <StudentCharts student_id={String(student.student_id)} />
  {/if}

{:else}
  <p>Student not found or data is loading...</p>
{/if}