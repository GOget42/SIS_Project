// src/hooks.server.ts
import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { sequence } from '@sveltejs/kit/hooks';
import { redirect, type Handle, type HandleServerError } from '@sveltejs/kit';
import { PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_ANON_KEY } from '$env/static/public';
import type { Session, User } from '@supabase/supabase-js';

// Define custom types for event.locals
declare global {
	namespace App {
		interface Locals {
			supabase: ReturnType<typeof createServerClient>;
			session: Session | null;
			user: User | null;
                        getSession: () => Promise<Session | null>; // Added for getSession
		}
		// interface PageData {}
		// interface Error {}
		// interface Platform {}
	}
}

export const handleError: HandleServerError = ({ error }) => {
	console.error('Error occurred:', error);
        // event was removed because it was unused
	return { message: 'Something went wrong' };
};

const supabaseHandler: Handle = async ({ event, resolve }) => {
	console.log('🔍 [HOOK] Initializing Supabase Client');

	event.locals.supabase = createServerClient(PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_ANON_KEY, {
		cookies: {
			getAll: () => {
				const allCookies = event.cookies.getAll();
				// console.log('[HOOK] getAll cookies:', allCookies); // Optional: Logging
				return allCookies;
			},
			setAll: (cookieArray: { name: string; value: string; options: CookieOptions }[]) => {
				// console.log('[HOOK] setAll cookies:', cookieArray); // Optional: Logging
				cookieArray.forEach(({ name, value, options }) => {
					event.cookies.set(name, value, { ...options, path: '/' });
				});
			}
		},
		cookieOptions: {
			path: '/',
			httpOnly: true,
			secure: process.env.NODE_ENV === 'production',
			sameSite: 'lax'
		}
	});

	event.locals.getSession = async () => {
		const {
			data: { session }
		} = await event.locals.supabase.auth.getSession();
		return session;
	};

	try {
		const {
			data: { session: currentSessionData }
		} = await event.locals.supabase.auth.getSession();

		if (currentSessionData && currentSessionData.access_token) {
			event.locals.session = currentSessionData; // Gültige Session gefunden und gesetzt
			const {
				data: { user },
				error: userError
			} = await event.locals.supabase.auth.getUser();

			if (userError) {
				console.error('❌ [HOOK] Error fetching user for locals.user:', userError.message);
				event.locals.user = null;
				event.locals.session = null;
				const { error: signOutError } = await event.locals.supabase.auth.signOut();
				if (signOutError) {
					console.error('❗ [HOOK] Error during signOut (userError case):', signOutError.message);
				} else {
					console.log('🗑️ [HOOK] Session cleared due to user fetch error.');
				}
			} else if (user) {
				event.locals.user = user;
			} else {
                                // getUser returned no error, but the user is null.
				console.warn('⚠️ [HOOK] User data is null after getUser() without an error. Clearing session.');
				event.locals.user = null;
				event.locals.session = null;
				const { error: signOutError } = await event.locals.supabase.auth.signOut();
				if (signOutError) {
					console.error('❗ [HOOK] Error during signOut (null user, no error case):', signOutError.message);
				} else {
					console.log('🗑️ [HOOK] Session cleared due to null user without error.');
				}
			}
		} else {
                        // currentSessionData is null OR currentSessionData is missing access_token
			event.locals.user = null;
			event.locals.session = null;
			if (currentSessionData) {
                                // currentSessionData existed but was invalid (e.g., no access_token)
				console.warn('⚠️ [HOOK] Session data found but was invalid (e.g., no access_token). Clearing session.');
				const { error: signOutError } = await event.locals.supabase.auth.signOut();
				if (signOutError) {
					console.error('❗ [HOOK] Error during signOut (invalid session data):', signOutError.message);
				} else {
					console.log('🗑️ [HOOK] Session cleared due to invalid session data.');
				}
			}
			// Wenn currentSessionData von Anfang an null war, gibt es keine aktive Sitzung zum Abmelden.
		}
	} catch (err: unknown) { // Geändert von any zu unknown
		let errorMessage = 'Unknown error during session/user population';
		if (err instanceof Error) {
			errorMessage = err.message;
		} else if (typeof err === 'string') {
			errorMessage = err;
		}
		console.error(`❗ [HOOK] Error: ${errorMessage}`, err);
		event.locals.session = null;
		event.locals.user = null;

                // Try to clear client-side session cookies if the Supabase client is available
		if (event.locals.supabase && event.locals.supabase.auth) {
			console.log('ℹ️ [HOOK] Attempting to clear session due to error during population.');
			const { error: signOutError } = await event.locals.supabase.auth.signOut();
			if (signOutError) {
				console.error('❗ [HOOK] Error during signOut in catch block:', signOutError.message);
			} else {
				console.log('🗑️ [HOOK] Session cleared in catch block.');
			}
		}
	}

	return resolve(event, {
		filterSerializedResponseHeaders: (name: string) => name === 'content-range' || name === 'x-supabase-api-version'
	});
};

const authGuard: Handle = async ({ event, resolve }) => {
	const { session } = event.locals;
	const { pathname } = event.url;

	if (!session && pathname.startsWith('/private')) {
		throw redirect(303, '/login');
	}

	if (session && (pathname === '/login' || pathname === '/register')) {
		throw redirect(303, '/private/home');
	}

	if (session && pathname === '/') {
		throw redirect(303, '/private/home');
	}

	return resolve(event);
};

export const handle = sequence(supabaseHandler, authGuard);