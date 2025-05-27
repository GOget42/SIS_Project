// src/routes/private/+layout.server.ts
import { redirect } from '@sveltejs/kit';

export async function load({ locals }) {
	if (!locals.session) {
		throw redirect(303, '/login');
	}

	return {
		session: locals.session,
		user: locals.user
	};
}
