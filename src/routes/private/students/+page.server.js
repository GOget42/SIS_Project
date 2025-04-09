import { redirect } from '@sveltejs/kit';

export async function load({ locals }) {
	if (!locals.session) {
		throw redirect(302, '/login');
	}

	const { data: students, error } = await locals.supabase.from('students').select('*');
	if (error) {
		console.error('Error loading students:', error.message);
	}

	return {
		user: locals.user,
		students: students ?? []
	};
}

// ✅ SERVER Action for creating a student using locals.supabase
export const actions = {
	createStudent: async ({ request, locals }) => {
		const formData = await request.formData();
		const first_name = formData.get('first_name');
		const last_name = formData.get('last_name');
		const email = formData.get('email');

		const password = Math.random().toString(36).slice(-10) + '!Aa1';

		try {
			// ✅ Create Student via Edge Function CALL
			const response = await fetch('https://aylyakkvlvfptimufmwo.functions.supabase.co/create-user', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					'Authorization': `Bearer ${locals.session.access_token}`  // 🧙‍♂️ Use SERVER session!
				},
				body: JSON.stringify({ email, password, role: 'student', first_name, last_name })
			});

			const data = await response.json();

			if (!response.ok) {
				throw new Error(data.error || 'Failed to create auth user');
			}

			return { success: true };
		} catch (error) {
			console.error('Server create error:', error.message);
			return { error: error.message };
		}
	}
};
