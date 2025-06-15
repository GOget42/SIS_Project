<script lang="ts">
    import { enhance } from '$app/forms';
    import { invalidateAll, goto } from '$app/navigation';
    import { page } from '$app/stores';
    import type { ActionData, PageData } from './$types';

    export let data: PageData;
    export let form: ActionData; // Für Rückmeldungen von Aktionen

    interface StaffMember {
        user_id: string; // Wichtig für Auth-Operationen
        first_name: string;
        last_name: string;
        email: string;
    }

    interface Instructor extends StaffMember {
        instructor_id: string;
    }

    interface Admin extends StaffMember {
        admin_id: string;
    }

    let creatingInstructor = false;
    let creatingAdmin = false;

    let newInstructor: Pick<Instructor, 'first_name' | 'last_name' | 'email'> & { password?: string } = {
        first_name: '',
        last_name: '',
        email: '',
        password: ''
    };
    let newAdmin: Pick<Admin, 'first_name' | 'last_name' | 'email'> & { password?: string } = {
        first_name: '',
        last_name: '',
        email: '',
        password: ''
    };

    // Aktuelle Sortierparameter aus data übernehmen
    let currentSortBy: string;
    let currentSortOrder: 'asc' | 'desc';

    $: {
        currentSortBy = data.sortBy;
        currentSortOrder = data.sortOrder;
    }

    function resetNewInstructorForm() {
        newInstructor = { first_name: '', last_name: '', email: '', password: '' };
    }

    function resetNewAdminForm() {
        newAdmin = { first_name: '', last_name: '', email: '', password: '' };
    }

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
    <h1 class="text-3xl font-bold text-gray-800 mb-8">Staff Management</h1>

    <!-- Sortierleiste -->
    <div class="mb-6 p-3 bg-gray-100 rounded-md shadow">
        <strong class="text-gray-700 mr-2">Sort by:</strong>
        <a href={getSortLink('first_name')} on:click|preventDefault={() => applySort('first_name')} class="text-blue-600 hover:text-blue-800 hover:underline px-2 py-1 rounded-md {currentSortBy === 'first_name' ? 'bg-blue-100 font-semibold' : ''}">First Name {getSortIndicator('first_name')}</a>
        <span class="text-gray-400 mx-1">|</span>
        <a href={getSortLink('last_name')} on:click|preventDefault={() => applySort('last_name')} class="text-blue-600 hover:text-blue-800 hover:underline px-2 py-1 rounded-md {currentSortBy === 'last_name' ? 'bg-blue-100 font-semibold' : ''}">Last Name {getSortIndicator('last_name')}</a>
        <span class="text-gray-400 mx-1">|</span>
        <a href={getSortLink('email')} on:click|preventDefault={() => applySort('email')} class="text-blue-600 hover:text-blue-800 hover:underline px-2 py-1 rounded-md {currentSortBy === 'email' ? 'bg-blue-100 font-semibold' : ''}">Email {getSortIndicator('email')}</a>
    </div>

    <!-- Instructors Section -->
    <div class="mb-12">
        <div class="flex justify-between items-center mb-6">
            <h2 class="text-2xl font-semibold text-gray-700">Instructors</h2>
            <button
              on:click={() => creatingInstructor = true}
              class="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-md shadow-md transition duration-150 ease-in-out flex items-center space-x-2"
            >
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" class="w-5 h-5"><path d="M10.75 4.75a.75.75 0 00-1.5 0v4.5h-4.5a.75.75 0 000 1.5h4.5v4.5a.75.75 0 001.5 0v-4.5h4.5a.75.75 0 000-1.5h-4.5v-4.5z" /></svg>
                <span>Add Instructor</span>
            </button>
        </div>

        {#if creatingInstructor}
            <div class="bg-white shadow-xl rounded-xl p-6 mb-8">
                <h3 class="text-xl font-semibold text-gray-700 mb-6">Create New Instructor</h3>
                <form
                  method="POST"
                  action="?/createInstructor"
                  use:enhance={() => {
                        return async ({ result }) => {
                            if (result.type === 'success' && result.data?.success) {
                                alert(result.data.message);
                                resetNewInstructorForm();
                                creatingInstructor = false;
                                await invalidateAll();
                            } else if (result.type === 'failure' && result.data?.error) {
                                alert(`Error: ${result.data.error}`);
                            } else if (result.type !== 'error') {
                                await invalidateAll();
                            }
                        };
                    }}
                  class="space-y-6"
                >
                    <div>
                        <label for="new_instructor_first_name" class="block text-sm font-medium text-gray-700 mb-1">First Name</label>
                        <input id="new_instructor_first_name" name="first_name" bind:value={newInstructor.first_name} placeholder="e.g., John" required class="mt-1 block w-full px-4 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm" />
                    </div>
                    <div>
                        <label for="new_instructor_last_name" class="block text-sm font-medium text-gray-700 mb-1">Last Name</label>
                        <input id="new_instructor_last_name" name="last_name" bind:value={newInstructor.last_name} placeholder="e.g., Doe" required class="mt-1 block w-full px-4 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm" />
                    </div>
                    <div>
                        <label for="new_instructor_email" class="block text-sm font-medium text-gray-700 mb-1">Email</label>
                        <input id="new_instructor_email" name="email" type="email" bind:value={newInstructor.email} placeholder="e.g., john.doe@example.com" required class="mt-1 block w-full px-4 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm" />
                    </div>
                    <div>
                        <label for="new_instructor_password" class="block text-sm font-medium text-gray-700 mb-1">Password</label>
                        <input id="new_instructor_password" name="password" type="password" bind:value={newInstructor.password} placeholder="Min. 8 characters" required class="mt-1 block w-full px-4 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm" />
                    </div>
                    <div class="flex justify-end space-x-3 pt-2">
                        <button type="button" on:click={() => { creatingInstructor = false; resetNewInstructorForm(); }} class="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500">
                            Cancel
                        </button>
                        <button type="submit" class="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500">
                            Save Instructor
                        </button>
                    </div>
                </form>
            </div>
        {/if}

        {#if data.instructors && data.instructors.length > 0}
            <ul class="space-y-4">
                {#each data.instructors as instructor (instructor.instructor_id)}
                    <li class="bg-white shadow-lg rounded-xl p-6 hover:shadow-2xl transition-shadow duration-200 ease-in-out">
                        <div class="flex flex-col md:flex-row justify-between md:items-center">
                            <div class="mb-4 md:mb-0">
                                <a href={`/private/staff/${instructor.instructor_id}`} class="text-lg font-semibold text-blue-700 hover:text-blue-800 hover:underline">
                                    {instructor.first_name} {instructor.last_name}
                                </a>
                                <p class="text-sm text-gray-600">{instructor.email}</p>
                            </div>
                            <div class="flex space-x-3 items-center">
                                <a href={`/private/staff/${instructor.instructor_id}`} class="text-sm bg-gray-200 hover:bg-gray-300 text-gray-700 font-semibold py-2 px-4 rounded-md transition duration-150 ease-in-out">
                                    View Details
                                </a>
                            </div>
                        </div>
                    </li>
                {/each}
            </ul>
        {:else if !creatingInstructor}
            <div class="bg-white shadow-md rounded-lg p-6 text-center mt-8">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-12 h-12 mx-auto text-gray-400 mb-3"><path stroke-linecap="round" stroke-linejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" /></svg>
                <p class="text-gray-500 text-lg">No instructors found.</p>
                <p class="text-sm text-gray-400 mt-2">You can add new instructors using the "Add Instructor" button above.</p>
            </div>
        {/if}
    </div>

    <!-- Admins Section -->
    <div class="mb-12">
        <div class="flex justify-between items-center mb-6">
            <h2 class="text-2xl font-semibold text-gray-700">Admins</h2>
            <button
              on:click={() => creatingAdmin = true}
              class="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-md shadow-md transition duration-150 ease-in-out flex items-center space-x-2"
            >
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" class="w-5 h-5"><path d="M10.75 4.75a.75.75 0 00-1.5 0v4.5h-4.5a.75.75 0 000 1.5h4.5v4.5a.75.75 0 001.5 0v-4.5h4.5a.75.75 0 000-1.5h-4.5v-4.5z" /></svg>
                <span>Add Admin</span>
            </button>
        </div>

        {#if creatingAdmin}
            <div class="bg-white shadow-xl rounded-xl p-6 mb-8">
                <h3 class="text-xl font-semibold text-gray-700 mb-6">Create New Admin</h3>
                <form
                  method="POST"
                  action="?/createAdmin"
                  use:enhance={() => {
                        return async ({ result }) => {
                           if (result.type === 'success' && result.data?.success) {
                                alert(result.data.message);
                                resetNewAdminForm();
                                creatingAdmin = false;
                                await invalidateAll();
                            } else if (result.type === 'failure' && result.data?.error) {
                                alert(`Error: ${result.data.error}`);
                            } else if (result.type !== 'error') {
                                await invalidateAll();
                            }
                        };
                    }}
                  class="space-y-6"
                >
                    <div>
                        <label for="new_admin_first_name" class="block text-sm font-medium text-gray-700 mb-1">First Name</label>
                        <input id="new_admin_first_name" name="first_name" bind:value={newAdmin.first_name} placeholder="e.g., Jane" required class="mt-1 block w-full px-4 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm" />
                    </div>
                    <div>
                        <label for="new_admin_last_name" class="block text-sm font-medium text-gray-700 mb-1">Last Name</label>
                        <input id="new_admin_last_name" name="last_name" bind:value={newAdmin.last_name} placeholder="e.g., Smith" required class="mt-1 block w-full px-4 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm" />
                    </div>
                    <div>
                        <label for="new_admin_email" class="block text-sm font-medium text-gray-700 mb-1">Email</label>
                        <input id="new_admin_email" name="email" type="email" bind:value={newAdmin.email} placeholder="e.g., jane.smith@example.com" required class="mt-1 block w-full px-4 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm" />
                    </div>
                    <div>
                        <label for="new_admin_password" class="block text-sm font-medium text-gray-700 mb-1">Password</label>
                        <input id="new_admin_password" name="password" type="password" bind:value={newAdmin.password} placeholder="Min. 8 characters" required class="mt-1 block w-full px-4 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm" />
                    </div>
                    <div class="flex justify-end space-x-3 pt-2">
                        <button type="button" on:click={() => { creatingAdmin = false; resetNewAdminForm(); }} class="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500">
                            Cancel
                        </button>
                        <button type="submit" class="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500">
                            Save Admin
                        </button>
                    </div>
                </form>
            </div>
        {/if}

        {#if data.admins && data.admins.length > 0}
            <ul class="space-y-4">
                {#each data.admins as admin (admin.admin_id)}
                    <li class="bg-white shadow-lg rounded-xl p-6 hover:shadow-2xl transition-shadow duration-200 ease-in-out">
                        <div class="flex flex-col md:flex-row justify-between md:items-center">
                            <div class="mb-4 md:mb-0">
                                <p class="text-lg font-semibold text-gray-800">{admin.first_name} {admin.last_name}</p>
                                <p class="text-sm text-gray-600">{admin.email}</p>
                            </div>
                            <div class="flex space-x-3 items-center">
                                <a href={`/private/staff/admin/${admin.admin_id}`} class="text-sm bg-gray-200 hover:bg-gray-300 text-gray-700 font-semibold py-2 px-4 rounded-md transition duration-150 ease-in-out">
                                    View Details
                                </a>
                            </div>
                        </div>
                    </li>
                {/each}
            </ul>
        {:else if !creatingAdmin}
            <div class="bg-white shadow-md rounded-lg p-6 text-center mt-8">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-12 h-12 mx-auto text-gray-400 mb-3"><path stroke-linecap="round" stroke-linejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" /></svg>
                <p class="text-gray-500 text-lg">No admins found.</p>
                <p class="text-sm text-gray-400 mt-2">You can add new admins using the "Add Admin" button above.</p>
            </div>
        {/if}
    </div>
</div>