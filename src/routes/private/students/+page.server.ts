import { redirect, fail } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { PUBLIC_SUPABASE_URL } from '$env/static/public'; // Für öffentliche Variablen

export const load: PageServerLoad = async ({ locals }) => {
	if (!locals.session) {
		throw redirect(302, '/login');
	}

	const { data: students, error } = await locals.supabase.from('students').select('*');
	if (error) {
		console.error('Error loading students:', error.message);
		// Optional: return fail(500, { message: 'Failed to load students' });
	}

	return {
		user: locals.user,
		students: students ?? []
	};
};

export const actions: Actions = {
	createStudent: async ({ request, locals, fetch: eventFetch }) => { // eventFetch hinzugefügt
		const formData = await request.formData();
		const first_name = formData.get('first_name') as string;
		const last_name = formData.get('last_name') as string;
		const email = formData.get('email') as string;
		const password = formData.get('password') as string;

		if (!first_name || !last_name || !email || !password) {
			return fail(400, { error: 'Missing required fields.', first_name, last_name, email });
		}

		// Die Supabase URL aus den öffentlichen Umgebungsvariablen holen
		const supabaseProjectUrl = PUBLIC_SUPABASE_URL;

		if (!supabaseProjectUrl) {
			console.error('PUBLIC_SUPABASE_URL is not defined in your .env file!');
			return fail(500, { error: 'Server configuration error: Supabase URL missing.' });
		}

		try {
			const createUserResponse = await eventFetch(`${supabaseProjectUrl}/functions/v1/create-user`, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					'Authorization': `Bearer ${locals.session?.access_token}`
				},
				body: JSON.stringify({ email, password, role: 'student', first_name, last_name })
			});

			const createUserData = await createUserResponse.json();

			if (!createUserResponse.ok) {
				console.error('Error from create-user function:', createUserData.error);
				return fail(createUserResponse.status, { error: createUserData.error || 'Failed to create auth user' });
			}

			return { success: true, message: 'Student created successfully.' };
		} catch (error: unknown) {
			let errorMessage = 'An unexpected error occurred while creating the student.';
			if (error instanceof Error) {
				errorMessage = error.message;
			}
			console.error('Server create student error:', errorMessage);
			return fail(500, { error: errorMessage });
		}
	},

	updateStudent: async ({ request, locals }) => {
		if (!locals.session) {
			throw redirect(303, '/login');
		}
		const formData = await request.formData();
		const student_id = formData.get('student_id') as string;
		const user_id = formData.get('user_id') as string;
		const first_name = formData.get('first_name') as string;
		const last_name = formData.get('last_name') as string;
		const email = formData.get('email') as string;
		const password = formData.get('password') as string | null;

		if (!student_id || !user_id || !first_name || !last_name || !email) {
			return fail(400, { error: 'Missing required fields for update.', student_id, first_name, last_name, email });
		}

		try {
			const { error: studentUpdateError } = await locals.supabase
				.from('students')
				.update({ first_name, last_name, email })
				.eq('student_id', student_id);

			if (studentUpdateError) {
				console.error('Error updating student record:', studentUpdateError.message);
				return fail(500, { error: `Failed to update student data: ${studentUpdateError.message}` });
			}

			if (password && password.trim() !== '') {
				const { error: authUpdateError } = await locals.supabase.auth.admin.updateUserById(
					user_id,
					{ password: password }
				);

				if (authUpdateError) {
					console.error('Error updating auth user password:', authUpdateError.message);
					return fail(500, { error: `Student data updated, but failed to update password: ${authUpdateError.message}` });
				}
			}

			return { success: true, message: 'Student updated successfully.' };
		} catch (error: unknown) {
			let errorMessage = 'An unexpected error occurred while updating the student.';
			if (error instanceof Error) {
				errorMessage = error.message;
			}
			console.error('Server update student error:', errorMessage);
			return fail(500, { error: errorMessage });
		}
	}
};