// src/lib/api/auth.ts
import { supabase } from '$lib/supabaseClient';

export async function createAuthUser(email: string, password: string, role: string, first_name: string = '', last_name: string = '') {
	const { data: { session } } = await supabase.auth.getSession();
	if (!session) {
		throw new Error('No active session found');
	}

	const response = await fetch('https://aylyakkvlvfptimufmwo.functions.supabase.co/create-user', {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json',
			'Authorization': `Bearer ${session.access_token}`
		},
		body: JSON.stringify({ email, password, role, first_name, last_name })
	});

	const data = await response.json();

	if (!response.ok) {
		throw new Error(data.error || 'Failed to create auth user');
	}

	return data.user;
}

export async function deleteAuthUser(user_id: string) {
	const { data: { session } } = await supabase.auth.getSession();
	if (!session) {
		throw new Error('No active session found');
	}

	try {
		const response = await fetch('https://aylyakkvlvfptimufmwo.functions.supabase.co/delete-user', {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				'Authorization': `Bearer ${session.access_token}`
			},
			body: JSON.stringify({ user_id })
		});

		const data = await response.json();

		if (!response.ok) {
			throw new Error(data.error || 'Failed to delete auth user');
		}

		return data;
	} catch (err) {
		console.error('Failed to delete user:', err);
		throw new Error('Unexpected error deleting user.');
	}
}