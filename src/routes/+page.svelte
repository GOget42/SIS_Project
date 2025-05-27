<!-- src/routes/+page.svelte -->
<script>
	import { onMount } from 'svelte';
	import { supabase } from '$lib/supabaseClient.js';
	import { goto } from '$app/navigation';

	onMount(async () => {
		console.log('⚡ Checking session...');

		const { data: { session }, error } = await supabase.auth.getSession();

		if (error) {
			console.error('🚨 Session error:', error.message);
			goto('/login', { replaceState: true });
			return;
		}

		if (!session || !session.user) {
			console.warn('🛑 No session or user found!');
			goto('/login', { replaceState: true });
			return;
		}

		console.log('✅ Session found, redirecting to /home');
		goto('/private/home', { replaceState: true });
	});
</script>

<div class="flex items-center justify-center min-h-screen">
	<div class="text-center text-gray-600 text-lg">Loading...</div>
</div>
