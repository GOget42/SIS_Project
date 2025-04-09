<script>
    import { enhance } from '$app/forms';
    import { supabase } from '$lib/supabaseClient';
    import { deleteAuthUser } from '$lib/api/auth';
    export let data;

    let creatingInstructor = false;
    let creatingAdmin = false;

    let newInstructor = { first_name: '', last_name: '', email: '' };
    let newAdmin = { email: '' };

    let editingInstructorId = null;
    let updatedInstructor = { first_name: '', last_name: '', email: '' };

    function startEditInstructor(instructor) {
        editingInstructorId = instructor.id;
        updatedInstructor = { ...instructor };
    }

    async function saveInstructor() {
        await supabase
          .from('instructors')
          .update({
              first_name: updatedInstructor.first_name,
              last_name: updatedInstructor.last_name,
              email: updatedInstructor.email
          })
          .eq('id', editingInstructorId);
        location.reload();
    }

    async function deleteInstructor(instructor) {
        if (confirm(`Are you sure you want to delete ${instructor.first_name} ${instructor.last_name}?`)) {
            await supabase.from('instructors').delete().eq('id', instructor.id);
            await deleteAuthUser(instructor.user_id);
            alert('Instructor deleted.');
            location.reload();
        }
    }

    async function deleteAdmin(admin) {
        if (confirm(`Are you sure you want to delete admin ${admin.email}?`)) {
            await supabase.from('admins').delete().eq('id', admin.id);
            await deleteAuthUser(admin.user_id);
            alert('Admin deleted.');
            location.reload();
        }
    }

    function cancelEdit() {
        editingInstructorId = null;
    }
</script>

<h1>Staff</h1>

<!-- Instructors Section -->
<h2>Instructors</h2>

<button on:click={() => creatingInstructor = true}>➕ Add Instructor</button>

{#if creatingInstructor}
    <form method="POST" action="?/createInstructor" use:enhance>
        <input name="first_name" bind:value={newInstructor.first_name} placeholder="First Name" required />
        <input name="last_name" bind:value={newInstructor.last_name} placeholder="Last Name" required />
        <input name="email" type="email" bind:value={newInstructor.email} placeholder="Email" required />
        <button type="submit">💾 Save Instructor</button>
        <button type="button" on:click={() => creatingInstructor = false}>✖️ Cancel</button>
    </form>
{/if}

{#if data.instructors.length > 0}
    <ul>
        {#each data.instructors as instructor}
            <li>
                {#if editingInstructorId === instructor.id}
                    <input bind:value={updatedInstructor.first_name} placeholder="First Name" />
                    <input bind:value={updatedInstructor.last_name} placeholder="Last Name" />
                    <input bind:value={updatedInstructor.email} placeholder="Email" />
                    <button on:click={saveInstructor}>💾 Save</button>
                    <button on:click={cancelEdit}>✖️ Cancel</button>
                    <button on:click={() => deleteInstructor(instructor)}>🗑️ Delete</button>
                {:else}
                    <a href={`/private/staff/${instructor.id}`}>
                        {instructor.first_name} {instructor.last_name} ({instructor.email})
                    </a>
                    <button on:click={() => startEditInstructor(instructor)}>✏️ Edit</button>
                    <button on:click={() => deleteInstructor(instructor)}>🗑️ Delete</button>
                {/if}
            </li>
        {/each}
    </ul>
{:else}
    <p>No instructors found.</p>
{/if}

<!-- Admins Section -->
<h2>Admins</h2>

<button on:click={() => creatingAdmin = true}>➕ Add Admin</button>

{#if creatingAdmin}
    <form method="POST" action="?/createAdmin" use:enhance>
        <input name="first_name" bind:value={newAdmin.first_name} placeholder="First Name" required />
        <input name="last_name" bind:value={newAdmin.last_name} placeholder="Last Name" required />
        <input name="email" type="email" bind:value={newAdmin.email} placeholder="Admin Email" required />
        <button type="submit">💾 Save Admin</button>
        <button type="button" on:click={() => creatingAdmin = false}>✖️ Cancel</button>
    </form>
{/if}

{#if data.admins.length > 0}
    <ul>
        {#each data.admins as admin}
            <li>
                <a href={`/private/staff/${admin.id}`}>
                    {admin.first_name} {admin.last_name} ({admin.email})
                </a>
                <button on:click={() => deleteAdmin(admin)}>🗑️ Delete</button>
            </li>
        {/each}
    </ul>
{:else}
    <p>No admins found.</p>
{/if}
