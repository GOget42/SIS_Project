<script lang="ts">
    import type { PageData as SvelteKitPageData } from './$types'; // SvelteKit's PageData
    import type { AppCoursePageData, CoursePageActionData, AppEnrollment, Assignment as AppAssignment, Student } from '$lib/app.types';
    import { enhance } from '$app/forms';
    import { invalidateAll } from '$app/navigation';
    import { onMount } from 'svelte';

    export let data: SvelteKitPageData & AppCoursePageData; // Merged PageData type
    export let form: CoursePageActionData | null = null;

    // Reactive variables from data prop
    $: course = data.course;
    $: enrollments = data.enrollments || [];
    $: availableStudents = data.availableStudents || [];
    $: user = data.user;

    // --- State for editing assignments ---
    let editingAssignmentId: string | null = null;
    let assignmentToEdit: Partial<AppAssignment> & { grade_str?: string, weight_str?: string, max_points_str?: string, due_date_str?: string } | null = null;

    // --- State for new assignments ---
    // Key is enrollment_id
    let newAssignmentData: { [key: number]: Partial<AppAssignment> & { grade_str?: string, weight_str?: string, max_points_str?: string, due_date_str?: string } } = {};

    function initializeNewAssignmentForms() {
        const initialData: { [key: number]: Partial<AppAssignment> & { grade_str?: string, weight_str?: string, max_points_str?: string, due_date_str?: string } } = {};
        enrollments.forEach((e: AppEnrollment) => {
            initialData[e.enrollment_id] = { assignment_name: '', grade_str: '', weight_str: '', max_points_str: '', due_date_str: '' };
        });
        newAssignmentData = initialData;
    }

    onMount(() => {
        initializeNewAssignmentForms();
    });

    // Re-initialize if enrollments change (e.g., student added/removed)
    $: if (enrollments) initializeNewAssignmentForms();


    function startEditAssignment(assignment: AppAssignment) {
        editingAssignmentId = assignment.assignment_id;
        assignmentToEdit = {
            ...assignment,
            grade_str: assignment.grade?.toString() ?? '',
            weight_str: assignment.weight !== null && assignment.weight !== undefined ? (assignment.weight * 100).toString() : '',
            max_points_str: assignment.max_points?.toString() ?? '',
            due_date_str: assignment.due_date ? assignment.due_date.split('T')[0] : ''
        };
    }

    function cancelEdit() {
        editingAssignmentId = null;
        assignmentToEdit = null;
    }

    $: {
        if (form) {
            if (form.addStudentSuccess || form.removeStudentSuccess || form.addAssignmentSuccess || form.updateAssignmentSuccess || form.deleteAssignmentSuccess) {
                invalidateAll();
                if (form.addAssignmentSuccess && form.enrollment_id_form) {
                    const enrollmentId = parseInt(form.enrollment_id_form);
                    if (newAssignmentData[enrollmentId]) {
                        newAssignmentData[enrollmentId] = { assignment_name: '', grade_str: '', weight_str: '', max_points_str: '', due_date_str: '' };
                    }
                }
                if (form.updateAssignmentSuccess) {
                    cancelEdit();
                }
                form = null;
            }
        }
    }

    function canManageCourse(currentUser: typeof data.user | null): boolean {
        return !!currentUser; // Simplified: if logged in, can manage. Adjust as needed.
    }

</script>

<svelte:head>
    <title>Course: {course?.course_name || 'Details'}</title>
</svelte:head>

<div class="container mx-auto p-4">
    {#if data.error}
        <p class="text-red-500 bg-red-100 p-3 rounded-md">Fehler: {data.error}</p>
    {:else if course}
        <header class="mb-6">
            <h1 class="text-3xl font-bold text-gray-800">{course.course_name}</h1>
            <p class="text-sm text-gray-600">
                ID: {course.course_id} | ECTS: {course.ects ?? 'N/A'} | Format: {course.format ?? 'N/A'} | Stunden: {course.hours ?? 'N/A'}
            </p>
        </header>

        {#if course.instructors}
            <section class="mb-6 p-4 bg-gray-50 rounded-md shadow">
                <h2 class="text-xl font-semibold text-gray-700 mb-2">Responsible Staff</h2>
                <p>
                    <a href={`/private/instructors/${course.instructors.instructor_id}`} class="text-blue-600 hover:underline">
                        {course.instructors.first_name} {course.instructors.last_name}
                    </a>
                    ({course.instructors.email})
                </p>
            </section>
        {/if}

        {#if canManageCourse(user)}
            <section class="mb-6 p-4 bg-white rounded-md shadow">
                <h2 class="text-xl font-semibold text-gray-700 mb-3">Add Student to Course</h2>
                {#if availableStudents.length > 0}
                    <form method="POST" action="?/addStudentToCourse" use:enhance>
                        <div class="flex items-end space-x-2">
                            <div class="flex-grow">
                                <label for="student_id_select" class="label">Select Student:</label>
                                <select name="student_id" id="student_id_select" class="input">
                                    {#each availableStudents as s (s.student_id)}
                                        <option value={s.student_id}>{s.first_name} {s.last_name} ({s.email})</option>
                                    {/each}
                                </select>
                            </div>
                            <button type="submit" class="btn-primary self-end">Add Student</button>
                        </div>
                        {#if form?.addStudentError}
                            <p class="text-sm text-red-600 mt-1">{form.addStudentError}</p>
                        {/if}
                    </form>
                {:else}
                    <p class="text-sm text-gray-500">All students are already enrolled or no students available.</p>
                {/if}
                {#if form?.addStudentSuccess}
                    <p class="text-sm text-green-600 bg-green-50 p-2 rounded-md my-2">{form.addStudentSuccess}</p>
                {/if}
            </section>
        {/if}

        <section>
            <h2 class="text-2xl font-semibold text-gray-700 mb-4 mt-8">Enrolled Students & Assignments</h2>
            {#if enrollments.length > 0}
                {#each enrollments as enrollment (enrollment.enrollment_id)}
                    {@const student = enrollment.students}
                    {@const enrollmentIdKey = enrollment.enrollment_id}
                    <div class="mb-8 p-5 bg-white rounded-lg shadow-lg">
                        <div class="flex justify-between items-center mb-3">
                            <div>
                                {#if student}
                                    <h3 class="text-xl font-semibold text-indigo-700">
                                        <a href={`/private/students/${student.student_id}`} class="hover:underline">
                                            {student.first_name} {student.last_name}
                                        </a>
                                        <span class="text-sm text-gray-500">({student.email})</span>
                                    </h3>
                                {:else}
                                    <h3 class="text-xl font-semibold text-gray-500">Student details missing (ID: {enrollment.student_id})</h3>
                                {/if}
                                <p class="text-xs text-gray-500">Enrolled: {new Date(enrollment.enrollment_date).toLocaleDateString()} (Enrollment ID: {enrollment.enrollment_id})</p>
                            </div>
                            {#if canManageCourse(user)}
                                <form method="POST" action="?/removeStudentFromCourse" use:enhance
                                      on:submit={(event) => {
                                          if (!confirm('Are you sure you want to remove this student and all their assignments for this course?')) {
                                              event.preventDefault();
                                          }
                                      }}
                                      class="ml-auto">
                                    <input type="hidden" name="enrollment_id" value={enrollment.enrollment_id}>
                                    <button type="submit" class="btn-secondary btn-sm bg-red-500 hover:bg-red-600 text-white">
                                        Remove Student
                                    </button>
                                </form>
                            {/if}
                        </div>
                        {#if form?.removeStudentError && parseInt(form?.enrollment_id_form || '-1') === enrollment.enrollment_id}
                            <p class="text-sm text-red-600 bg-red-50 p-2 rounded-md mb-2">{form.removeStudentError}</p>
                        {/if}

                        <!-- Assignments List for this student -->
                        <div class="mt-4 pl-4 border-l-2 border-indigo-100">
                            <h4 class="text-md font-semibold text-gray-600 mb-2">Assignments ({enrollment.assignments?.length || 0})</h4>
                            {#if enrollment.assignments && enrollment.assignments.length > 0}
                                <ul class="space-y-3">
                                    {#each enrollment.assignments as assignment (assignment.assignment_id)}
                                        <li class="p-3 bg-gray-50 rounded-md border border-gray-200">
                                            {#if editingAssignmentId === assignment.assignment_id && assignmentToEdit}
                                                <!-- Edit Assignment Form -->
                                                <form method="POST" action="?/updateAssignment" use:enhance
                                                      on:submit={() => { editingAssignmentId = null; /* Optimistic UI update or handled by invalidateAll */ }}>
                                                    <input type="hidden" name="assignment_id" value={assignment.assignment_id}>
                                                    <input type="hidden" name="enrollment_id" value={enrollment.enrollment_id}>
                                                    <div class="grid grid-cols-1 md:grid-cols-2 gap-3 mb-2">
                                                        <div>
                                                            <label class="label" for={`edit-assign-name-${assignment.assignment_id}`}>Name:</label>
                                                            <input class="input" id={`edit-assign-name-${assignment.assignment_id}`} name="assignment_name" bind:value={assignmentToEdit.assignment_name} required>
                                                        </div>
                                                        <div>
                                                            <label class="label" for={`edit-assign-grade-${assignment.assignment_id}`}>Grade (1-6):</label>
                                                            <input class="input" type="number" step="0.1" min="1" max="6" id={`edit-assign-grade-${assignment.assignment_id}`} name="grade" bind:value={assignmentToEdit.grade_str}>
                                                        </div>
                                                        <div>
                                                            <label class="label" for={`edit-assign-weight-${assignment.assignment_id}`}>Weight (%):</label>
                                                            <input class="input" type="number" step="1" min="0" max="100" id={`edit-assign-weight-${assignment.assignment_id}`} name="weight" bind:value={assignmentToEdit.weight_str}>
                                                        </div>
                                                        <div>
                                                            <label class="label" for={`edit-assign-maxpoints-${assignment.assignment_id}`}>Max Points:</label>
                                                            <input class="input" type="number" min="0" id={`edit-assign-maxpoints-${assignment.assignment_id}`} name="max_points" bind:value={assignmentToEdit.max_points_str}>
                                                        </div>
                                                        <div>
                                                            <label class="label" for={`edit-assign-duedate-${assignment.assignment_id}`}>Due Date:</label>
                                                            <input class="input" type="date" id={`edit-assign-duedate-${assignment.assignment_id}`} name="due_date" bind:value={assignmentToEdit.due_date_str}>
                                                        </div>
                                                    </div>
                                                    <div class="flex space-x-2 mt-2">
                                                        <button type="submit" class="btn-primary btn-sm">Save Changes</button>
                                                        <button type="button" class="btn-secondary btn-sm" on:click={cancelEdit}>Cancel</button>
                                                    </div>
                                                </form>
                                            {:else}
                                                <div class="flex justify-between items-start">
                                                    <div>
                                                        <p class="font-medium text-gray-700">{assignment.assignment_name}</p>
                                                        <p class="text-xs text-gray-500">
                                                            Grade: {assignment.grade ?? 'N/A'} |
                                                            Weight: {assignment.weight !== null ? (assignment.weight * 100).toFixed(0) + '%' : 'N/A'} |
                                                            Max Points: {assignment.max_points ?? 'N/A'} |
                                                            Due: {assignment.due_date ? new Date(assignment.due_date).toLocaleDateString() : 'N/A'}
                                                        </p>
                                                    </div>
                                                    {#if canManageCourse(user)}
                                                        <div class="flex space-x-1 flex-shrink-0 ml-2">
                                                            <button class="btn-secondary btn-sm" on:click={() => startEditAssignment(assignment)}>Edit</button>
                                                            <form method="POST" action="?/deleteAssignment" use:enhance
                                                                  on:submit={(event) => {
                                                                      if (!confirm('Are you sure you want to delete this assignment?')) {
                                                                          event.preventDefault();
                                                                      }
                                                                  }}>
                                                                <input type="hidden" name="assignment_id" value={assignment.assignment_id}>
                                                                <input type="hidden" name="enrollment_id" value={enrollment.enrollment_id}>
                                                                <button type="submit" class="btn-secondary btn-sm bg-red-500 hover:bg-red-600 text-white">Del</button>
                                                            </form>
                                                        </div>
                                                    {/if}
                                                </div>
                                            {/if}
                                            {#if form?.updateAssignmentError && form.assignment_id_form === assignment.assignment_id}
                                                <p class="text-sm text-red-600 mt-1">{form.updateAssignmentError}</p>
                                            {/if}
                                            {#if form?.deleteAssignmentError && form.assignment_id_form === assignment.assignment_id}
                                                <p class="text-sm text-red-600 mt-1">{form.deleteAssignmentError}</p>
                                            {/if}
                                        </li>
                                    {/each}
                                </ul>
                            {:else}
                                <p class="text-sm text-gray-500">No assignments for this student in this course yet.</p>
                            {/if}

                            <!-- Add New Assignment Form -->
                            {#if canManageCourse(user) && newAssignmentData[enrollmentIdKey]}
                                <div class="mt-6 pt-4 border-t border-gray-200">
                                    <h5 class="text-sm font-semibold text-gray-600 mb-2">Add New Assignment</h5>
                                    <form method="POST" action="?/addAssignment" use:enhance>
                                        <input type="hidden" name="enrollment_id" value={enrollmentIdKey}>
                                        <div class="grid grid-cols-1 md:grid-cols-2 gap-3 mb-2">
                                            <div>
                                                <label class="label" for={`new-assign-name-${enrollmentIdKey}`}>Name:</label>
                                                <input class="input" id={`new-assign-name-${enrollmentIdKey}`} name="assignment_name" bind:value={newAssignmentData[enrollmentIdKey].assignment_name} required>
                                            </div>
                                            <div>
                                                <label class="label" for={`new-assign-grade-${enrollmentIdKey}`}>Grade (1-6):</label>
                                                <input class="input" type="number" step="0.1" min="1" max="6" id={`new-assign-grade-${enrollmentIdKey}`} name="grade" bind:value={newAssignmentData[enrollmentIdKey].grade_str}>
                                            </div>
                                            <div>
                                                <label class="label" for={`new-assign-weight-${enrollmentIdKey}`}>Weight (%):</label>
                                                <input class="input" type="number" step="1" min="0" max="100" id={`new-assign-weight-${enrollmentIdKey}`} name="weight" bind:value={newAssignmentData[enrollmentIdKey].weight_str}>
                                            </div>
                                            <div>
                                                <label class="label" for={`new-assign-maxpoints-${enrollmentIdKey}`}>Max Points:</label>
                                                <input class="input" type="number" min="0" id={`new-assign-maxpoints-${enrollmentIdKey}`} name="max_points" bind:value={newAssignmentData[enrollmentIdKey].max_points_str}>
                                            </div>
                                            <div>
                                                <label class="label" for={`new-assign-duedate-${enrollmentIdKey}`}>Due Date:</label>
                                                <input class="input" type="date" id={`new-assign-duedate-${enrollmentIdKey}`} name="due_date" bind:value={newAssignmentData[enrollmentIdKey].due_date_str}>
                                            </div>
                                        </div>
                                        <button type="submit" class="btn-primary btn-sm">Add Assignment</button>
                                        {#if form?.addAssignmentError && parseInt(form?.enrollment_id_form || '-1') === enrollmentIdKey}
                                            <p class="text-sm text-red-600 mt-1">{form.addAssignmentError}</p>
                                        {/if}
                                    </form>
                                </div>
                            {/if}
                        </div>
                    </div>
                {/each}
            {:else}
                <p class="text-center text-gray-500">No students are currently enrolled in this course.</p>
            {/if}
        </section>

    {:else}
        <p class="text-center text-gray-500 mt-10">Loading course details or course not found...</p>
    {/if}
</div>

<style>
    @import "tailwindcss";
    .input {
        @apply block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm;
        margin-top: 0.25rem;
    }
    .label {
        @apply block text-sm font-medium text-gray-700;
    }
    .btn-primary {
        @apply inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500;
    }
    .btn-secondary {
        @apply inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500;
    }
    .btn-sm {
        @apply px-2.5 py-1.5 text-xs;
    }
</style>