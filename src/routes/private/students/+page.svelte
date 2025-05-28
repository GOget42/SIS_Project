<script lang="ts">
  import { enhance } from '$app/forms';
  // Typ-Importe für ActionResult und SubmitFunction entfernt, um auf Inferenz zu setzen
  import { supabase } from '$lib/supabaseClient.ts';
  import { deleteAuthUser } from '$lib/api/auth.ts';
  import { invalidateAll } from '$app/navigation';

  export let data: import('./$types').PageData;

  interface Student {
    student_id: string;
    first_name: string;
    last_name: string;
    email: string;
    user_id: string;
  }

  let creatingStudent = false;
  let newStudent: Pick<Student, 'first_name' | 'last_name' | 'email'> & { password?: string } = {
    first_name: '',
    last_name: '',
    email: '',
    password: ''
  };

  let editingStudentId: string | null = null;
  let updatedStudent: Pick<Student, 'first_name' | 'last_name' | 'email' | 'user_id'> & { password?: string; student_id?: string } = {
    student_id: '',
    user_id: '',
    first_name: '',
    last_name: '',
    email: '',
    password: ''
  };

  function startEditStudent(student: Student) {
    editingStudentId = student.student_id;
    updatedStudent = {
      student_id: student.student_id,
      user_id: student.user_id,
      first_name: student.first_name,
      last_name: student.last_name,
      email: student.email,
      password: ''
    };
  }

  async function deleteStudentRecord(student: Student) {
    if (confirm(`Are you sure you want to delete ${student.first_name} ${student.last_name}?`)) {
      try {
        const { error: studentDeleteError } = await supabase
          .from('students')
          .delete()
          .eq('student_id', student.student_id);

        if (studentDeleteError) {
          throw new Error(`Failed to delete student record: ${studentDeleteError.message}`);
        }

        if (student.user_id) {
          // Stellen Sie sicher, dass deleteAuthUser die Supabase-URL korrekt erhält (z.B. über import.meta.env.VITE_SUPABASE_URL)
          // um den "undefined/functions/v1/..." Fehler zu vermeiden.
          await deleteAuthUser(student.user_id);
        }

        alert('Student and associated auth user (if any) deleted successfully!');
        await invalidateAll();
      } catch (e: unknown) {
        let message = 'An unknown error occurred while deleting the student.';
        if (e instanceof Error) {
          message = e.message;
        }
        alert('Error deleting student: ' + message);
        console.error('Delete student error:', e);
      }
    }
  }

  function cancelEdit() {
    editingStudentId = null;
    updatedStudent = { student_id: '', user_id: '', first_name: '', last_name: '', email: '', password: '' };
  }

  // Typen für Parameter werden durch SvelteKit's `enhance` inferiert
  const enhanceCreateForm = () => {
    return async ({ result, update }) => {
      if (result.type === 'success') {
        creatingStudent = false;
        newStudent = { first_name: '', last_name: '', email: '', password: '' };
        alert(result.data?.message || 'Student created successfully!');
      } else if (result.type === 'failure') {
        alert(result.data?.error || 'Failed to create student.');
      }
      await update();
    };
  };

  // Typen für Parameter werden durch SvelteKit's `enhance` inferiert
  const enhanceUpdateForm = () => {
    return async ({ result, update }) => {
      if (result.type === 'success') {
        editingStudentId = null;
        alert(result.data?.message || 'Student updated successfully!');
      } else if (result.type === 'failure') {
        alert(result.data?.error || 'Failed to update student.');
      }
      await update();
    };
  };

</script>

<h1>Students</h1>

<button on:click={() => creatingStudent = true}>➕ Add Student</button>

{#if creatingStudent}
  <form method="POST" action="?/createStudent" use:enhance={enhanceCreateForm}>
    <input name="first_name" bind:value={newStudent.first_name} placeholder="First Name" required />
    <input name="last_name" bind:value={newStudent.last_name} placeholder="Last Name" required />
    <input name="email" type="email" bind:value={newStudent.email} placeholder="Email" required />
    <input name="password" type="password" bind:value={newStudent.password} placeholder="Password" required />
    <button type="submit">💾 Save Student</button>
    <button type="button" on:click={() => { creatingStudent = false; newStudent = { first_name: '', last_name: '', email: '', password: '' }; }}>✖️ Cancel</button>
  </form>
{/if}

<ul>
  {#each data.students as student (student.student_id)}
    <li>
      {#if editingStudentId === student.student_id}
        <form method="POST" action="?/updateStudent" use:enhance={enhanceUpdateForm}>
          <input type="hidden" name="student_id" value={student.student_id} />
          <input type="hidden" name="user_id" value={student.user_id} />

          <label>First Name: <input name="first_name" bind:value={updatedStudent.first_name} placeholder="First Name" required /></label>
          <label>Last Name: <input name="last_name" bind:value={updatedStudent.last_name} placeholder="Last Name" required /></label>
          <label>Email: <input name="email" type="email" bind:value={updatedStudent.email} placeholder="Email" required /></label>
          <label>New Password: <input name="password" type="password" bind:value={updatedStudent.password} placeholder="New Password (leave blank if no change)" /></label>

          <button type="submit">💾 Save Changes</button>
          <button type="button" on:click={cancelEdit}>✖️ Cancel</button>
        </form>
      {:else}
        <a href={`/private/students/${student.student_id}`}>
          {student.first_name} {student.last_name} ({student.email})
        </a>
        <button on:click={() => startEditStudent(student)}>✏️ Edit</button>
        <button on:click={() => deleteStudentRecord(student)}>🗑️ Delete</button>
      {/if}
    </li>
  {/each}
</ul>