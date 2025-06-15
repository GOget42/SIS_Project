<script lang="ts">
	export let data: import('./$types').LayoutData;

	import { user as userStore } from '$lib/stores/auth';
	import { goto } from '$app/navigation';
	import { onMount } from 'svelte';
	import '../app.css';
	import { navigating } from '$app/stores'; // Importieren des navigating Stores
	import LoadingIndicator from '$lib/components/LoadingIndicator.svelte'; // Importieren der Komponente
	import { isFormSubmitting } from '$lib/stores/formLoadingStore'; // Hinzugefügter Import

	$: {
		if (data) {
			// console.log('[+layout.svelte] Reactive update: data.user changed. New user ID from server:', data.user?.id);
			const currentStoreValue = $userStore;
			if (
				data.user?.id !== currentStoreValue?.id ||
				(data.user === null && currentStoreValue !== null) ||
				(data.user !== null && currentStoreValue === null)
			) {
				userStore.set(data.user);
			}
		}
	}

	onMount(() => {
		// console.log('[+layout.svelte] Component Mounted. Initial data.user ID from server:', data?.user?.id);
		const currentStoreValue = $userStore;
		// console.log('[+layout.svelte] onMount: Current $userStore value:', currentStoreValue === undefined ? 'undefined' : (currentStoreValue === null ? 'null' : currentStoreValue?.id));
		if (data.user !== undefined && currentStoreValue === undefined) {
			// console.log('[+layout.svelte] onMount: Setting userStore from initial server data as store is undefined.');
			userStore.set(data.user);
		}
	});

	// $: {
	// 	const currentStoreValue = $userStore;
	// 	console.log('[+layout.svelte] $userStore state changed to:', currentStoreValue === undefined ? 'undefined' : (currentStoreValue === null ? 'null' : currentStoreValue?.id));
	// }

	async function handleLogout() {
		// console.log('[+layout.svelte] Attempting logout by navigating to /logout endpoint...');
		await goto('/logout');
	}

	// Basis-Styling für Navigationslinks
	const navLinkClasses = 'px-3 py-2 rounded-md text-sm font-medium transition-colors duration-150 ease-in-out';
	const activeNavLinkClasses = 'bg-gray-900 text-white'; // Beispiel für aktiven Link, muss ggf. dynamisch gesetzt werden
	const inactiveNavLinkClasses = 'text-gray-700 hover:bg-gray-200 hover:text-gray-900';
	const buttonClasses = 'px-4 py-2 rounded-md text-sm font-medium shadow-sm transition-colors duration-150 ease-in-out';
	const primaryButtonClasses = 'text-white bg-blue-600 hover:bg-blue-700';
	const secondaryButtonClasses = 'text-gray-700 bg-gray-200 hover:bg-gray-300';
</script>

{#if $navigating || $isFormSubmitting}
	<LoadingIndicator />
{/if}

<nav class="bg-white shadow-lg sticky top-0 z-50">
	<div class="max-w-7xl mx-auto px-2 sm:px-6 lg:px-8">
		<div class="relative flex items-center justify-between h-16">
			<div class="flex-1 flex items-center justify-center sm:items-stretch sm:justify-start">
				<div class="flex-shrink-0 flex items-center">
					<a href="/" class="text-2xl font-bold text-blue-600 hover:text-blue-800 transition-colors">
						Student Info System
					</a>
				</div>
			</div>
			<div class="absolute inset-y-0 right-0 flex items-center pr-2 sm:static sm:inset-auto sm:ml-6 sm:pr-0">
				<div class="ml-3 relative space-x-2">
					{#if $userStore}
						<a class="{navLinkClasses} {inactiveNavLinkClasses}" href="/private/home">Home</a>
						<a class="{navLinkClasses} {inactiveNavLinkClasses}" href="/private/students">Students</a>
						<a class="{navLinkClasses} {inactiveNavLinkClasses}" href="/private/courses">Courses</a>
						<a class="{navLinkClasses} {inactiveNavLinkClasses}" href="/private/staff">Staff</a>
						<a class="{navLinkClasses} {inactiveNavLinkClasses}" href="/private/flashdecks">⚡FlashDecks</a>
						<button class="{buttonClasses} bg-red-500 hover:bg-red-700 text-white" on:click={handleLogout}
						>Logout</button
						>
					{:else if $userStore === null}
						<a class="{navLinkClasses} {inactiveNavLinkClasses}" href="/login">Login</a>
						<a class="{navLinkClasses} {inactiveNavLinkClasses}" href="/signup">Signup</a>
					{:else if $userStore === undefined}
						<!-- Dieser Block wird angezeigt, während der Benutzerstatus noch nicht vom Server geladen wurde -->
						<span class="text-sm text-gray-500 px-3 py-2">Authenticating...</span>
						<a class="{navLinkClasses} {inactiveNavLinkClasses}" href="/login">Login</a>
						<a class="{navLinkClasses} {inactiveNavLinkClasses}" href="/signup">Signup</a>
					{/if}
				</div>
			</div>
		</div>
	</div>
</nav>

<main class="bg-gray-50 min-h-screen">
	<slot />
</main>