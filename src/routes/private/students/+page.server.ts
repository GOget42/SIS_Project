import { redirect, fail } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { PUBLIC_SUPABASE_URL } from '$env/static/public';
// SUPABASE_SERVICE_ROLE_KEY und createClient werden nicht mehr für Admin-Aktionen auf dieser Seite benötigt.

export const load: PageServerLoad = async ({ locals, url }) => {
	if (!locals.session) {
		throw redirect(302, '/login');
	}

	const sortBy = url.searchParams.get('sortBy') || 'last_name'; // Standard-Sortierung
	const sortOrder = url.searchParams.get('sortOrder') || 'asc'; // Standard-Reihenfolge

	const validSortColumns = ['first_name', 'last_name', 'email'];
	const columnToSort = validSortColumns.includes(sortBy) ? sortBy : 'last_name';
	const ascending = sortOrder === 'asc';

	// user_id wird für die Anzeige benötigt, aber nicht mehr für Edit/Delete auf dieser Seite
	const { data: students, error } = await locals.supabase
		.from('students')
		.select('student_id, first_name, last_name, email, user_id') // user_id beibehalten, falls es für Links oder andere Zwecke benötigt wird
		.order(columnToSort, { ascending: ascending });

	if (error) {
		console.error('Error loading students:', error.message);
	}

	return {
		user: locals.user,
		students: students ?? [],
		sortBy,
		sortOrder
	};
};

export const actions: Actions = {
	createStudent: async ({ request, locals, fetch: eventFetch }) => {
		const formData = await request.formData();
		const first_name = formData.get('first_name') as string;
		const last_name = formData.get('last_name') as string;
		const email = formData.get('email') as string;
		const password = formData.get('password') as string;

		if (!first_name || !last_name || !email || !password) {
			return fail(400, { error: 'Missing required fields.', first_name, last_name, email });
		}

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
				return fail(createUserResponse.status, { error: createUserData.error || 'Failed to create auth user', first_name, last_name, email });
			}

			return { success: true, message: 'Student created successfully.' };
		} catch (error: unknown) {
			let errorMessage = 'An unexpected error occurred while creating the student.';
			if (error instanceof Error) {
				errorMessage = error.message;
			}
			console.error('Server create student error:', errorMessage);
			return fail(500, { error: errorMessage, first_name, last_name, email });
		}
	}
	// updateStudent action removed
	// deleteStudent action removed
};