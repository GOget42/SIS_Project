<script lang="ts">
    import { enhance } from '$app/forms';
    import { invalidateAll } from '$app/navigation';
    import type { ActionData, PageData } from './$types';

    export let data: PageData;
    export let form: ActionData; // Für Rückmeldungen von Aktionen

    interface StaffMember {
        user_id: string; // Wichtig für Auth-Operationen
        first_name: string;
        last_name: string;
        email: string;
    }

    interface Instructor extends StaffMember {
        instructor_id: string;
    }

    interface Admin extends StaffMember {
        admin_id: string;
    }

    let creatingInstructor = false;
    let creatingAdmin = false;

    let newInstructor: Pick<Instructor, 'first_name' | 'last_name' | 'email'> & { password?: string } = {
        first_name: '',
        last_name: '',
        email: '',
        password: ''
    };
    let newAdmin: Pick<Admin, 'first_name' | 'last_name' | 'email'> & { password?: string } = {
        first_name: '',
        last_name: '',
        email: '',
        password: ''
    };

    let editingInstructorId: string | null = null;
    let updatedInstructor: Pick<Instructor, 'first_name' | 'last_name' | 'email'> & { password?: string; user_id?: string } = {
        first_name: '',
        last_name: '',
        email: '',
        password: '',
        user_id: ''
    };

    function startEditInstructor(instructor: Instructor) {
        editingInstructorId = instructor.instructor_id;
        updatedInstructor = {
            first_name: instructor.first_name,
            last_name: instructor.last_name,
            email: instructor.email,
            user_id: instructor.user_id,
            password: ''
        };
    }

    function cancelEdit() {
        editingInstructorId = null;
    }

</script>

<h1>Staff Management</h1>

<!-- Instructors Section -->
<h2>Instructors</h2>
<button on:click={() => creatingInstructor = true}>➕ Add Instructor</button>

{#if creatingInstructor}
    <form
      method="POST"
      action="?/createInstructor"
      use:enhance={() => {
      creatingInstructor = false;
      return async ({ result }) => {
        if (result.type === 'success' || result.type === 'failure') {
           await invalidateAll();
        }
        if (result.type === 'failure' && result.data?.error) {
            alert(`Error: ${result.data.error}`);
        } else if (result.type === 'success' && result.data?.message) {
            alert(result.data.message);
            newInstructor = { first_name: '', last_name: '', email: '', password: '' };
        }
      };
    }}
    >
        <input name="first_name" bind:value={newInstructor.first_name} placeholder="First Name" required />
        <input name="last_name" bind:value={newInstructor.last_name} placeholder="Last Name" required />
        <input name="email" type="email" bind:value={newInstructor.email} placeholder="Email" required />
        <input name="password" type="password" bind:value={newInstructor.password} placeholder="Password" required />
        <button type="submit">💾 Save Instructor</button>
        <button type="button" on:click={() => creatingInstructor = false}>✖️ Cancel</button>
    </form>
{/if}

{#if data.instructors && data.instructors.length > 0}
    <ul>
        {#each data.instructors as instructor (instructor.instructor_id)}
            <li>
                {#if editingInstructorId === instructor.instructor_id}
                    <form
                      method="POST"
                      action="?/updateInstructor"
                      use:enhance={() => {
              editingInstructorId = null;
              return async ({ result }) => {
                if (result.type === 'success' || result.type === 'failure') {
                    await invalidateAll();
                }
                if (result.type === 'failure' && result.data?.error) {
                    alert(`Error: ${result.data.error}`);
                } else if (result.type === 'success' && result.data?.message) {
                    alert(result.data.message);
                }
              };
            }}
                    >
                        <input type="hidden" name="instructor_id" value={instructor.instructor_id} />
                        <input type="hidden" name="user_id" value={instructor.user_id} />
                        <input name="first_name" bind:value={updatedInstructor.first_name} placeholder="First Name" required />
                        <input name="last_name" bind:value={updatedInstructor.last_name} placeholder="Last Name" required />
                        <input name="email" type="email" bind:value={updatedInstructor.email} placeholder="Email" required />
                        <input name="password" type="password" bind:value={updatedInstructor.password} placeholder="New Password (leave blank if no change)" />
                        <button type="submit">💾 Save Changes</button>
                        <button type="button" on:click={cancelEdit}>✖️ Cancel</button>
                    </form>
                {:else}
                    <a href={`/private/staff/${instructor.instructor_id}`}>{instructor.first_name} {instructor.last_name} ({instructor.email})</a>
                    <button on:click={() => startEditInstructor(instructor)}>✏️ Edit</button>
                    <form
                      method="POST"
                      action="?/deleteInstructor"
                      use:enhance={() => {
                return async ({ result }) => {
                    if (result.type === 'success' || result.type === 'failure') {
                        await invalidateAll();
                    }
                    if (result.type === 'failure' && result.data?.error) {
                        alert(`Error: ${result.data.error}`);
                    } else if (result.type === 'success' && result.data?.message) {
                        alert(result.data.message);
                    }
                };
            }}
                      style="display: inline;"
                      on:submit|preventDefault={(e) => {
                if (!confirm(`Are you sure you want to delete ${instructor.first_name} ${instructor.last_name}?`)) {
                    e.preventDefault();
                }
            }}
                    >
                        <input type="hidden" name="instructor_id" value={instructor.instructor_id} />
                        <input type="hidden" name="user_id" value={instructor.user_id} />
                        <button type="submit">🗑️ Delete</button>
                    </form>
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
    <form
      method="POST"
      action="?/createAdmin"
      use:enhance={() => {
      creatingAdmin = false;
      return async ({ result }) => {
        if (result.type === 'success' || result.type === 'failure') {
           await invalidateAll();
        }
        if (result.type === 'failure' && result.data?.error) {
            alert(`Error: ${result.data.error}`);
        } else if (result.type === 'success' && result.data?.message) {
            alert(result.data.message);
            newAdmin = { first_name: '', last_name: '', email: '', password: '' };
        }
      };
    }}
    >
        <input name="first_name" bind:value={newAdmin.first_name} placeholder="First Name" required />
        <input name="last_name" bind:value={newAdmin.last_name} placeholder="Last Name" required />
        <input name="email" type="email" bind:value={newAdmin.email} placeholder="Admin Email" required />
        <input name="password" type="password" bind:value={newAdmin.password} placeholder="Password" required />
        <button type="submit">💾 Save Admin</button>
        <button type="button" on:click={() => creatingAdmin = false}>✖️ Cancel</button>
    </form>
{/if}

{#if data.admins && data.admins.length > 0}
    <ul>
        {#each data.admins as admin (admin.admin_id)}
            <li>
                {admin.first_name} {admin.last_name} ({admin.email})
                <form
                  method="POST"
                  action="?/deleteAdmin"
                  use:enhance={() => {
                return async ({ result }) => {
                    if (result.type === 'success' || result.type === 'failure') {
                        await invalidateAll();
                    }
                    if (result.type === 'failure' && result.data?.error) {
                        alert(`Error: ${result.data.error}`);
                    } else if (result.type === 'success' && result.data?.message) {
                        alert(result.data.message);
                    }
                };
            }}
                  style="display: inline;"
                  on:submit|preventDefault={(e) => {
                if (!confirm(`Are you sure you want to delete admin ${admin.email}?`)) {
                    e.preventDefault();
                }
            }}
                >
                    <input type="hidden" name="admin_id" value={admin.admin_id} />
                    <input type="hidden" name="user_id" value={admin.user_id} />
                    <button type="submit">🗑️ Delete</button>
                </form>
            </li>
        {/each}
    </ul>
{:else}
    <p>No admins found.</p>
{/if}