<!-- src/routes/signup/+page.svelte -->
<script lang="ts">
    import { supabase } from '$lib/supabaseClient';
    import { goto } from '$app/navigation';
    import type { AuthError, PostgrestError } from "@supabase/supabase-js"; // 'User' entfernt, da nicht verwendet
    let email = "";
    let password = '';
    let role = 'student'; // Standardrolle
    let first_name = '';
    let last_name = '';
    let errorMsg = '';

    async function handleSignup() {
        errorMsg = ''; // Fehlermeldung zurücksetzen
        const { data, error } = await supabase.auth.signUp({
            email,
            password,
            options: {
                data: {
                    role,
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
                const catchedError = e as AuthError; // Sicherstellen, dass der Typ korrekt ist
                errorMsg = `An unexpected error occurred during profile creation: ${catchedError.message}`;
                console.error('Unexpected error during profile creation:', catchedError);
            }
        } else {
            errorMsg = 'Signup successful, but no user data returned. Please try logging in.';
            console.error('Signup successful but no user data returned.');
        }
    }
</script>

<div class="min-h-screen bg-gray-100 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
    <div class="sm:mx-auto sm:w-full sm:max-w-md">
        <h2 class="mt-6 text-center text-3xl font-extrabold text-gray-900">
            Create your account
        </h2>
    </div>

    <div class="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div class="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
            <form class="space-y-6" on:submit|preventDefault={handleSignup}>
                <div>
                    <label for="first_name" class="block text-sm font-medium text-gray-700">
                        First Name
                    </label>
                    <div class="mt-1">
                        <input id="first_name" name="first_name" type="text" bind:value={first_name} required
                               class="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm">
                    </div>
                </div>

                <div>
                    <label for="last_name" class="block text-sm font-medium text-gray-700">
                        Last Name
                    </label>
                    <div class="mt-1">
                        <input id="last_name" name="last_name" type="text" bind:value={last_name} required
                               class="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm">
                    </div>
                </div>

                <div>
                    <label for="email" class="block text-sm font-medium text-gray-700">
                        Email address
                    </label>
                    <div class="mt-1">
                        <input id="email" name="email" type="email" bind:value={email} autocomplete="email" required
                               class="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm">
                    </div>
                </div>

                <div>
                    <label for="password" class="block text-sm font-medium text-gray-700">
                        Password
                    </label>
                    <div class="mt-1">
                        <input id="password" name="password" type="password" bind:value={password} autocomplete="current-password" required
                               class="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm">
                    </div>
                </div>

                <div>
                    <label for="role" class="block text-sm font-medium text-gray-700">
                        Role
                    </label>
                    <div class="mt-1">
                        <select id="role" name="role" bind:value={role} required
                                class="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm">
                            <option value="student">Student</option>
                            <option value="instructor">Instructor</option>
                            <option value="admin">Admin</option>
                        </select>
                    </div>
                </div>

                <div>
                    <button type="submit"
                            class="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500">
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
                <a href="/login" class="font-medium text-indigo-600 hover:text-indigo-500">
                    Log in
                </a>
            </p>
        </div>
    </div>
</div>