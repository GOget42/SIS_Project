import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	if (locals.user) {
		console.log('[ROOT PAGE LOAD] User is logged in, redirecting from / to /private/home');
		throw redirect(303, '/private/home');
	}
	// If the user is not logged in, render the public page so it can show login or signup links
	return {};
};
