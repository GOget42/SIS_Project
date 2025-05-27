// src/routes/login/+page.server.ts
import { fail, redirect } from '@sveltejs/kit';
import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { PUBLIC_SUPABASE_ANON_KEY, PUBLIC_SUPABASE_URL } from '$env/static/public';
import { dev } from '$app/environment';
import type { Actions, PageServerLoad } from './$types';

// Wenn ein bereits eingeloggter Benutzer /login aufruft, direkt weiterleiten
export const load: PageServerLoad = async ({ locals, url }) => {
	if (locals.session) {
		console.log('[LOGIN LOAD] User already logged in, redirecting to /private/home from', url.pathname);
		throw redirect(303, '/private/home');
	}
	return {}; // Keine Daten zu laden, wenn nicht eingeloggt
};

export const actions: Actions = {
	default: async ({ request, cookies, locals }) => {
		const formData = await request.formData();
		const email = formData.get('email') as string;
		const password = formData.get('password') as string;

		if (!email || !password) {
			return fail(400, { email, error: 'Email and password are required.' });
		}

		console.log('[LOGIN ACTION] Attempting login for:', email);

		// Supabase Client wird hier neu erstellt, da locals.supabase in Actions nicht immer zuverlässig ist
		// für auth-Operationen, die Cookies direkt setzen müssen.
		const supabase = createServerClient(PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_ANON_KEY, {
			cookies: {
				getAll: () => {
					const allCookies = cookies.getAll();
					return allCookies;
				},
				setAll: (cookieArray: { name: string; value: string; options: CookieOptions }[]) => {
					cookieArray.forEach(({ name, value, options }) => {
						cookies.set(name, value, { ...options, path: '/' }); // Sicherstellen, dass path gesetzt ist
					});
				}
			},
			cookieOptions: {
				path: '/',
				httpOnly: true,
				sameSite: 'lax',
				secure: !dev
			}
		});

		const { data, error: signInError } = await supabase.auth.signInWithPassword({ email, password });

		if (signInError) {
			console.error('[LOGIN ACTION] Supabase signInWithPassword error:', signInError.message);
			return fail(401, { email, error: signInError.message });
		}

		console.log('[LOGIN ACTION] Supabase signInWithPassword success. User:', data.user?.id);
		// Cookies werden durch Supabase Client gesetzt.
		// Die Session wird im nächsten Request durch den Hook geladen.
		throw redirect(303, '/private/home');
	}
};