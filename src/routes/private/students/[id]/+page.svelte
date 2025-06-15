<script lang="ts">
  import { deleteStudent, updateStudent } from '$lib/api/students.ts';
  import { deleteAuthUser } from '$lib/api/auth.ts'; // Import deleteAuthUser
  import { goto, invalidateAll } from '$app/navigation';
  import ProgressChart from '$lib/components/ProgressChart.svelte';
  import GradeDistributionStudentChart from '$lib/components/GradeDistributionStudentChart.svelte';
  import type { ActionData, PageData } from './$types';
  import { formSubmitIndicator } from '$lib/actions/formSubmitIndicator';

  export let data: PageData;
  export let form: ActionData;

  // Interfaces basierend auf PageData (von +page.server.ts abgeleitet)
  interface Assignment {
    assignment_id: string;
    assignment_name: string;
    grade: number | string | null;
    weight: number | string | null;
    max_points: number | string | null;
    due_date: string | null;
  }

  interface CourseInfo {
    course_id: number;
    course_name: string;
  }

  interface CourseEnrollment {
    enrollment_id: number;
    courses: CourseInfo | null;
    assignments: Assignment[];
  }

  interface Student {
    student_id: number;
    first_name: string;
    last_name: string;
    email: string;
    user_id: string | null; // Added user_id to link to auth user
  }

  interface AvailableCourse {
    course_id: number;
    course_name: string;
  }

  let student: Student | null = data.student as Student | null;
  let editing = false;
  let enrolledCourses: CourseEnrollment[] = data.enrolledCourses || [];
  let availableCourses: AvailableCourse[] = data.availableCourses || [];

  $: {
    student = data.student as Student | null;
    availableCourses = data.availableCourses || [];
    enrolledCourses = data.enrolledCourses || [];
    if (form?.success && form.action === '?/enrollStudent') {
      // form = null; // oder spezifische Eigenschaften zurücksetzen
    }
  }

  async function handleDelete() {
    if (student && confirm("Are you sure you want to delete this student? This action cannot be undone.")) {
      const studentIdToDelete = student.student_id;
      const authUserIdToDelete = student.user_id; // Capture user_id for auth deletion

      try {
        // First, delete the student record from the public table
        await deleteStudent(studentIdToDelete);
        console.log(`Student record ${studentIdToDelete} deleted successfully.`);

        // If the student record deletion was successful and there's an auth user ID, delete the auth user
        if (authUserIdToDelete) {
          try {
            await deleteAuthUser(authUserIdToDelete);
            console.log(`Auth user ${authUserIdToDelete} deleted successfully.`);
          } catch (authError: any) {
            console.error(`Failed to delete auth user ${authUserIdToDelete}:`, authError);
            // Alert the user about the partial failure
            alert(`Student record was deleted, but failed to delete the associated authentication user: ${authError.message}. You might need to manually remove the user from the authentication system.`);
            // Even with auth deletion failure, proceed with navigation as student record is gone
          }
        }

        await invalidateAll();
        await goto('/private/students', { replaceState: true });

      } catch (dbError: any) { // This catches errors from deleteStudent primarily
        console.error(`Failed to delete student ${studentIdToDelete}:`, dbError);
        alert(`Failed to delete student: ${dbError.message}. This might be due to existing related data (like enrollments) or a server error. The authentication user (if any) was not attempted to be deleted. Check the console for more details.`);
      }
    }
  }

  const handleUpdateSubmit = () => {
    return async ({ result, update }) => {
      if (result.type === 'success' && result.data?.success) {
        editing = false;
      }
      await invalidateAll();
    };
  };
</script>

<div class="container mx-auto p-4 sm:p-6 lg:p-8">
  <div class="flex justify-between items-center mb-8">
    <h1 class="text-3xl font-bold text-gray-800">Student Detail</h1>
    <a href="/private/students" class="text-blue-600 hover:text-blue-800 hover:underline transition duration-150 ease-in-out">
      &larr; Back to Students List
    </a>
  </div>

  {#if student}
    <div class="bg-white shadow-xl rounded-xl p-6 mb-8">
      {#if editing}
        <form method="POST" action="?/updateStudent" use:formSubmitIndicator={handleUpdateSubmit}>
          <input type="hidden" name="student_id" value={student.student_id} />
          <div class="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <div>
              <label for="first_name" class="block text-sm font-medium text-gray-700 mb-1">First Name</label>
              <input type="text" name="first_name" id="first_name" bind:value={student.first_name} class="mt-1 block w-full px-4 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm" required />
            </div>
            <div>
              <label for="last_name" class="block text-sm font-medium text-gray-700 mb-1">Last Name</label>
              <input type="text" name="last_name" id="last_name" bind:value={student.last_name} class="mt-1 block w-full px-4 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm" required />
            </div>
            <div>
              <label for="email" class="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <input type="email" name="email" id="email" bind:value={student.email} class="mt-1 block w-full px-4 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm" required />
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
        {#if form?.updateError}
          <p class="mt-4 text-sm text-red-600 bg-red-100 p-3 rounded-md">{form.updateError}</p>
        {/if}
      {:else}
        <div class="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4 mb-6">
          <div><strong class="font-semibold text-gray-700">Student ID:</strong> <span class="text-gray-600">{student.student_id}</span></div>
          <div><strong class="font-semibold text-gray-700">First Name:</strong> <span class="text-gray-600">{student.first_name}</span></div>
          <div><strong class="font-semibold text-gray-700">Last Name:</strong> <span class="text-gray-600">{student.last_name}</span></div>
          <div><strong class="font-semibold text-gray-700">Email:</strong> <span class="text-gray-600">{student.email}</span></div>
          {#if student.user_id}
            <div><strong class="font-semibold text-gray-700">Auth User ID:</strong> <span class="text-gray-600">{student.user_id}</span></div>
          {/if}
        </div>
        <div class="flex justify-end space-x-3">
          <button on:click={() => editing = true} class="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 flex items-center space-x-2">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" class="w-4 h-4"><path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z"></path></svg>
            <span>Edit</span>
          </button>
          <button on:click={handleDelete} class="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 flex items-center space-x-2">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" class="w-4 h-4"><path fill-rule="evenodd" d="M8.75 1A2.75 2.75 0 006 3.75v.443c-.795.077-1.58.177-2.34.297A1.75 1.75 0 002.25 6H1.75a.75.75 0 000 1.5h.563c.015.04.032.078.049.117l.69 6.9A2.75 2.75 0 005.75 17h8.5A2.75 2.75 0 0017.002 14.517l.69-6.9c.017-.04.034-.077.049-.117h.563a.75.75 0 000-1.5h-.5a1.75 1.75 0 00-1.41-1.509c-.76-.12-1.545-.22-2.34-.297V3.75A2.75 2.75 0 0011.25 1h-2.5zM7.5 3.75c0-.966.784-1.75 1.75-1.75h1.5c.966 0 1.75.784 1.75 1.75v.443c-.563.065-1.14.14-1.716.226a.75.75 0 00-.568 0c-.575-.087-1.153-.16-1.716-.226V3.75zM4.249 6h11.502c.176.02.34.058.5.107l-.66 6.604a1.25 1.25 0 01-1.24 1.164H5.65a1.25 1.25 0 01-1.24-1.164L3.75 6.107A1.733 1.733 0 014.249 6z" clip-rule="evenodd"></path></svg>
            <span>Delete</span>
          </button>
        </div>
      {/if}
    </div>

    {#if student?.student_id}
      <div class="bg-white shadow-xl rounded-xl p-6 mb-8">
        <h2 class="text-2xl font-semibold text-gray-800 mb-6">Performance Overview</h2>
        <div class="grid grid-cols-1 xl:grid-cols-2 gap-6">
          <ProgressChart student_id={student.student_id.toString()} />
          <GradeDistributionStudentChart student_id={student.student_id.toString()} />
        </div>
      </div>
    {/if}

    <div class="bg-white shadow-xl rounded-xl p-6 mb-8">
      <h2 class="text-2xl font-semibold text-gray-800 mb-6">Enrolled Courses & Assignments</h2>
      {#if enrolledCourses.length > 0}
        <ul class="space-y-6">
          {#each enrolledCourses as enrollment (enrollment.enrollment_id)}
            <li class="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow duration-150 ease-in-out">
              {#if enrollment.courses}
                <div class="flex justify-between items-center mb-3">
                  <a href={`/private/courses/${enrollment.courses.course_id}`} class="text-xl font-medium text-blue-600 hover:text-blue-800 hover:underline">
                    {enrollment.courses.course_name}
                  </a>
                  <span class="text-sm text-gray-500">Course ID: {enrollment.courses.course_id}</span>
                </div>

                {#if enrollment.assignments && enrollment.assignments.length > 0}
                  <h4 class="text-md font-semibold text-gray-700 mb-2 mt-3 pt-3 border-t border-gray-200">Assignments:</h4>
                  <ul class="list-disc list-inside space-y-1.5 pl-4 text-sm">
                    {#each enrollment.assignments as assignment (assignment.assignment_id)}
                      <li>
                        <span class="font-medium">{assignment.assignment_name}</span>
                        {#if assignment.grade !== null && assignment.grade !== undefined}
                          - Grade: {assignment.grade}
                        {/if}
                        {#if assignment.due_date}
                          <span class="text-xs text-gray-500 italic"> (Due: {new Date(assignment.due_date).toLocaleDateString()})</span>
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
          <p class="text-gray-500 text-lg">Not enrolled in any courses yet.</p>
        </div>
      {/if}
    </div>

    <div class="bg-white shadow-xl rounded-xl p-6 mb-8">
      <h2 class="text-2xl font-semibold text-gray-800 mb-6">Available Courses to Enroll</h2>
      {#if form?.message && form.action === '?/enrollStudent'}
        <div class={`p-3 rounded-md mb-4 text-sm ${form.success ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
          {form.message}
          {#if form.error && !form.message}
            <span>Error: {form.error}</span>
          {/if}
        </div>
      {/if}
      {#if availableCourses.length > 0}
        <ul class="space-y-3">
          {#each availableCourses as course (course.course_id)}
            <li class="flex justify-between items-center p-3 border border-gray-200 rounded-md hover:bg-gray-50 transition-colors duration-150 ease-in-out">
              <div>
                <a href={`/private/courses/${course.course_id}`} class="font-medium text-blue-600 hover:text-blue-800 hover:underline">
                  {course.course_name}
                </a>
                <span class="text-sm text-gray-500 ml-2">(ID: {course.course_id})</span>
              </div>
              <form method="POST" action="?/enrollStudent" use:formSubmitIndicator>
                <input type="hidden" name="course_id" value={course.course_id} />
                <button type="submit" class="px-3 py-1.5 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500">
                  Enroll
                </button>
              </form>
            </li>
          {/each}
        </ul>
      {:else}
        <div class="text-center py-6">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-12 h-12 mx-auto text-gray-400 mb-3">
            <path stroke-linecap="round" stroke-linejoin="round" d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25" />
          </svg>
          <p class="text-gray-500 text-lg">No other courses available for enrollment at this time.</p>
        </div>
      {/if}
    </div>

  {:else}
    <div class="bg-white shadow-md rounded-lg p-6 text-center">
      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-16 h-16 mx-auto text-red-500 mb-4">
        <path stroke-linecap="round" stroke-linejoin="round" d="M12 9v3.75m0-10.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.75c0 5.592 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.57-.598-3.75h-.152c-3.196 0-6.1-1.249-8.25-3.286zm0 13.036h.008v.008H12v-.008z" />
      </svg>
      <p class="text-xl text-red-600 font-semibold">Student Not Found</p>
      <p class="text-gray-500 mt-2">The student with the requested ID could not be found or data is unavailable.</p>
      <a href="/private/students" class="mt-6 inline-block px-6 py-2.5 bg-blue-600 text-white font-medium text-xs leading-tight uppercase rounded shadow-md hover:bg-blue-700 hover:shadow-lg focus:bg-blue-700 focus:shadow-lg focus:outline-none focus:ring-0 active:bg-blue-800 active:shadow-lg transition duration-150 ease-in-out">
        Return to Students List
      </a>
    </div>
  {/if}
</div>