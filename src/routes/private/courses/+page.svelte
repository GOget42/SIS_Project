<script lang="ts">
  import { enhance } from '$app/forms';
  import { invalidateAll, goto } from '$app/navigation';
  import { page } from '$app/stores';
  import type { PageData, ActionData } from './$types';

  export let data: PageData;
  export let form: ActionData;

  const user = data.user;
  const studentProfile = data.studentProfile;
  const role = user?.user_metadata?.role;

  let creatingCourse = false;
  let newCourse = {
    course_name: '',
    ects: '' as number | string,
    hours: '' as number | string,
    format: '',
    instructor_id: ''
  };

  // Aktuelle Sortierparameter aus data übernehmen
  let currentSortBy: string;
  let currentSortOrder: 'asc' | 'desc';

  $: {
    currentSortBy = data.sortBy;
    currentSortOrder = data.sortOrder;
  }

  $: if (form?.message && form.action === '?/createCourse') {
    if (form.success) {
      creatingCourse = false;
      newCourse = { course_name: '', ects: '', hours: '', format: '', instructor_id: '' };
      // invalidateAll(); // Wird durch enhance und erfolgreiche Formularverarbeitung behandelt
    }
  }
  // $: if (form?.message && (form.action === '?/enrollStudent' || form.action === '?/unenrollStudent')) {
  //   if (form.success) {
  //     // invalidateAll(); // Wird durch enhance und erfolgreiche Formularverarbeitung behandelt
  //   }
  // }


  function applySort(column: string) {
    let newSortOrder: 'asc' | 'desc' = 'asc';
    if (column === currentSortBy) {
      newSortOrder = currentSortOrder === 'asc' ? 'desc' : 'asc';
    }
    const newSearchParams = new URLSearchParams($page.url.searchParams);
    newSearchParams.set('sort_by', column);
    newSearchParams.set('sort_order', newSortOrder);
    goto(`${$page.url.pathname}?${newSearchParams.toString()}`, { keepFocus: true, invalidateAll: true });
  }

  function getSortIndicator(column: string): string {
    if (column === currentSortBy) {
      return currentSortOrder === 'asc' ? '↑' : '↓';
    }
    return '';
  }

  function getSortLink(column: string): string {
    const newSearchParams = new URLSearchParams($page.url.searchParams);
    let newSortOrder: 'asc' | 'desc' = 'asc';
    if (column === currentSortBy) {
      newSortOrder = currentSortOrder === 'asc' ? 'desc' : 'asc';
    }
    newSearchParams.set('sort_by', column);
    newSearchParams.set('sort_order', newSortOrder);
    return `${$page.url.pathname}?${newSearchParams.toString()}`;
  }

</script>

<div class="container mx-auto p-4 sm:p-6 lg:p-8">
  <div class="flex justify-between items-center mb-8">
    <h1 class="text-3xl font-bold text-gray-800">Courses</h1>
    {#if role === 'admin'}
      <button
        on:click={() => creatingCourse = true}
        class="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-md shadow-md transition duration-150 ease-in-out flex items-center space-x-2"
      >
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" class="w-5 h-5"><path d="M10.75 4.75a.75.75 0 00-1.5 0v4.5h-4.5a.75.75 0 000 1.5h4.5v4.5a.75.75 0 001.5 0v-4.5h4.5a.75.75 0 000-1.5h-4.5v-4.5z" /></svg>
        <span>Add Course</span>
      </button>
    {/if}
  </div>

  {#if creatingCourse && role === 'admin'}
    <div class="bg-white shadow-xl rounded-xl p-6 mb-8">
      <h2 class="text-2xl font-semibold text-gray-700 mb-6">Create New Course</h2>
      <form method="POST" action="?/createCourse" use:enhance={() => {
          return async ({ result }) => {
            await invalidateAll(); // Daten neu laden nach erfolgreicher Aktion
            if (result.type === 'success' && result.data?.success) {
                creatingCourse = false;
                newCourse = { course_name: '', ects: '', hours: '', format: '', instructor_id: '' };
            }
          };
      }} class="space-y-6">
        <div>
          <label for="course_name" class="block text-sm font-medium text-gray-700 mb-1">Course Name</label>
          <input id="course_name" name="course_name" bind:value={newCourse.course_name} placeholder="e.g., Introduction to Programming" required class="mt-1 block w-full px-4 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm" />
        </div>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label for="ects" class="block text-sm font-medium text-gray-700 mb-1">ECTS Credits</label>
            <input id="ects" name="ects" type="number" bind:value={newCourse.ects} placeholder="e.g., 5" required class="mt-1 block w-full px-4 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm" />
          </div>
          <div>
            <label for="hours" class="block text-sm font-medium text-gray-700 mb-1">Contact Hours</label>
            <input id="hours" name="hours" type="number" bind:value={newCourse.hours} placeholder="e.g., 45" required class="mt-1 block w-full px-4 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm" />
          </div>
        </div>
        <div>
          <label for="format" class="block text-sm font-medium text-gray-700 mb-1">Format</label>
          <input id="format" name="format" bind:value={newCourse.format} placeholder="e.g., Lecture, Seminar" required class="mt-1 block w-full px-4 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm" />
        </div>
        <div>
          <label for="instructor_id" class="block text-sm font-medium text-gray-700 mb-1">Instructor</label>
          <select id="instructor_id" name="instructor_id" bind:value={newCourse.instructor_id} required class="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md">
            <option value="" disabled>Select an instructor</option>
            {#if data.instructors && data.instructors.length > 0}
              {#each data.instructors as instructor (instructor.instructor_id)}
                <option value={instructor.instructor_id}>{instructor.first_name} {instructor.last_name}</option>
              {/each}
            {:else}
              <option value="" disabled>No instructors available</option>
            {/if}
          </select>
        </div>
        {#if form?.message && form.action === '?/createCourse'}
          <p class:text-red-600={form.error || !form.success} class:text-green-600={form.success} class="mt-2 text-sm">
            {form.message}
          </p>
        {/if}
        <div class="flex justify-end space-x-3 pt-2">
          <button type="button" on:click={() => { creatingCourse = false; newCourse = { course_name: '', ects: '', hours: '', format: '', instructor_id: '' }; }} class="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500">
            Cancel
          </button>
          <button type="submit" class="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500">
            Save Course
          </button>
        </div>
      </form>
    </div>
  {/if}

  <!-- Sortierleiste -->
  <div class="mb-6 p-3 bg-gray-100 rounded-md shadow">
    <strong class="text-gray-700 mr-2">Sort by:</strong>
    <a href={getSortLink('course_name')} on:click|preventDefault={() => applySort('course_name')} class="text-blue-600 hover:text-blue-800 hover:underline px-2 py-1 rounded-md {currentSortBy === 'course_name' ? 'bg-blue-100 font-semibold' : ''}">Name {getSortIndicator('course_name')}</a>
    <span class="text-gray-400 mx-1">|</span>
    <a href={getSortLink('ects')} on:click|preventDefault={() => applySort('ects')} class="text-blue-600 hover:text-blue-800 hover:underline px-2 py-1 rounded-md {currentSortBy === 'ects' ? 'bg-blue-100 font-semibold' : ''}">ECTS {getSortIndicator('ects')}</a>
    <span class="text-gray-400 mx-1">|</span>
    <a href={getSortLink('format')} on:click|preventDefault={() => applySort('format')} class="text-blue-600 hover:text-blue-800 hover:underline px-2 py-1 rounded-md {currentSortBy === 'format' ? 'bg-blue-100 font-semibold' : ''}">Format {getSortIndicator('format')}</a>
    <span class="text-gray-400 mx-1">|</span>
    <a href={getSortLink('instructor')} on:click|preventDefault={() => applySort('instructor')} class="text-blue-600 hover:text-blue-800 hover:underline px-2 py-1 rounded-md {currentSortBy === 'instructor' ? 'bg-blue-100 font-semibold' : ''}">Instructor {getSortIndicator('instructor')}</a>
  </div>

  {#if data.courses && data.courses.length > 0}
    <ul class="space-y-4">
      {#each data.courses as course (course.course_id)}
        <li class="bg-white shadow-lg rounded-xl p-6 hover:shadow-2xl transition-shadow duration-200 ease-in-out">
          <div class="flex flex-col md:flex-row justify-between md:items-center">
            <div class="mb-4 md:mb-0">
              <a href={`/private/courses/${course.course_id}`} class="text-xl font-semibold text-blue-700 hover:text-blue-800 hover:underline">
                {course.course_name}
              </a>
              <p class="text-sm text-gray-600">
                {course.ects} ECTS | Format: {course.format}
                {#if course.instructors}
                  | Instructor: {course.instructors.first_name} {course.instructors.last_name}
                {/if}
              </p>
            </div>

            <div class="flex space-x-3 items-center">
              {#if role === 'student' && studentProfile}
                {@const isEnrolled = data.enrolledCourseIds?.includes(course.course_id)}
                <form
                  method="POST"
                  action={isEnrolled ? `?/unenrollStudent` : `?/enrollStudent`}
                  use:enhance={() => {
                    return async ({ result }) => {
                      // Nach erfolgreicher Aktion Daten neu laden, um UI zu aktualisieren
                      if (result.type === 'success' || result.type === 'redirect') {
                         await invalidateAll();
                      }
                    };
                  }}
                  class="inline-block"
                >
                  <input type="hidden" name="course_id" value={course.course_id} />
                  <input type="hidden" name="student_id" value={studentProfile.student_id} />
                  <button
                    type="submit"
                    class:bg-red-500={isEnrolled}
                    class:hover:bg-red-700={isEnrolled}
                    class:bg-green-500={!isEnrolled}
                    class:hover:bg-green-700={!isEnrolled}
                    class="text-white font-semibold py-2 px-4 rounded-md text-sm shadow-md transition duration-150 ease-in-out"
                  >
                    {isEnrolled ? 'Unenroll' : 'Enroll'}
                  </button>
                </form>
              {/if}
              <a href={`/private/courses/${course.course_id}`} class="text-sm bg-gray-200 hover:bg-gray-300 text-gray-700 font-semibold py-2 px-4 rounded-md transition duration-150 ease-in-out">
                View Details
              </a>
              {#if role === 'admin'}
                <!-- Admin-specific actions like Edit/Delete could go here -->
              {/if}
            </div>
          </div>
          {#if form?.message && form.relatedCourseId == course.course_id && (form.action === '?/enrollStudent' || form.action === '?/unenrollStudent')}
            <p class:text-red-600={form.error || !form.success} class:text-green-600={form.success} class="mt-2 text-sm">
              {form.message}
            </p>
          {/if}
        </li>
      {/each}
    </ul>
  {:else}
    <div class="bg-white shadow-md rounded-lg p-6 text-center mt-8">
      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-12 h-12 mx-auto text-gray-400 mb-3">
        <path stroke-linecap="round" stroke-linejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
      </svg>
      <p class="text-gray-500 text-lg">No courses available at the moment.</p>
      {#if role === 'admin' && !creatingCourse}
        <p class="text-sm text-gray-400 mt-2">You can add new courses using the "Add Course" button above.</p>
      {/if}
    </div>
  {/if}
</div>