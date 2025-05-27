<script lang="ts">
	// Importiert den LayoutData-Typ für 'data'. Stellen Sie sicher, dass der Pfad zu './$types' korrekt ist.
	export let data: import('./$types').LayoutData;

	import { user as userStore } from '$lib/stores/auth';
	// Importieren Sie Ihre clientseitige Supabase-Instanz.
	// Stellen Sie sicher, dass '$lib/supabaseClient' die clientseitige Instanz korrekt exportiert.
	// import { supabase as clientSupabase } from '$lib/supabaseClient'; // Nicht mehr direkt für Logout benötigt
	import { goto } from '$app/navigation';
	import { onMount } from 'svelte';

	// REAKTIVE Anweisung: Synchronisiert den userStore, sobald sich data.user ändert.
	$: {
		if (data) {
			console.log('[+layout.svelte] Reactive update: data.user changed. New user ID from server:', data.user?.id);
			// Nur aktualisieren, wenn sich der Wert tatsächlich ändert, um unnötige Store-Updates zu vermeiden,
			// falls onAuthStateChange bereits den korrekten Zustand gesetzt hat.
			const currentStoreValue = $userStore;
			if (data.user?.id !== currentStoreValue?.id || (data.user === null && currentStoreValue !== null) || (data.user !== null && currentStoreValue === null)) {
				userStore.set(data.user);
			}
		}
	}

	onMount(() => {
		console.log('[+layout.svelte] Component Mounted. Initial data.user ID from server:', data?.user?.id);
		const currentStoreValue = $userStore;
		console.log('[+layout.svelte] onMount: Current $userStore value:', currentStoreValue === undefined ? 'undefined' : (currentStoreValue === null ? 'null' : currentStoreValue?.id));
		// Wenn data.user beim Mounten existiert und der Store noch undefined ist, initial setzen.
		// Dies ist eine Absicherung, falls die reaktive Zuweisung nicht sofort greift oder
		// onAuthStateChange noch nicht gelaufen ist.
		if (data.user !== undefined && currentStoreValue === undefined) {
			console.log('[+layout.svelte] onMount: Setting userStore from initial server data as store is undefined.');
			userStore.set(data.user);
		}
	});

	$: {
		const currentStoreValue = $userStore;
		console.log('[+layout.svelte] $userStore state changed to:', currentStoreValue === undefined ? 'undefined' : (currentStoreValue === null ? 'null' : currentStoreValue?.id));
	}

	async function handleLogout() {
		console.log('[+layout.svelte] Attempting logout by navigating to /logout endpoint...');
		// Navigiere zum serverseitigen /logout Endpunkt.
		// Dieser Endpunkt kümmert sich um das serverseitige Abmelden und das Löschen der Cookies
		// und leitet dann zu /login weiter.
		await goto('/logout');
	}
</script>

<nav class="p-4 flex justify-between items-center shadow bg-white">
	<h1 class="text-xl font-bold">Student Info System</h1>
	<div class="space-x-4 flex items-center">
		{#if $userStore}
			<!-- Links für eingeloggte Benutzer -->
			<a class="btn" href="/private/home">Home</a>
			<a class="btn" href="/private/students">Students</a>
			<a class="btn" href="/private/courses">Courses</a>
			<a class="btn" href="/private/staff">Staff</a>
			<button class="btn" on:click={handleLogout}>Logout</button>
		{:else if $userStore === null}
			<!-- Links für explizit ausgeloggte Benutzer -->
			<a class="btn" href="/login">Login</a>
			<a class="btn" href="/signup">Signup</a>
		{:else if $userStore === undefined}
			<!-- Store ist noch nicht initialisiert (weder User noch null) -->
			<span class="text-sm text-gray-500">Authenticating...</span>
			<!-- Optional: Hier könnten auch Login/Signup Links als Fallback stehen -->
		{/if}
	</div>
</nav>

<main>
	<slot />
</main>