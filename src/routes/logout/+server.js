import { redirect } from '@sveltejs/kit';

export async function POST({ locals }) {
	// 🧹 Sign out Supabase session server-side
	await locals.supabase.auth.signOut();

	// 🧹 Clear user & session on locals (optional, SvelteKit will anyway recreate)
	locals.user = null;
	locals.session = null;

	// 🧹 Redirect to login cleanly
	throw redirect(303, '/login');
}
