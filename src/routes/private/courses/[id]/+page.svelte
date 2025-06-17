<script lang="ts">
    import { enhance } from '$app/forms';
    import { invalidateAll } from '$app/navigation';
    import { page } from '$app/stores';
    import type { PageData, ActionData as ServerActionData } from './$types'; // Renamed to avoid conflict
    import { slide } from 'svelte/transition';
    import CourseLeaderboardChart from '$lib/components/CourseLeaderboardChart.svelte';
    import GradeDistributionCourseChart from '$lib/components/GradeDistributionCourseChart.svelte';
    import { formSubmitIndicator } from '$lib/actions/formSubmitIndicator'; // Added import

    // Explicitly type form to include potential outcomes from all actions
    export type PageActionData = ServerActionData & {
        message?: string; // General message from updateCourse, addAssignment, etc.
        addStudentSuccess?: string;
        addStudentError?: string;
        student_id_form?: string; // To repopulate form on error
        updatedAssignmentId?: string;
        markFinishedSuccess?: string; // Added for markCourseFinished
        markFinishedError?: string;   // Added for markCourseFinished
        actionResult?: string;        // Added for markCourseFinished
        // Add other specific error/success fields from other actions if needed
    };

    export let data: PageData;
    export let form: PageActionData | null = null; // form can be null initially

    interface Assignment {
        assignment_id: string;
        course_id: number | null;
        assignment_name: string;
        due_date: string | null;
        max_points: number | null;
        weight: number | null;
    }

    let { user, course, assignments, enrolledStudents, studentEnrollmentDetails, role, allStudentGradesForCourse, availableStudents } = data;

    let editingCourse = false;
    let creatingAssignment = false;
    let editingAssignment: Assignment | null = null;
    let showAddStudentForm = false;
    let selectedStudentToAddId: string = ''; // For the select input

    // Error message for new assignment weight sum validation
    let newAssignmentWeightSumError: string | null = null;

    let courseEditData = {
        course_name: course?.course_name || '',
        ects: course?.ects?.toString() || '',
        format: course?.format || '',
        hours: course?.hours?.toString() || '',
    };

    let newAssignmentData = {
        assignment_name: '',
        due_date: '',
        weight: '' // User inputs as 0-100
    };

    let assignmentEditData = {
        assignment_id: '',
        assignment_name: '',
        due_date: '',
        weight: ''
    };

    let studentGradesEditData: Array<{
        enrollment_id: number;
        student_id: number;
        student_name: string;
        grade: string;
        student_grade_id: number | null;
    }> = [];


    $: ({ user, course, assignments, enrolledStudents, studentEnrollmentDetails, role, allStudentGradesForCourse, availableStudents } = data);
    $: courseEditData = {
        course_name: course?.course_name || '',
        ects: course?.ects?.toString() || '',
        format: course?.format || '',
        hours: course?.hours?.toString() || '',
    };


    $: if (form?.success) {
        if (form.action === '?/updateCourse') editingCourse = false;
        if (form.action === '?/addAssignment') {
            creatingAssignment = false;
            newAssignmentData = { assignment_name: '', due_date: '', weight: '' };
            newAssignmentWeightSumError = null; // Clear error on success
        }
        if (form.action === '?/updateAssignment') {
            if (form.updatedAssignmentId === editingAssignment?.assignment_id) {
                // editingAssignment = null; // Keep form open if needed, or close
                // studentGradesEditData = [];
            }
        }
        if (form.action === '?/addStudent') {
            showAddStudentForm = false;
            selectedStudentToAddId = '';
        }
        // General success case, consider invalidateAll or specific resets
        if (form.action?.startsWith('?/')) {
            // invalidateAll(); // Potentially too broad, but ensures data refresh
        }
    } else if (form && !form.success && form.action === '?/addStudent') {
        // Keep form open on error, potentially repopulate selectedStudentToAddId if needed
        selectedStudentToAddId = form.student_id_form || '';
    }

    // Clear weight sum error when add assignment form is closed
    $: if (!creatingAssignment) {
        newAssignmentWeightSumError = null;
    }


    function formatDate(dateString: string | null | undefined, includeTime = false) {
        if (!dateString) return 'N/A';
        try {
            const date = new Date(dateString);
            if (isNaN(date.getTime())) return 'Invalid Date';
            if (includeTime) return date.toLocaleString();
            return date.toLocaleDateString();
        } catch (e) {
            console.error("Error formatting date:", dateString, e);
            return 'Invalid Date';
        }
    }

    function handleEditAssignment(assignment: Assignment) {
        editingAssignment = assignment;
        assignmentEditData = {
            assignment_id: assignment.assignment_id,
            assignment_name: assignment.assignment_name || '',
            due_date: assignment.due_date ? new Date(assignment.due_date).toISOString().substring(0, 10) : '',
            weight: assignment.weight !== null ? (assignment.weight * 100).toString() : ''
        };
        creatingAssignment = false;
        showAddStudentForm = false;
        newAssignmentWeightSumError = null; // Clear any pending error from add form

        if (data.enrolledStudents && data.allStudentGradesForCourse) {
            studentGradesEditData = data.enrolledStudents.map(enrollment => {
                const gradeInfo = data.allStudentGradesForCourse?.find(
                  sg => sg.enrollment_id === enrollment.enrollment_id && sg.assignment_id === assignment.assignment_id
                );
                return {
                    enrollment_id: enrollment.enrollment_id,
                    student_id: enrollment.students?.student_id || -1, // Fallback, should always exist
                    student_name: `${enrollment.students?.first_name || 'N/A'} ${enrollment.students?.last_name || 'N/A'}`,
                    grade: gradeInfo?.grade?.toString() || '',
                    student_grade_id: gradeInfo?.student_grade_id || null
                };
            });
        }
    }

    function cancelEditAssignment() {
        editingAssignment = null;
        studentGradesEditData = [];
    }

    async function handleDeleteAssignment(assignmentId: string) {
        if (confirm('Are you sure you want to delete this assignment? This action cannot be undone.')) {
            const formData = new FormData();
            formData.append('assignment_id', assignmentId);
            // Using fetch API directly for delete to simplify form handling for this case
            const response = await fetch('?/deleteAssignment', {
                method: 'POST',
                body: formData
            });
            // const result = await response.json(); // SvelteKit's enhance handles JSON parsing
            if (response.ok) { // Check if response is ok
                // form prop will be updated by enhance, triggering reactive updates
                await invalidateAll(); // Ensure data is fresh
            } else {
                // Handle error, perhaps show a notification
                // console.error("Failed to delete assignment", await response.json());
                alert("Failed to delete assignment. Check console for details.");
            }
        }
    }

    function toggleAddStudentForm() {
        showAddStudentForm = !showAddStudentForm;
        creatingAssignment = false; // Close other forms
        editingAssignment = null;
        newAssignmentWeightSumError = null; // Clear assignment error
        if (!showAddStudentForm) {
            selectedStudentToAddId = ''; // Reset selection when closing
            if (form?.addStudentError) form.addStudentError = undefined; // Clear previous error
            if (form?.addStudentSuccess) form.addStudentSuccess = undefined;
        }
    }

    $: canManageCourse = role === 'admin' || (role === 'instructor' && course?.instructors?.user_id === user?.id);

    function getAssignmentStatus(
      assignment: Assignment,
      enrolledCourseStudents: PageData['enrolledStudents'],
      courseGrades: PageData['allStudentGradesForCourse']
    ): 'upcoming' | 'needs grading' | 'done' | 'unknown' {
        if (!assignment.due_date) return 'unknown';
        const dueDate = new Date(assignment.due_date);
        const now = new Date();

        if (role === 'student') {
            if (data.studentEnrollmentDetails && data.studentEnrollmentDetails.assignments_grades) {
                const gradeInfo = data.studentEnrollmentDetails.assignments_grades.find(
                  (ag) => ag.assignments?.assignment_id === assignment.assignment_id
                );
                if (gradeInfo?.grade !== null && gradeInfo?.grade !== undefined) return 'done';
            }
            if (now > dueDate) return 'needs grading';
            return 'upcoming';
        } else if ((role === 'instructor' || role === 'admin') && enrolledCourseStudents && courseGrades) {
            if (enrolledCourseStudents.length === 0) {
                return 'done'; // No students, so nothing to grade.
            }

            let allStudentsGradedForThisAssignment = true;
            for (const enrollment of enrolledCourseStudents) {
                // Ensure enrollment and student data exist
                if (!enrollment?.students) {
                    // This case implies an issue with enrollment data integrity.
                    // Depending on desired behavior, could mark as not done or log an error.
                    // For now, assume if an enrollment exists, it's for a valid student to be graded.
                }
                const gradeRecord = courseGrades.find(
                  g => g.enrollment_id === enrollment.enrollment_id &&
                    g.assignment_id === assignment.assignment_id &&
                    g.grade !== null
                );
                if (!gradeRecord) {
                    allStudentsGradedForThisAssignment = false;
                    break;
                }
            }

            if (allStudentsGradedForThisAssignment) {
                return 'done';
            }
            if (now > dueDate) return 'needs grading';
            return 'upcoming';
        }
        return 'unknown';
    }

    function allAssignmentsGraded(
      assignments: PageData['assignments'],
      enrolledStudents: PageData['enrolledStudents'],
      allStudentGrades: PageData['allStudentGradesForCourse']
    ): boolean {
        if (!assignments || assignments.length === 0) return true; // Keine Aufgaben zu benoten
        if (!enrolledStudents || enrolledStudents.length === 0) return true; // Keine Studenten zum Benoten

        // Sicherstellen, dass allStudentGrades nicht null für die Prüfung ist
        if (!allStudentGrades) return false; // Wenn Notendaten fehlen, annehmen, dass nicht alle benotet sind

        for (const assignment of assignments) {
            for (const studentEnrollment of enrolledStudents) {
                // studentEnrollment.students kann null sein, wenn die Verknüpfung fehlschlägt
                if (!studentEnrollment.students) continue;

                const hasGrade = allStudentGrades.some(
                  grade =>
                    grade.assignment_id === assignment.assignment_id &&
                    grade.enrollment_id === studentEnrollment.enrollment_id &&
                    grade.grade !== null // Entscheidend ist, dass eine Note vorhanden ist
                );
                if (!hasGrade) {
                    // console.log(`Missing grade for student ${studentEnrollment.students?.student_id} on assignment ${assignment.assignment_id}`);
                    return false; // Dieser Student hat keine Note für diese Aufgabe
                }
            }
        }
        return true; // Alle Studenten haben Noten für alle Aufgaben
    }

    const handleMarkFinishedSubmit = async ({ cancel }: { cancel: () => void }) => {
        const assignmentsDone = allAssignmentsGraded(
          data.assignments,
          data.enrolledStudents,
          data.allStudentGradesForCourse
        );

        if (!assignmentsDone) {
            if (!window.confirm('Nicht alle Aufgaben wurden für alle Studierenden benotet. Möchten Sie den Kurs trotzdem als erledigt markieren?')) {
                cancel(); // Formularübermittlung verhindern
            }
        }
        // Wenn assignmentsDone true ist oder der Benutzer bestätigt hat, mit der Übermittlung fortfahren.
        // Nach der Übermittlung wird die load-Funktion erneut ausgeführt und `data` aktualisiert.
    };

    // Function to calculate total weight of existing assignments
    function calculateCurrentTotalWeight(existingAssignments: PageData['assignments']): number {
        if (!existingAssignments || existingAssignments.length === 0) {
            return 0;
        }
        return existingAssignments.reduce((sum, assign) => {
            if (assign && typeof assign.weight === 'number') {
                return sum + assign.weight;
            }
            return sum;
        }, 0);
    }

</script>

<div class="container mx-auto p-4 sm:p-6 lg:p-8">
    <div class="flex justify-between items-center mb-8">
        <h1 class="text-3xl font-bold text-gray-800">Course Details</h1>
        <a href="/private/courses" class="text-blue-600 hover:text-blue-800 hover:underline transition duration-150 ease-in-out">
            &larr; Back to Courses
        </a>
    </div>

    {#if course}
        <!-- Course Information Section -->
        <div class="bg-white shadow-xl rounded-xl p-6 mb-8">
            {#if editingCourse && canManageCourse}
                <form method="POST" action="?/updateCourse" use:enhance class="space-y-6">
                    <div>
                        <label for="course_name" class="block text-sm font-medium text-gray-700">Course Name</label>
                        <input type="text" id="course_name" name="course_name" bind:value={courseEditData.course_name} required class="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm">
                    </div>
                    <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                            <label for="ects" class="block text-sm font-medium text-gray-700">ECTS</label>
                            <input type="number" id="ects" name="ects" bind:value={courseEditData.ects} required class="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm">
                        </div>
                        <div>
                            <label for="format" class="block text-sm font-medium text-gray-700">Format</label>
                            <input type="text" id="format" name="format" bind:value={courseEditData.format} required class="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm">
                        </div>
                        <div>
                            <label for="hours" class="block text-sm font-medium text-gray-700">Hours</label>
                            <input type="number" id="hours" name="hours" bind:value={courseEditData.hours} required class="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm">
                        </div>
                    </div>
                    <div class="flex justify-end space-x-3">
                        <button type="button" on:click={() => editingCourse = false} class="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500">Cancel</button>
                        <button type="submit" class="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500">Save Changes</button>
                    </div>
                    {#if form?.action === '?/updateCourse' && form?.message && !form?.success}
                        <p class="text-sm text-red-600 bg-red-50 p-3 rounded-md">{form.message}</p>
                    {/if}
                </form>
            {:else}
                <div class="flex justify-between items-start">
                    <div>
                        <div class="flex items-center space-x-3 mb-1">
                            <h2 class="text-2xl font-semibold text-gray-800" title={`Course ID: ${course.course_id}`}>{course.course_name}</h2>
                            {#if course.active}
                                <span class="px-2.5 py-0.5 text-xs font-semibold rounded-full bg-green-100 text-green-800">Active</span>
                            {:else}
                                <span class="px-2.5 py-0.5 text-xs font-semibold rounded-full bg-red-100 text-red-800">Inactive</span>
                            {/if}
                        </div>
                        <p class="text-sm text-gray-500">
                            Instructor: {course.instructors?.first_name || 'N/A'} {course.instructors?.last_name || 'N/A'}
                            {#if course.instructors?.email}({course.instructors.email}){/if}
                        </p>
                    </div>
                    {#if canManageCourse && course.active} <!-- Nur anzeigen, wenn Kurs aktiv ist -->
                        <button on:click={() => editingCourse = true} class="text-sm bg-blue-500 hover:bg-blue-600 text-white font-semibold py-2 px-3 rounded-lg shadow transition duration-150 ease-in-out">
                            Edit Course
                        </button>
                    {/if}
                </div>
                <div class="mt-4 grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div><strong class="font-semibold text-gray-600">ECTS:</strong> <span class="text-gray-700">{course.ects}</span></div>
                    <div><strong class="font-semibold text-gray-600">Format:</strong> <span class="text-gray-700">{course.format}</span></div>
                    <div><strong class="font-semibold text-gray-600">Hours:</strong> <span class="text-gray-700">{course.hours}</span></div>
                </div>
            {/if}
        </div>

        <!-- Performance Overview Section -->
        <div class="bg-white shadow-xl rounded-xl p-6 mb-8">
            <h2 class="text-2xl font-semibold text-gray-800 mb-6">Performance Overview</h2>
            <div class="grid grid-cols-1 xl:grid-cols-2 gap-6">
                <CourseLeaderboardChart course_id="{course.course_id.toString()}" />
                <GradeDistributionCourseChart course_id={course.course_id.toString()} />
            </div>
        </div>

        <!-- Assignments Section -->
        <div class="bg-white shadow-xl rounded-xl p-6 mb-8">
            <div class="flex justify-between items-center mb-6">
                <h2 class="text-2xl font-semibold text-gray-800">Assignments</h2>
                {#if canManageCourse && course.active} <!-- Nur anzeigen, wenn Kurs aktiv ist -->
                    <button on:click={() => { creatingAssignment = true; editingAssignment = null; studentGradesEditData = []; newAssignmentWeightSumError = null; }} class="text-sm bg-green-500 hover:bg-green-600 text-white font-semibold py-2 px-4 rounded-lg shadow transition duration-150 ease-in-out">
                        Add Assignment
                    </button>
                {/if}
            </div>

            {#if creatingAssignment && canManageCourse && course.active}
                <div transition:slide={{ duration: 300 }}>
                    <h3 class="text-xl font-semibold text-gray-700 mb-4">Add New Assignment</h3>
                    <form method="POST" action="?/addAssignment" use:enhance={({ formData, cancel }) => {
                        newAssignmentWeightSumError = null; // Reset error on new submission attempt
                        const currentTotalWeight = calculateCurrentTotalWeight(data.assignments);
                        const newWeightInputString = formData.get('weight') as string | null;

                        if (newWeightInputString === null || newWeightInputString.trim() === '') {
                            newAssignmentWeightSumError = 'Weight is required and must be a number between 0 and 100.';
                            cancel();
                            return;
                        }
                        const newWeightInput = parseFloat(newWeightInputString);

                        if (isNaN(newWeightInput) || newWeightInput < 0 || newWeightInput > 100) {
                            newAssignmentWeightSumError = 'Weight must be a valid number between 0 and 100.';
                            cancel();
                            return;
                        }

                        const newWeightDecimal = newWeightInput / 100;
                        const epsilon = 0.00001; // For floating point comparison

                        if (currentTotalWeight + newWeightDecimal > 1 + epsilon) {
                            newAssignmentWeightSumError = `The sum of all assignment weights (currently ${(currentTotalWeight * 100).toFixed(0)}%) plus the new assignment's weight (${newWeightInput}%) would exceed 100%.`;
                            cancel();
                            return;
                        }

                        // If validation passes, allow submission.
                        return async ({ update }) => {
                            await update({ reset: false }); // Server action handles reset on success
                            // Reactive statements will handle UI changes
                        };
                    }} class="space-y-4 bg-gray-50 p-6 rounded-lg shadow">
                        <div>
                            <label for="new_assignment_name" class="block text-sm font-medium text-gray-700">Assignment Name</label>
                            <input type="text" id="new_assignment_name" name="assignment_name" bind:value={newAssignmentData.assignment_name} required class="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm">
                        </div>
                        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label for="new_due_date" class="block text-sm font-medium text-gray-700">Due Date</label>
                                <input type="date" id="new_due_date" name="due_date" bind:value={newAssignmentData.due_date} required class="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm">
                            </div>
                            <div>
                                <label for="new_weight" class="block text-sm font-medium text-gray-700">Weight (%)</label>
                                <input type="number" id="new_weight" name="weight" bind:value={newAssignmentData.weight} required min="0" max="100" placeholder="e.g., 20 for 20%" class="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm">
                            </div>
                        </div>
                         {#if newAssignmentWeightSumError}
                            <p class="text-sm text-red-600 bg-red-50 p-3 rounded-md mt-2">{newAssignmentWeightSumError}</p>
                        {/if}
                        {#if form?.action === '?/addAssignment' && form?.message && !form?.success && !newAssignmentWeightSumError}
                            <p class="text-sm text-red-600 bg-red-50 p-3 rounded-md mt-2">{form.message}</p>
                        {/if}
                        <div class="flex justify-end space-x-3 pt-2">
                            <button type="button" on:click={() => { creatingAssignment = false; newAssignmentWeightSumError = null; }} class="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md shadow-sm">Cancel</button>
                            <button type="submit" use:formSubmitIndicator class="px-4 py-2 text-sm font-medium text-white bg-green-600 hover:bg-green-700 rounded-md shadow-sm">Add Assignment</button>
                        </div>
                    </form>
                </div>
            {/if}


            {#if editingAssignment && canManageCourse && course.active} <!-- Nur anzeigen, wenn Kurs aktiv ist -->
                <div transition:slide={{ duration: 300 }}>
                    <h3 class="text-xl font-semibold text-gray-700 mb-4">Edit Assignment: <span class="font-normal">{editingAssignment.assignment_name}</span></h3>
                    <form method="POST" action="?/updateAssignment" use:enhance class="space-y-6 bg-gray-50 p-6 rounded-lg shadow">
                        <input type="hidden" name="assignment_id" bind:value={assignmentEditData.assignment_id}>
                        <div>
                            <label for="edit_assignment_name" class="block text-sm font-medium text-gray-700">Assignment Name</label>
                            <input type="text" id="edit_assignment_name" name="assignment_name" bind:value={assignmentEditData.assignment_name} required class="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm">
                        </div>
                        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label for="edit_due_date" class="block text-sm font-medium text-gray-700">Due Date</label>
                                <input type="date" id="edit_due_date" name="due_date" bind:value={assignmentEditData.due_date} required class="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm">
                            </div>
                            <div>
                                <label for="edit_weight" class="block text-sm font-medium text-gray-700">Weight (%)</label>
                                <input type="number" id="edit_weight" name="weight" bind:value={assignmentEditData.weight} required min="0" max="100" placeholder="e.g., 20 for 20%" class="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm">
                            </div>
                        </div>

                        {#if studentGradesEditData.length > 0}
                            <div class="pt-2">
                                <h4 class="text-md font-semibold text-gray-700 mb-3">Student Grades:</h4>
                                <input type="hidden" name="student_grades_count" value={studentGradesEditData.length}>
                                <ul class="space-y-2 max-h-60 overflow-y-auto bg-white p-3 rounded-md border">
                                    {#each studentGradesEditData as studentGrade, i (studentGrade.student_id)}
                                        <li class="flex items-center justify-between text-sm">
                                            <span class="text-gray-700">{studentGrade.student_name}</span>
                                            <input type="hidden" name={`enrollment_id_${i}`} value={studentGrade.enrollment_id}>
                                            <input type="number" name={`grade_${i}`} bind:value={studentGrade.grade}
                                                   min="1.0" max="6.0" step="0.25"
                                                   placeholder="Grade (1.0-6.0)"
                                                   class="w-32 px-2 py-1 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm">
                                        </li>
                                    {/each}
                                </ul>
                            </div>
                        {/if}

                        <div class="flex justify-end space-x-3 pt-2">
                            <button type="button" on:click={cancelEditAssignment} class="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md shadow-sm">Cancel</button>
                            <button type="submit" class="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md shadow-sm">Save Changes</button>
                        </div>
                        {#if form?.action === '?/updateAssignment' && form?.updatedAssignmentId === editingAssignment?.assignment_id && form?.message && !form?.success}
                            <p class="text-sm text-red-600 bg-red-50 p-3 rounded-md mt-2">{form.message}</p>
                        {/if}
                    </form>
                </div>
            {/if}


            {#if assignments && assignments.length > 0}
                <ul class="space-y-4 mt-6">
                    {#each assignments as assignment (assignment.assignment_id)}
                        {@const status = getAssignmentStatus(assignment, enrolledStudents, allStudentGradesForCourse)}
                        <li class="bg-gray-50 p-4 rounded-lg shadow hover:shadow-md transition-shadow duration-150 ease-in-out">
                            <div class="flex justify-between items-center">
                                <div>
                                    <h4 class="text-lg font-semibold text-blue-700">{assignment.assignment_name}</h4>
                                    <p class="text-xs text-gray-500">
                                        Due: {formatDate(assignment.due_date, true)} |
                                        <!-- Max Points: {assignment.max_points ?? 'N/A'} | Removed -->
                                        Weight: {assignment.weight !== null && assignment.weight !== undefined ? `${assignment.weight * 100}%` : 'N/A'}
                                    </p>
                                </div>
                                <div class="flex items-center space-x-2">
                                     <span class="px-2 py-0.5 text-xs font-semibold rounded-full
                                        {status === 'upcoming' ? 'bg-blue-100 text-blue-800' :
                                         status === 'needs grading' ? 'bg-yellow-100 text-yellow-800 animate-pulse' :
                                         status === 'done' ? 'bg-green-100 text-green-800' :
                                         'bg-gray-100 text-gray-800'}">
                                        {status === 'upcoming' ? 'Upcoming' : status === 'needs grading' ? 'Needs Grading' : status === 'done' ? 'Done' : 'Unknown'}
                                    </span>
                                    {#if canManageCourse && course.active} <!-- Nur anzeigen, wenn Kurs aktiv ist -->
                                        <button on:click={() => handleEditAssignment(assignment)} title="Edit Assignment" class="p-1.5 text-blue-600 hover:text-blue-800 hover:bg-blue-100 rounded-md transition-colors">
                                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" class="w-4 h-4"><path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z"></path></svg>
                                        </button>
                                        <button on:click={() => handleDeleteAssignment(assignment.assignment_id)} title="Delete Assignment" class="p-1.5 text-red-600 hover:text-red-800 hover:bg-red-100 rounded-md transition-colors">
                                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" class="w-4 h-4"><path fill-rule="evenodd" d="M8.75 1A2.75 2.75 0 006 3.75v.443c-.795.077-1.58.177-2.365.298a.75.75 0 10.23 1.482l.149-.022.841 10.518A2.75 2.75 0 007.596 19h4.807a2.75 2.75 0 002.742-2.53l.841-10.52.149.023a.75.75 0 00.23-1.482A41.03 41.03 0 0014 4.193V3.75A2.75 2.75 0 0011.25 1h-2.5zM10 4c.84 0 1.673.025 2.5.075V3.75c0-.69-.56-1.25-1.25-1.25h-2.5c-.69 0-1.25.56-1.25 1.25V4h2.5zM8.5 7.5a.75.75 0 00-1.5 0v7.5a.75.75 0 001.5 0v-7.5zm3 0a.75.75 0 00-1.5 0v7.5a.75.75 0 001.5 0v-7.5z" clip-rule="evenodd"></path></svg>
                                        </button>
                                    {/if}
                                </div>
                            </div>
                        </li>
                    {/each}
                </ul>
            {:else if !creatingAssignment && !editingAssignment}
                <p class="text-gray-500 italic">No assignments added yet for this course.</p>
            {/if}
        </div>

        <!-- Enrolled Students Section (Admin/Instructor) -->
        {#if canManageCourse}
            <div class="bg-white shadow-xl rounded-xl p-6 mb-8">
                <div class="flex justify-between items-center mb-6">
                    <h2 class="text-2xl font-semibold text-gray-700">Enrolled Students</h2>
                    {#if !showAddStudentForm && course.active} <!-- Nur anzeigen, wenn Kurs aktiv ist -->
                        <button on:click={toggleAddStudentForm} class="px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2">
                            Add Student
                        </button>
                    {/if}
                </div>

                {#if showAddStudentForm && course.active} <!-- Nur anzeigen, wenn Kurs aktiv ist -->
                    <div class="mb-6 p-4 border border-gray-200 rounded-lg bg-gray-50" transition:slide>
                        <h3 class="text-lg font-medium text-gray-900 mb-3">Add New Student to Course</h3>
                        <form method="POST" action="?/addStudent" use:enhance={() => {
                            return async ({ update }) => {
                                await update({ reset: false }); // Prevent form reset by default, handle manually or let SvelteKit manage based on success
                                if (form?.success && form.action === '?/addStudent') {
                                   showAddStudentForm = false;
                                   selectedStudentToAddId = '';
                                   await invalidateAll(); // Refresh all data
                                } else if (form && !form.success && form.action === '?/addStudent') {
                                    // Error occurred, form remains open, error message is shown
                                    // selectedStudentToAddId might be repopulated from form.student_id_form if set by server
                                }
                            };
                        }}>
                            <div class="mb-4">
                                <label for="student_id" class="block text-sm font-medium text-gray-700 mb-1">Select Student:</label>
                                {#if availableStudents && availableStudents.length > 0}
                                    <select name="student_id" id="student_id" bind:value={selectedStudentToAddId}
                                            class="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md">
                                        <option value="" disabled>-- Select a student --</option>
                                        {#each availableStudents as student (student.student_id)}
                                            <option value={student.student_id}>
                                                {student.first_name} {student.last_name} ({student.email})
                                            </option>
                                        {/each}
                                    </select>
                                {:else if availableStudents && availableStudents.length === 0 }
                                    <p class="text-sm text-gray-500 mt-1">All students are already enrolled or no students available.</p>
                                {:else}
                                    <p class="text-sm text-gray-500 mt-1">Loading available students...</p>
                                {/if}
                            </div>
                            <div class="flex items-center justify-end space-x-3">
                                <button type="button" on:click={toggleAddStudentForm} class="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-400 focus:ring-offset-2">
                                    Cancel
                                </button>
                                <button type="submit"
                                        class="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                                        disabled={!selectedStudentToAddId || (availableStudents && availableStudents.length === 0)}>
                                    Add Selected Student
                                </button>
                            </div>
                        </form>
                        {#if form?.addStudentError && showAddStudentForm}
                            <p class="mt-2 text-sm text-red-600">{form.addStudentError}</p>
                        {/if}
                    </div>
                {/if}


                {#if enrolledStudents && enrolledStudents.length > 0}
                    <ul class="space-y-3">
                        {#each enrolledStudents as enrollment (enrollment.enrollment_id)}
                            <li class="p-3 bg-gray-50 rounded-md shadow-sm flex justify-between items-center">
                                <div>
                                    <a href={`/private/students/${enrollment.students?.student_id}`} class="font-medium text-blue-600 hover:underline hover:text-blue-800">
                                        {enrollment.students?.first_name || 'N/A'} {enrollment.students?.last_name || 'N/A'}
                                    </a>
                                    <span class="text-sm text-gray-500 ml-2">({enrollment.students?.email || 'No email'})</span>
                                </div>
                                <!-- Placeholder for "Remove Student" button or other actions -->
                                <!--
                                <button class="text-red-500 hover:text-red-700 text-sm">
                                    Remove
                                </button>
                                -->
                            </li>
                        {/each}
                    </ul>
                {:else if !showAddStudentForm}
                    <p class="text-gray-500 text-center py-4">No students are currently enrolled in this course.</p>
                {/if}
            </div>
        {/if}

        <!-- Student's Enrollment Details & Grades (Student) -->
        {#if role === 'student' && studentEnrollmentDetails}
            <div class="bg-white shadow-xl rounded-xl p-6 mb-8">
                <h2 class="text-2xl font-semibold text-gray-800 mb-6">My Enrollment & Grades</h2>
                <p class="text-gray-700 mb-2"><strong class="font-semibold">Student:</strong> {studentEnrollmentDetails.students?.first_name} {studentEnrollmentDetails.students?.last_name}</p>
                <p class="text-gray-700 mb-4"><strong class="font-semibold">Enrollment Date:</strong> {formatDate(studentEnrollmentDetails.enrollment_date)}</p>

                <h3 class="text-xl font-semibold text-gray-700 mt-6 mb-4">My Grades:</h3>
                {#if studentEnrollmentDetails.assignments_grades && studentEnrollmentDetails.assignments_grades.length > 0}
                    <ul class="space-y-3">
                        {#each studentEnrollmentDetails.assignments_grades as gradeItem (gradeItem.student_grade_id)}
                            <li class="p-3 bg-gray-50 rounded-md shadow-sm">
                                <div class="flex justify-between items-center">
                                    <span class="font-medium text-gray-700">{gradeItem.assignments.assignment_name}</span>
                                    {#if gradeItem.grade !== null}
                                        {@const gradeValue = gradeItem.grade}
                                        <!-- {@const maxPointsForColor = gradeItem.assignments.max_points || 6}  Removed as max_points might not be consistently available or used for this color logic -->
                                        <span class="px-3 py-1 text-sm font-semibold rounded-full
                                            {gradeValue >= 5 ? 'bg-green-100 text-green-800' :
                                            gradeValue >= 4 ? 'bg-yellow-100 text-yellow-800' :
                                            gradeValue >= 3.5 ? 'bg-orange-100 text-orange-800' :
                                            gradeValue >= 3.0 ? 'bg-red-100 text-red-700' :
                                            'bg-red-200 text-red-800'}">
                                            Grade: {gradeItem.grade.toFixed(2)}
                                        </span>
                                    {:else}
                                        <span class="px-3 py-1 text-sm text-gray-500 bg-gray-100 rounded-full">Not Graded</span>
                                    {/if}
                                </div>
                                <p class="text-xs text-gray-500 mt-1">
                                    Due: {formatDate(gradeItem.assignments.due_date, true)} |
                                    Weight: {gradeItem.assignments.weight !== null ? `${(gradeItem.assignments.weight * 100).toFixed(0)}%` : 'N/A'}
                                </p>
                                {#if gradeItem.submission_date}
                                    <p class="text-xs text-gray-500 mt-1">Submitted: {formatDate(gradeItem.submission_date, true)}</p>
                                {/if}
                                {#if gradeItem.feedback}
                                    <p class="text-sm text-gray-600 mt-2 pt-2 border-t border-gray-200">
                                        <strong class="font-medium">Feedback:</strong> {gradeItem.feedback}
                                    </p>
                                {/if}
                            </li>
                        {/each}
                    </ul>
                {:else}
                    <p class="text-gray-500 italic">No grades recorded yet.</p>
                {/if}
            </div>
        {:else if role === 'student' && !studentEnrollmentDetails && course}
            <div class="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-8 rounded-md">
                <div class="flex">
                    <div class="flex-shrink-0">
                        <svg class="h-5 w-5 text-yellow-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                            <path fill-rule="evenodd" d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495zM10 5a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0v-3.5A.75.75 0 0110 5zm0 9a1 1 0 100-2 1 1 0 000 2z" clip-rule="evenodd" />
                        </svg>
                    </div>
                    <div class="ml-3">
                        <p class="text-sm text-yellow-700">
                            You are not currently enrolled in this course. Please contact the instructor or an administrator if you believe this is an error.
                        </p>
                    </div>
                </div>
            </div>
        {/if}

        <!-- Course Administration Section -->
        {#if (data.role === 'admin' || (data.role === 'instructor' && data.course?.instructors?.user_id === $page.data.user?.id)) && data.course?.active}
            <div class="mt-8 mb-8 p-6 bg-gray-50 rounded-lg shadow-md">
                <h3 class="text-xl font-semibold text-gray-800 mb-4">Kursverwaltung</h3>
                <form method="POST" action="?/markCourseFinished" use:enhance={handleMarkFinishedSubmit}>
                    <button type="submit"
                            class="px-6 py-2.5 bg-orange-600 text-white font-medium text-sm leading-tight uppercase rounded shadow-md hover:bg-orange-700 hover:shadow-lg focus:bg-orange-700 focus:shadow-lg focus:outline-none focus:ring-0 active:bg-orange-800 active:shadow-lg transition duration-150 ease-in-out">
                        Kurs als abgeschlossen markieren
                    </button>
                </form>
                {#if form?.actionResult === 'markCourseFinished'}
                    {#if form?.markFinishedSuccess}
                        <p class="text-green-600 mt-2">{form.markFinishedSuccess}</p>
                    {/if}
                    {#if form?.markFinishedError}
                        <p class="text-red-600 mt-2">{form.markFinishedError}</p>
                    {/if}
                {/if}
            </div>
        {/if}

    {:else if !data.error}
        <div class="bg-white shadow-md rounded-lg p-6 text-center">
            <p class="text-xl text-gray-600 font-semibold">Loading course details...</p>
            <div class="mt-4 animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
        </div>
    {:else}
        <div class="bg-white shadow-md rounded-lg p-6 text-center">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-16 h-16 mx-auto text-red-500 mb-4">
                <path stroke-linecap="round" stroke-linejoin="round" d="M12 9v3.75m0-10.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.75c0 5.592 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.57-.598-3.75h-.152c-3.196 0-6.1-1.249-8.25-3.286zm0 13.036h.008v.008H12v-.008z" />
            </svg>
            <p class="text-xl text-red-600 font-semibold">Course Not Found or Error</p>
            <p class="text-gray-500 mt-2">{data.error?.message || 'The course with the requested ID could not be found or an error occurred.'}</p>
            <a href="/private/courses" class="mt-6 inline-block px-6 py-2.5 bg-blue-600 text-white font-medium text-xs leading-tight uppercase rounded shadow-md hover:bg-blue-700 hover:shadow-lg focus:bg-blue-700 focus:shadow-lg focus:outline-none focus:ring-0 active:bg-blue-800 active:shadow-lg transition duration-150 ease-in-out">
                Return to Courses
            </a>
        </div>
    {/if}
</div>