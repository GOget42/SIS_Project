<!--/src/routes/+layout.svelte-->
<script>
	import { page } from '$app/stores';
	import { supabase } from '$lib/supabaseClient';
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';

	export let data;
	let session = data.session;
	let user = data.user;

	let showDropdown = false;

	onMount(async () => {
		const { data: { session: newSession } } = await supabase.auth.getSession();
		if (newSession) {
			session = newSession;
			user = newSession.user;
		}

		supabase.auth.onAuthStateChange((_event, sessionChange) => {
			if (sessionChange) {
				user = sessionChange.user;
			}
		});

	});

	async function handleLogout() {
		await supabase.auth.signOut();
		goto('/login');
	}
</script>

<style>
    nav {
        display: flex;
        justify-content: space-between;
        align-items: center;
        gap: 1rem;
        padding: 1rem;
        background: #f8f9fa;
        border-bottom: 1px solid #ddd;
    }
    .nav-links {
        display: flex;
        gap: 1rem;
    }
    .account-area {
        position: relative;
    }
    .account-icon {
        font-size: 1.25rem;
        cursor: pointer;
    }
    .dropdown {
        position: absolute;
        top: 100%;
        right: 0;
        background: white;
        border: 1px solid #ccc;
        padding: 0.5rem;
        display: flex;
        flex-direction: column;
        z-index: 10;
    }
    .dropdown a, .dropdown button {
        background: none;
        border: none;
        text-align: left;
        padding: 0.25rem 0;
        cursor: pointer;
        color: #0070f3;
        font-weight: bold;
    }
</style>

<nav>
	<div class="nav-links">
		<a href="/private/home" class:active={$page.url.pathname.startsWith('/private/home')}>Home</a>
		{#if user?.user_metadata?.role === 'admin'}
			<a href="/private/students" class:active={$page.url.pathname.startsWith('/private/students')}>Students</a>
			<a href="/private/staff" class:active={$page.url.pathname.startsWith('/private/staff')}>Staff</a>
		{/if}
		<a href="/private/courses" class:active={$page.url.pathname.startsWith('/private/courses')}>Courses</a>
	</div>

	<div class="account-area">
		{#if user}
			<div class="account-icon" on:click={() => showDropdown = !showDropdown}>👤</div>
			{#if showDropdown}
				<div class="dropdown">
					<a href="/private/home">My Account</a>
					<button on:click={handleLogout}>Logout</button>
				</div>
			{/if}
		{:else}
			<a href="/login" class:active={$page.url.pathname === '/login'} title="Login">
				<span class="account-icon">👤</span>
			</a>
		{/if}
	</div>
</nav>

<main>
	<slot />
</main>
