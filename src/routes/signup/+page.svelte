<!-- src/routes/signup/+page.svelte -->
<script>
    import { supabase } from '$lib/supabaseClient';
    import { goto } from '$app/navigation';

    let email = '';
    let password = '';
    let role = 'student';
    let first_name = '';
    let last_name = '';
    let errorMsg = '';

    async function handleSignup() {
        const { data, error } = await supabase.auth.signUp({
            email,
            password,
            options: {
                data: { role }
            }
        });

        if (error) {
            errorMsg = error.message;
            return;
        }

        const userId = data.user.id;

        if (role === 'student') {
            await supabase.from('students').insert({
                user_id: userId,
                email,
                first_name,
                last_name
            });
        } else if (role === 'instructor') {
            await supabase.from('instructors').insert({
                user_id: userId,
                email,
                first_name,
                last_name
            });
        }

        goto('/private/home');
    }
</script>

<h1>Sign Up</h1>
<form on:submit|preventDefault={handleSignup}>
    <label>First Name: <input bind:value={first_name} required /></label><br />
    <label>Last Name: <input bind:value={last_name} required /></label><br />
    <label>Email: <input type="email" bind:value={email} required /></label><br />
    <label>Password: <input type="password" bind:value={password} required /></label><br />
    <label>Role:
        <select bind:value={role} required>
            <option value="student">Student</option>
            <option value="instructor">Instructor</option>
            <option value="admin">Admin</option>
        </select>
    </label><br />
    <button type="submit">Create Account</button>
</form>
{#if errorMsg}<p style="color:red">{errorMsg}</p>{/if}
<p>Already have an account? <a href="/login">Log in</a></p>
