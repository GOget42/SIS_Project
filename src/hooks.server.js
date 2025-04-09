// src/hooks.server.js
import { createServerClient } from '@supabase/ssr';
import { sequence } from '@sveltejs/kit/hooks';
import { redirect } from '@sveltejs/kit';
import { PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_ANON_KEY } from '$env/static/public';

const supabaseHandler = async ({ event, resolve }) => {
	// Create a Supabase server-side client using SvelteKit's cookies API
	const supabaseClient = createServerClient(PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_ANON_KEY, {
		cookies: {
			get: (name) => event.cookies.get(name),
			set: (name, value, options) => event.cookies.set(name, value, options)
		}
	});

	event.locals.supabase = supabaseClient;

	try {
		// Get the session stored in cookies
		const { data: { session } } = await supabaseClient.auth.getSession();
		if (session && session.access_token) {
			// Validate the user by fetching it from Supabase Auth server
			const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
			if (userError) {
				console.error('Error validating user:', userError.message);
				event.locals.session = null;
				event.locals.user = null;
			} else {
				event.locals.session = session;
				event.locals.user = user;
			}
		} else {
			event.locals.session = null;
			event.locals.user = null;
		}
	} catch (err) {
		console.error('Error fetching session or user:', err);
		event.locals.session = null;
		event.locals.user = null;
	}

	return resolve(event, {
		filterSerializedResponseHeaders: (name) =>
			name === 'content-range' || name === 'x-supabase-api-version'
	});
};

const authGuard = async ({ event, resolve }) => {
	// Redirect unauthenticated users from private pages
	if (!event.locals.session && event.url.pathname.startsWith('/private')) {
		throw redirect(303, '/login');
	}

	// Redirect logged-in users away from the login page
	if (event.locals.session && event.url.pathname === '/login') {
		throw redirect(303, '/private/home');
	}

	return resolve(event);
};

export const handle = sequence(supabaseHandler, authGuard);
