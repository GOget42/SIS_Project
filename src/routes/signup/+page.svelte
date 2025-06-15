<!-- src/routes/signup/+page.svelte -->
<script lang="ts">
    import { supabase } from '$lib/supabaseClient'; // .js entfernt für Konsistenz, falls es ein .ts File ist
    import { goto } from '$app/navigation';
import type { AuthError, User, PostgrestError } from "@supabase/supabase-js";
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
                    // Es ist üblich, first_name und last_name auch im user_metadata zu speichern,
                    // aber für die Tabelleneinträge ist es hier wichtiger.
                    // first_name: first_name,
                    // last_name: last_name
                }
            }
        });

        if (error) {
            errorMsg = error.message;
            console.error('Signup error:', error.message);
            return;
        }

        // Überprüfen, ob data.user vorhanden ist, bevor auf data.user.id zugegriffen wird
        if (data && data.user) {
            const userId = data.user.id;
            let insertError: PostgrestError | null = null; // Um den Fehler spezifischer zu typisieren

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
                } else if (role === 'admin') { // Hinzugefügter Fall für Admins
                    const { error: adminError } = await supabase.from('admins').insert({
                        user_id: userId,
                        email,
                        first_name,
                        last_name
                        // admin_specific_field: 'some_value' // Falls es spezifische Felder für Admins gibt
                    });
                    insertError = adminError;
                }

                if (insertError) {
                    errorMsg = `User created, but failed to create profile: ${insertError.message}`;
                    console.error('Error inserting profile data:', insertError.message);
                    // Hier könnte man in Erwägung ziehen, den Auth-Benutzer wieder zu löschen,
                    // um inkonsistente Zustände zu vermeiden, aber das hängt von den Anforderungen ab.
                    // await supabase.auth.admin.deleteUser(userId); // Benötigt Service-Rolle
                    return;
                }

                // Erfolgreich, weiterleiten.
                // Die Weiterleitung sollte idealerweise zu einer Seite führen, die die Rolle berücksichtigt,
                // oder zu einer allgemeinen "Willkommen"-Seite, bevor der Benutzer zu spezifischen Bereichen navigiert.
                // Für Admins könnte dies /private/staff oder /private/home sein.
                // Für Studenten /private/home oder /private/dashboard.
                // Für Instruktoren /private/courses oder /private/home.
                // Aktuell wird pauschal zu /private/home weitergeleitet.
                await goto('/private/home');

            } catch (e: unknown) {
                const catchedError = e as AuthError;
                errorMsg = `An unexpected error occurred during profile creation: ${catchedError.message}`;
                console.error('Unexpected error during profile creation:', catchedError);
            }
        } else {
            errorMsg = 'Signup successful, but no user data returned. Please try logging in.';
            console.error('Signup successful but no user data returned.');
        }
    }
</script>

<h1>Sign Up</h1>
<form on:submit|preventDefault={handleSignup}>
    <div class="mb-4">
        <label class="block text-gray-700 text-sm font-bold mb-2" for="first_name">
            First Name:
        </label>
        <input class="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline" id="first_name" type="text" bind:value={first_name} required />
    </div>
    <div class="mb-4">
        <label class="block text-gray-700 text-sm font-bold mb-2" for="last_name">
            Last Name:
        </label>
        <input class="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline" id="last_name" type="text" bind:value={last_name} required />
    </div>
    <div class="mb-4">
        <label class="block text-gray-700 text-sm font-bold mb-2" for="email">
            Email:
        </label>
        <input class="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline" id="email" type="email" bind:value={email} required />
    </div>
    <div class="mb-6">
        <label class="block text-gray-700 text-sm font-bold mb-2" for="password">
            Password:
        </label>
        <input class="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 mb-3 leading-tight focus:outline-none focus:shadow-outline" id="password" type="password" bind:value={password} required />
    </div>
    <div class="mb-4">
        <label class="block text-gray-700 text-sm font-bold mb-2" for="role">
            Role:
        </label>
        <select class="shadow border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline" id="role" bind:value={role} required>
            <option value="student">Student</option>
            <option value="instructor">Instructor</option>
            <option value="admin">Admin</option>
        </select>
    </div>
    <div class="flex items-center justify-between">
        <button class="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline" type="submit">
            Create Account
        </button>
    </div>
</form>
{#if errorMsg}<p class="text-red-500 text-xs italic mt-4">{errorMsg}</p>{/if}
<p class="mt-4 text-center text-sm">
    Already have an account? <a href="/login" class="font-bold text-blue-500 hover:text-blue-800">Log in</a>
</p>