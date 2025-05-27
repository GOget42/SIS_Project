// src/routes/+page.server.ts
import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	if (locals.user) {
		console.log('[ROOT PAGE LOAD] User is logged in, redirecting from / to /private/home');
		throw redirect(303, '/private/home');
	}
	// Wenn nicht eingeloggt, einfach die Seite laden (die dann z.B. Links zu Login/Register anzeigt)
	return {};
};