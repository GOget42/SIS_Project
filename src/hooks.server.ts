// src/hooks.server.ts
import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { sequence } from '@sveltejs/kit/hooks';
import { redirect, type Handle, type HandleServerError } from '@sveltejs/kit';
import { PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_ANON_KEY } from '$env/static/public';
import type { Session, User } from '@supabase/supabase-js';

// Definiere benutzerdefinierte Typen für event.locals
declare global {
	namespace App {
		interface Locals {
			supabase: ReturnType<typeof createServerClient>;
			session: Session | null;
			user: User | null;
		}
		// interface PageData {}
		// interface Error {}
		// interface Platform {}
	}
}

export const handleError: HandleServerError = ({ error }) => {
	console.error('Error occurred:', error);
	// event wurde entfernt, da es nicht verwendet wurde
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
					event.cookies.set(name, value, options);
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

	try {
		const { data: { session } } = await event.locals.supabase.auth.getSession();
		console.log('🔑 [HOOK] Session:', session ? session.user?.id : null);
		if (session && session.access_token) {
			const { data: { user }, error: userError } = await event.locals.supabase.auth.getUser();
			if (userError) {
				console.error('❌ [HOOK] Error validating user:', userError.message);
				event.locals.session = null;
				event.locals.user = null;
			} else {
				console.log('✅ [HOOK] Authenticated user:', user?.id);
				event.locals.session = session;
				event.locals.user = user;
			}
		} else {
			console.log('🚫 [HOOK] No valid session found');
			event.locals.session = null;
			event.locals.user = null;
		}
	} catch (err: any) {
		console.error('❗ [HOOK] Error fetching session or user:', err?.message || err);
		event.locals.session = null;
		event.locals.user = null;
	}

	return resolve(event, {
		filterSerializedResponseHeaders: (name: string) =>
			name === 'content-range' || name === 'x-supabase-api-version'
	});
};

const authGuard: Handle = async ({ event, resolve }) => {
	const { session, user } = event.locals;
	const { pathname } = event.url;

	console.log(`[GUARD] Path: ${pathname}, User: ${user?.id}, Session: ${session ? 'exists' : 'null'}`);

	if (!session && pathname.startsWith('/private')) {
		console.log(`🚷 [GUARD] Redirecting unauthenticated access from: ${pathname} to /login`);
		throw redirect(303, '/login');
	}

	if (session && (pathname === '/login' || pathname === '/register')) {
		console.log(`↪️ [GUARD] Already logged in, redirecting from ${pathname} to /private/home`);
		throw redirect(303, '/private/home');
	}

	// Spezifische Weiterleitung von der Stammroute, wenn eingeloggt
	if (session && pathname === '/') {
		console.log(`↪️ [GUARD] User is logged in and on '/', redirecting to /private/home`);
		throw redirect(303, '/private/home');
	}

	return resolve(event);
};

export const handle = sequence(supabaseHandler, authGuard);