<script>
	import { deleteStaff, updateStaff } from '$lib/api/staff';
	import { goto } from '$app/navigation';
	export let data;

	let staff = { ...data.staff };
	let editing = false;

	async function handleDelete() {
		if (confirm(`Are you sure you want to delete ${staff.first_name} ${staff.last_name}?`)) {
			await deleteStaff(staff.id, staff.role);
			alert('Staff deleted.');
			goto('/private/staff');
		}
	}

	async function handleUpdate() {
		await updateStaff(staff.id, {
			first_name: staff.first_name,
			last_name: staff.last_name,
			email: staff.email
		}, staff.role);
		alert('Staff updated.');
		editing = false;
	}
</script>


<h1>Staff Detail</h1>

{#if staff}
	{#if editing}
		<form on:submit|preventDefault={handleUpdate}>
			<label>First Name: <input bind:value={staff.first_name} /></label><br />
			<label>Last Name: <input bind:value={staff.last_name} /></label><br />
			<label>Email: <input type="email" bind:value={staff.email} /></label><br />
			<button type="submit">Save</button>
			<button type="button" on:click={() => editing = false}>Cancel</button>
		</form>
	{:else}
		<p><strong>Name:</strong> {staff.first_name} {staff.last_name}</p>
		<p><strong>Email:</strong> {staff.email}</p>
		<p><strong>Role:</strong> {staff.role}</p>
		<button on:click={() => editing = true}>Edit</button>
		<button on:click={handleDelete}>Delete</button>
	{/if}
{/if}
