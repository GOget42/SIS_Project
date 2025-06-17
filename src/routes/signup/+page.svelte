<script lang="ts">
	import { supabase } from '$lib/supabaseClient';
	import { goto } from '$app/navigation';
	import type { AuthError, PostgrestError } from '@supabase/supabase-js'; // User type is not used
	let email = '';
	let password = '';
	let role = 'student'; // Default role
	let first_name = '';
	let last_name = '';
	let errorMsg = '';

	async function handleSignup() {
		errorMsg = '';
		const { data, error } = await supabase.auth.signUp({
			email,
			password,
			options: {
				data: {
					role
				}
			}
		});

		if (error) {
			errorMsg = error.message;
			console.error('Signup error:', error.message);
			return;
		}

		if (data && data.user) {
			const userId = data.user.id;
			let insertError: PostgrestError | null = null;

			try {
				if (role === 'student') {
					const { error: studentError } = await supabase.from('students').insert({
						user_id: userId,
						email,
						first_name,
						last_name
					});
					insertError = studentError;
				} else if (role === 'instructor') {
					const { error: instructorError } = await supabase.from('instructors').insert({
						user_id: userId,
						email,
						first_name,
						last_name
					});
					insertError = instructorError;
				} else if (role === 'admin') {
					const { error: adminError } = await supabase.from('admins').insert({
						user_id: userId,
						email,
						first_name,
						last_name
					});
					insertError = adminError;
				}

				if (insertError) {
					errorMsg = `User created, but failed to create profile: ${insertError.message}`;
					console.error('Error inserting profile data:', insertError.message);
					return;
				}
				await goto('/private/home');
			} catch (e: unknown) {
				const catchedError = e as AuthError; // Ensure correct error type
				errorMsg = `An unexpected error occurred during profile creation: ${catchedError.message}`;
				console.error('Unexpected error during profile creation:', catchedError);
			}
		} else {
			errorMsg = 'Signup successful, but no user data returned. Please try logging in.';
			console.error('Signup successful but no user data returned.');
		}
	}
</script>

<div class="flex min-h-screen flex-col justify-center bg-gray-100 py-12 sm:px-6 lg:px-8">
	<div class="sm:mx-auto sm:w-full sm:max-w-md">
		<h2 class="mt-6 text-center text-3xl font-extrabold text-gray-900">Create your account</h2>
	</div>

	<div class="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
		<div class="bg-white px-4 py-8 shadow sm:rounded-lg sm:px-10">
			<form class="space-y-6" on:submit|preventDefault={handleSignup}>
				<div>
					<label for="first_name" class="block text-sm font-medium text-gray-700">
						First Name
					</label>
					<div class="mt-1">
						<input
							id="first_name"
							name="first_name"
							type="text"
							bind:value={first_name}
							required
							class="block w-full appearance-none rounded-md border border-gray-300 px-3 py-2 placeholder-gray-400 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 focus:outline-none sm:text-sm"
						/>
					</div>
				</div>

				<div>
					<label for="last_name" class="block text-sm font-medium text-gray-700"> Last Name </label>
					<div class="mt-1">
						<input
							id="last_name"
							name="last_name"
							type="text"
							bind:value={last_name}
							required
							class="block w-full appearance-none rounded-md border border-gray-300 px-3 py-2 placeholder-gray-400 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 focus:outline-none sm:text-sm"
						/>
					</div>
				</div>

				<div>
					<label for="email" class="block text-sm font-medium text-gray-700"> Email address </label>
					<div class="mt-1">
						<input
							id="email"
							name="email"
							type="email"
							bind:value={email}
							autocomplete="email"
							required
							class="block w-full appearance-none rounded-md border border-gray-300 px-3 py-2 placeholder-gray-400 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 focus:outline-none sm:text-sm"
						/>
					</div>
				</div>

				<div>
					<label for="password" class="block text-sm font-medium text-gray-700"> Password </label>
					<div class="mt-1">
						<input
							id="password"
							name="password"
							type="password"
							bind:value={password}
							autocomplete="current-password"
							required
							class="block w-full appearance-none rounded-md border border-gray-300 px-3 py-2 placeholder-gray-400 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 focus:outline-none sm:text-sm"
						/>
					</div>
				</div>

				<div>
					<label for="role" class="block text-sm font-medium text-gray-700"> Role </label>
					<div class="mt-1">
						<select
							id="role"
							name="role"
							bind:value={role}
							required
							class="block w-full appearance-none rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 focus:outline-none sm:text-sm"
						>
							<option value="student">Student</option>
							<option value="instructor">Instructor</option>
							<option value="admin">Admin</option>
						</select>
					</div>
				</div>

				<div>
					<button
						type="submit"
						class="flex w-full justify-center rounded-md border border-transparent bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 focus:outline-none"
					>
						Create Account
					</button>
				</div>
			</form>

			{#if errorMsg}
				<p class="mt-2 text-center text-sm text-red-600">
					{errorMsg}
				</p>
			{/if}

			<p class="mt-6 text-center text-sm text-gray-600">
				Already have an account?
				<a href="/login" class="font-medium text-indigo-600 hover:text-indigo-500"> Log in </a>
			</p>
		</div>
	</div>
</div>
