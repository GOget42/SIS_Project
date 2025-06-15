<script lang="ts">
  import { formSubmitIndicator } from '$lib/actions/formSubmitIndicator'; // Hinzugefügter Import
  import { invalidateAll, goto } from '$app/navigation';
  import type { ActionResult } from '@sveltejs/kit';
  export let data: import('./$types').PageData;
  export let form: import('./$types').ActionData;

  interface Student {
    student_id: string;
    first_name: string;
    last_name: string;
    email: string;
    user_id: string; // Beibehalten, falls es an anderer Stelle benötigt wird, aber nicht mehr für Edit/Delete hier
  }

  // ActionResponseData wird für das Erstellen-Formular beibehalten
  interface ActionResponseData {
    message?: string;
    error?: string;
    first_name?: string;
    last_name?: string;
    email?: string;
  }

  let creatingStudent = false;
  let newStudent: Pick<Student, 'first_name' | 'last_name' | 'email'> & { password?: string } = {
    first_name: '',
    last_name: '',
    email: '',
    password: ''
  };

  // enhanceCreateForm bleibt bestehen
  const enhanceCreateForm = () => {
    return async ({ result }: { result: ActionResult; update: () => Promise<void> }) => {
      const formElement = document.querySelector('form[action="?/createStudent"]');
      if (result.type === 'success') {
        creatingStudent = false;
        newStudent = { first_name: '', last_name: '', email: '', password: '' };
        if (formElement instanceof HTMLFormElement) {
          formElement.reset(); // Formularfelder zurücksetzen
        }
      } else if (result.type === 'failure' && result.data) {
        const responseData = result.data as ActionResponseData;
        // Behalte die eingegebenen Werte bei, außer dem Passwort
        newStudent.first_name = responseData.first_name || newStudent.first_name;
        newStudent.last_name = responseData.last_name || newStudent.last_name;
        newStudent.email = responseData.email || newStudent.email;
        newStudent.password = ''; // Passwort immer löschen
      }
      await invalidateAll();
    };
  };

  // Sortierfunktionen bleiben bestehen
  function getSortLink(sortByField: string) {
    const currentSortBy = data.sortBy;
    const currentSortOrder = data.sortOrder;
    let newSortOrder = 'asc';
    if (currentSortBy === sortByField && currentSortOrder === 'asc') {
      newSortOrder = 'desc';
    }
    return `?sortBy=${sortByField}&sortOrder=${newSortOrder}`;
  }

  async function applySort(sortByField: string) {
    const currentSortBy = data.sortBy;
    const currentSortOrder = data.sortOrder;
    let newSortOrder = 'asc';
    if (currentSortBy === sortByField && currentSortOrder === 'asc') {
      newSortOrder = 'desc';
    }

    const newUrl = `?sortBy=${sortByField}&sortOrder=${newSortOrder}`;
    await goto(newUrl, {
      invalidateAll: true,
      keepFocus: true,
      noScroll: true
    });
  }

  function getSortIndicator(sortByField: string) {
    if (data.sortBy === sortByField) {
      return data.sortOrder === 'asc' ? '🔼' : '🔽';
    }
    return '';
  }

</script>

<div class="container mx-auto p-4 sm:p-6 lg:p-8">
  <div class="flex justify-between items-center mb-8">
    <h1 class="text-3xl font-bold text-gray-800">Students</h1>
    <button
      on:click={() => creatingStudent = true}
      class="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-md shadow-md transition duration-150 ease-in-out flex items-center space-x-2"
    >
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" class="w-5 h-5"><path d="M10.75 4.75a.75.75 0 00-1.5 0v4.5h-4.5a.75.75 0 000 1.5h4.5v4.5a.75.75 0 001.5 0v-4.5h4.5a.75.75 0 000-1.5h-4.5v-4.5z" /></svg>
      <span>Add Student</span>
    </button>
  </div>

  {#if creatingStudent}
    <div class="bg-white shadow-xl rounded-xl p-6 mb-8">
      <h2 class="text-2xl font-semibold text-gray-700 mb-6">Create New Student</h2>
      <form method="POST" action="?/createStudent" use:formSubmitIndicator={enhanceCreateForm}  class="space-y-6">
        <div>
          <label for="first_name" class="block text-sm font-medium text-gray-700 mb-1">First Name</label>
          <input id="first_name" name="first_name" bind:value={newStudent.first_name} required class="mt-1 block w-full px-4 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm" />
        </div>
        <div>
          <label for="last_name" class="block text-sm font-medium text-gray-700 mb-1">Last Name</label>
          <input id="last_name" name="last_name" bind:value={newStudent.last_name} required class="mt-1 block w-full px-4 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm" />
        </div>
        <div>
          <label for="email" class="block text-sm font-medium text-gray-700 mb-1">Email</label>
          <input id="email" name="email" type="email" bind:value={newStudent.email} required class="mt-1 block w-full px-4 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm" />
        </div>
        <div>
          <label for="password" class="block text-sm font-medium text-gray-700 mb-1">Password</label>
          <input id="password" name="password" type="password" bind:value={newStudent.password} required class="mt-1 block w-full px-4 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm" />
        </div>
        {#if form?.error && !form.message} <!-- Zeige generischen Fehler, wenn keine spezifische Nachricht vorhanden ist -->
          <p class="text-sm text-red-600">{form.error}</p>
        {/if}
        {#if form?.message}
          <p class:text-red-600={!!form.error} class:text-green-600={!form.error} class="text-sm">
            {form.message}
          </p>
        {/if}
        <div class="flex justify-end space-x-3 pt-2">
          <button type="button" on:click={() => { creatingStudent = false; newStudent = { first_name: '', last_name: '', email: '', password: ''}; }} class="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500">
            Cancel
          </button>
          <button type="submit" class="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500">
            Save Student
          </button>
        </div>
      </form>
    </div>
  {/if}

  <div class="mb-6 p-3 bg-gray-100 rounded-md shadow">
    <strong class="text-gray-700 mr-2">Sort by:</strong>
    <a href={getSortLink('first_name')} on:click|preventDefault={() => applySort('first_name')} class="text-blue-600 hover:text-blue-800 hover:underline px-2 py-1 rounded-md {data.sortBy === 'first_name' ? 'bg-blue-100 font-semibold' : ''}">First Name {getSortIndicator('first_name')}</a>
    <span class="text-gray-400 mx-1">|</span>
    <a href={getSortLink('last_name')} on:click|preventDefault={() => applySort('last_name')} class="text-blue-600 hover:text-blue-800 hover:underline px-2 py-1 rounded-md {data.sortBy === 'last_name' ? 'bg-blue-100 font-semibold' : ''}">Last Name {getSortIndicator('last_name')}</a>
    <span class="text-gray-400 mx-1">|</span>
    <a href={getSortLink('email')} on:click|preventDefault={() => applySort('email')} class="text-blue-600 hover:text-blue-800 hover:underline px-2 py-1 rounded-md {data.sortBy === 'email' ? 'bg-blue-100 font-semibold' : ''}">Email {getSortIndicator('email')}</a>
  </div>

  {#if data.students && data.students.length > 0}
    <ul class="space-y-4">
      {#each data.students as student (student.student_id)}
        <li class="bg-white shadow-lg rounded-xl p-6 hover:shadow-2xl transition-shadow duration-200 ease-in-out">
          <div class="flex flex-col md:flex-row justify-between md:items-center">
            <div class="mb-4 md:mb-0">
              <span class="text-xl font-semibold text-gray-800">
                {student.first_name} {student.last_name}
              </span>
              <p class="text-sm text-gray-600">{student.email}</p>
            </div>
            <div class="flex space-x-3 items-center">
              <a href={`/private/students/${student.student_id}`} class="text-sm bg-gray-200 hover:bg-gray-300 text-gray-700 font-semibold py-2 px-4 rounded-md transition duration-150 ease-in-out">
                View Details
              </a>
            </div>
          </div>
        </li>
      {/each}
    </ul>
  {:else}
    <div class="bg-white shadow-md rounded-lg p-6 text-center mt-8">
      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-12 h-12 mx-auto text-gray-400 mb-3">
        <path stroke-linecap="round" stroke-linejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
      </svg>
      <p class="text-gray-500 text-lg">No students found.</p>
      {#if !creatingStudent}
        <p class="text-sm text-gray-400 mt-2">You can add new students using the "Add Student" button above.</p>
      {/if}
    </div>
  {/if}
</div>