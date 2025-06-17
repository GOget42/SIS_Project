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
	<div class="mb-8 flex items-center justify-between">
		<h1 class="text-3xl font-bold text-gray-800">Students</h1>
		<button
			on:click={() => (creatingStudent = true)}
			class="flex items-center space-x-2 rounded-md bg-blue-600 px-4 py-2 font-bold text-white shadow-md transition duration-150 ease-in-out hover:bg-blue-700"
		>
			<svg
				xmlns="http://www.w3.org/2000/svg"
				viewBox="0 0 20 20"
				fill="currentColor"
				class="h-5 w-5"
				><path
					d="M10.75 4.75a.75.75 0 00-1.5 0v4.5h-4.5a.75.75 0 000 1.5h4.5v4.5a.75.75 0 001.5 0v-4.5h4.5a.75.75 0 000-1.5h-4.5v-4.5z"
				/></svg
			>
			<span>Add Student</span>
		</button>
	</div>

	{#if creatingStudent}
		<div class="mb-8 rounded-xl bg-white p-6 shadow-xl">
			<h2 class="mb-6 text-2xl font-semibold text-gray-700">Create New Student</h2>
			<form
				method="POST"
				action="?/createStudent"
				use:formSubmitIndicator={enhanceCreateForm}
				class="space-y-6"
			>
				<div>
					<label for="first_name" class="mb-1 block text-sm font-medium text-gray-700"
						>First Name</label
					>
					<input
						id="first_name"
						name="first_name"
						bind:value={newStudent.first_name}
						required
						class="mt-1 block w-full rounded-md border border-gray-300 px-4 py-2 shadow-sm focus:border-blue-500 focus:ring-blue-500 focus:outline-none sm:text-sm"
					/>
				</div>
				<div>
					<label for="last_name" class="mb-1 block text-sm font-medium text-gray-700"
						>Last Name</label
					>
					<input
						id="last_name"
						name="last_name"
						bind:value={newStudent.last_name}
						required
						class="mt-1 block w-full rounded-md border border-gray-300 px-4 py-2 shadow-sm focus:border-blue-500 focus:ring-blue-500 focus:outline-none sm:text-sm"
					/>
				</div>
				<div>
					<label for="email" class="mb-1 block text-sm font-medium text-gray-700">Email</label>
					<input
						id="email"
						name="email"
						type="email"
						bind:value={newStudent.email}
						required
						class="mt-1 block w-full rounded-md border border-gray-300 px-4 py-2 shadow-sm focus:border-blue-500 focus:ring-blue-500 focus:outline-none sm:text-sm"
					/>
				</div>
				<div>
					<label for="password" class="mb-1 block text-sm font-medium text-gray-700">Password</label
					>
					<input
						id="password"
						name="password"
						type="password"
						bind:value={newStudent.password}
						required
						class="mt-1 block w-full rounded-md border border-gray-300 px-4 py-2 shadow-sm focus:border-blue-500 focus:ring-blue-500 focus:outline-none sm:text-sm"
					/>
				</div>
				{#if form?.error && !form.message}
					<!-- Zeige generischen Fehler, wenn keine spezifische Nachricht vorhanden ist -->
					<p class="text-sm text-red-600">{form.error}</p>
				{/if}
				{#if form?.message}
					<p class:text-red-600={!!form.error} class:text-green-600={!form.error} class="text-sm">
						{form.message}
					</p>
				{/if}
				<div class="flex justify-end space-x-3 pt-2">
					<button
						type="button"
						on:click={() => {
							creatingStudent = false;
							newStudent = { first_name: '', last_name: '', email: '', password: '' };
						}}
						class="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:outline-none"
					>
						Cancel
					</button>
					<button
						type="submit"
						class="rounded-md border border-transparent bg-green-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-green-700 focus:ring-2 focus:ring-green-500 focus:ring-offset-2 focus:outline-none"
					>
						Save Student
					</button>
				</div>
			</form>
		</div>
	{/if}

	<div class="mb-6 rounded-md bg-gray-100 p-3 shadow">
		<strong class="mr-2 text-gray-700">Sort by:</strong>
		<a
			href={getSortLink('first_name')}
			on:click|preventDefault={() => applySort('first_name')}
			class="rounded-md px-2 py-1 text-blue-600 hover:text-blue-800 hover:underline {data.sortBy ===
			'first_name'
				? 'bg-blue-100 font-semibold'
				: ''}">First Name {getSortIndicator('first_name')}</a
		>
		<span class="mx-1 text-gray-400">|</span>
		<a
			href={getSortLink('last_name')}
			on:click|preventDefault={() => applySort('last_name')}
			class="rounded-md px-2 py-1 text-blue-600 hover:text-blue-800 hover:underline {data.sortBy ===
			'last_name'
				? 'bg-blue-100 font-semibold'
				: ''}">Last Name {getSortIndicator('last_name')}</a
		>
		<span class="mx-1 text-gray-400">|</span>
		<a
			href={getSortLink('email')}
			on:click|preventDefault={() => applySort('email')}
			class="rounded-md px-2 py-1 text-blue-600 hover:text-blue-800 hover:underline {data.sortBy ===
			'email'
				? 'bg-blue-100 font-semibold'
				: ''}">Email {getSortIndicator('email')}</a
		>
	</div>

	{#if data.students && data.students.length > 0}
		<ul class="space-y-4">
			{#each data.students as student (student.student_id)}
				<li
					class="rounded-xl bg-white p-6 shadow-lg transition-shadow duration-200 ease-in-out hover:shadow-2xl"
				>
					<div class="flex flex-col justify-between md:flex-row md:items-center">
						<div class="mb-4 md:mb-0">
							<span class="text-xl font-semibold text-gray-800">
								{student.first_name}
								{student.last_name}
							</span>
							<p class="text-sm text-gray-600">{student.email}</p>
						</div>
						<div class="flex items-center space-x-3">
							<a
								href={`/private/students/${student.student_id}`}
								class="rounded-md bg-gray-200 px-4 py-2 text-sm font-semibold text-gray-700 transition duration-150 ease-in-out hover:bg-gray-300"
							>
								View Details
							</a>
						</div>
					</div>
				</li>
			{/each}
		</ul>
	{:else}
		<div class="mt-8 rounded-lg bg-white p-6 text-center shadow-md">
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
					d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z"
				/>
			</svg>
			<p class="text-lg text-gray-500">No students found.</p>
			{#if !creatingStudent}
				<p class="mt-2 text-sm text-gray-400">
					You can add new students using the "Add Student" button above.
				</p>
			{/if}
		</div>
	{/if}
</div>
