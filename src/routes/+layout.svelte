<script lang="ts">
	export let data: import('./$types').LayoutData;

	import { user as userStore } from '$lib/stores/auth';
	import { goto } from '$app/navigation';
	import { onMount } from 'svelte';
	import '../app.css';
	import { navigating } from '$app/stores';
	import LoadingIndicator from '$lib/components/LoadingIndicator.svelte';
	import { isFormSubmitting } from '$lib/stores/formLoadingStore';

	$: {
		if (data) {
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
		const currentStoreValue = $userStore;
		if (data.user !== undefined && currentStoreValue === undefined) {
			userStore.set(data.user);
		}
	});

	async function handleLogout() {
		await goto('/logout');
	}

	// Basic styling for navigation links
	const navLinkClasses =
		'px-3 py-2 rounded-md text-sm font-medium transition-colors duration-150 ease-in-out';
	const inactiveNavLinkClasses = 'text-gray-700 hover:bg-gray-200 hover:text-gray-900';
	const buttonClasses =
		'px-4 py-2 rounded-md text-sm font-medium shadow-sm transition-colors duration-150 ease-in-out';
</script>

{#if $navigating || $isFormSubmitting}
	<LoadingIndicator />
{/if}

<nav class="sticky top-0 z-50 bg-white shadow-lg">
	<div class="mx-auto max-w-7xl px-2 sm:px-6 lg:px-8">
		<div class="relative flex h-16 items-center justify-between">
			<div class="flex flex-1 items-center justify-center sm:items-stretch sm:justify-start">
				<div class="flex flex-shrink-0 items-center">
					<a
						href="/"
						class="text-2xl font-bold text-blue-600 transition-colors hover:text-blue-800"
					>
						Student Info System
					</a>
				</div>
			</div>
			<div
				class="absolute inset-y-0 right-0 flex items-center pr-2 sm:static sm:inset-auto sm:ml-6 sm:pr-0"
			>
				<div class="relative ml-3 space-x-2">
					{#if $userStore}
						<a class="{navLinkClasses} {inactiveNavLinkClasses}" href="/private/home">Home</a>
						<a class="{navLinkClasses} {inactiveNavLinkClasses}" href="/private/students"
							>Students</a
						>
						<a class="{navLinkClasses} {inactiveNavLinkClasses}" href="/private/courses">Courses</a>
						{#if $userStore.user_metadata.role !== 'student'}
							<a class="{navLinkClasses} {inactiveNavLinkClasses}" href="/private/staff">Staff</a>
						{/if}
						<a class="{navLinkClasses} {inactiveNavLinkClasses}" href="/private/flashdecks"
							>⚡FlashDecks</a
						>
						<button
							class="{buttonClasses} bg-red-500 text-white hover:bg-red-700"
							on:click={handleLogout}>Logout</button
						>
					{:else if $userStore === null}
						<a class="{navLinkClasses} {inactiveNavLinkClasses}" href="/login">Login</a>
						<a class="{navLinkClasses} {inactiveNavLinkClasses}" href="/signup">Signup</a>
					{:else if $userStore === undefined}
						<!-- This block is shown while the user status is still loading from the server -->
						<span class="px-3 py-2 text-sm text-gray-500">Authenticating...</span>
						<a class="{navLinkClasses} {inactiveNavLinkClasses}" href="/login">Login</a>
						<a class="{navLinkClasses} {inactiveNavLinkClasses}" href="/signup">Signup</a>
					{/if}
				</div>
			</div>
		</div>
	</div>
</nav>

<main class="min-h-screen bg-gray-50">
	<slot />
</main>
