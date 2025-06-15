// src/routes/private/staff/+page.server.ts
import { redirect, fail } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { PUBLIC_SUPABASE_URL } from '$env/static/public';

export const load: PageServerLoad = async ({ locals, url }) => {
	if (!locals.session || !locals.user) {
		throw redirect(302, '/login');
	}

	// Sortierparameter aus der URL lesen
	const sortByParam = url.searchParams.get('sort_by');
	const sortOrderParam = url.searchParams.get('sort_order');

	const validSortColumns = ['first_name', 'last_name', 'email'];
	let sortBy = (sortByParam && validSortColumns.includes(sortByParam)) ? sortByParam : 'last_name'; // Standard-Sortierung
	let sortOrder : 'asc' | 'desc' = (sortOrderParam === 'desc') ? 'desc' : 'asc';
	const ascending = sortOrder === 'asc';

	// Dozenten abrufen und sortieren
	let instructorsQuery = locals.supabase.from('instructors').select('*');
	if (validSortColumns.includes(sortBy)) {
		instructorsQuery = instructorsQuery.order(sortBy, { ascending });
	}
	const { data: instructors, error: instructorsError } = await instructorsQuery;

	// Admins abrufen und sortieren (gleiche Sortierlogik anwenden)
	let adminsQuery = locals.supabase.from('admins').select('*');
	if (validSortColumns.includes(sortBy)) {
		adminsQuery = adminsQuery.order(sortBy, { ascending });
	}
	const { data: admins, error: adminsError } = await adminsQuery;

	if (instructorsError) {
		console.error('Error loading instructors:', instructorsError.message);
	}
	if (adminsError) {
		console.error('Error loading admins:', adminsError.message);
	}

	return {
		user: locals.user,
		instructors: instructors ?? [],
		admins: admins ?? [],
		sortBy: sortBy,
		sortOrder: sortOrder
	};
};

export const actions: Actions = {
	createInstructor: async ({ request, locals, fetch: eventFetch }) => {
		const formData = await request.formData();
		const first_name = formData.get('first_name') as string;
		const last_name = formData.get('last_name') as string;
		const email = formData.get('email') as string;
		const password = formData.get('password') as string;

		if (!first_name || !last_name || !email || !password) {
			return fail(400, { error: 'Missing required fields, including password.', first_name, last_name, email, action: '?/createInstructor', success: false });
		}

		const supabaseFunctionUrl = `${PUBLIC_SUPABASE_URL}/functions/v1/create-user`;

		try {
			const response = await eventFetch(supabaseFunctionUrl, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					'Authorization': `Bearer ${locals.session?.access_token}`
				},
				body: JSON.stringify({ email, password, role: 'instructor', first_name, last_name })
			});

			const data = await response.json();

			if (!response.ok) {
				console.error('Error from create-user function (instructor):', data.error);
				return fail(response.status, { error: data.error || 'Failed to create instructor auth user', action: '?/createInstructor', success: false });
			}

			return { success: true, message: 'Instructor created successfully.', action: '?/createInstructor' };
		} catch (error: unknown) {
			let message = 'An unexpected error occurred.';
			if (error instanceof Error) {
				message = error.message;
			}
			console.error('Server create instructor error:', message);
			return fail(500, { error: message, action: '?/createInstructor', success: false });
		}
	},

	createAdmin: async ({ request, locals, fetch: eventFetch }) => {
		const formData = await request.formData();
		const first_name = formData.get('first_name') as string;
		const last_name = formData.get('last_name') as string;
		const email = formData.get('email') as string;
		const password = formData.get('password') as string;

		if (!first_name || !last_name || !email || !password) {
			return fail(400, { error: 'Missing required fields for admin, including password.', first_name, last_name, email, action: '?/createAdmin', success: false });
		}

		const supabaseFunctionUrl = `${PUBLIC_SUPABASE_URL}/functions/v1/create-user`;

		try {
			const response = await eventFetch(supabaseFunctionUrl, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					'Authorization': `Bearer ${locals.session?.access_token}`
				},
				body: JSON.stringify({ email, password, role: 'admin', first_name, last_name })
			});
			const data = await response.json();

			if (!response.ok) {
				console.error('Error from create-user function (admin):', data.error);
				return fail(response.status, { error: data.error || 'Failed to create admin auth user', action: '?/createAdmin', success: false });
			}
			return { success: true, message: 'Admin created successfully.', action: '?/createAdmin' };
		} catch (error: unknown) {
			let message = 'An unexpected error occurred.';
			if (error instanceof Error) {
				message = error.message;
			}
			console.error('Server create admin error:', message);
			return fail(500, { error: message, action: '?/createAdmin', success: false });
		}
	},
};