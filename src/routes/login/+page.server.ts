import { fail, redirect } from '@sveltejs/kit';
import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { PUBLIC_SUPABASE_ANON_KEY, PUBLIC_SUPABASE_URL } from '$env/static/public';
import { dev } from '$app/environment';
import type { Actions, PageServerLoad } from './$types';

// Redirect immediately if a logged-in user accesses /login
export const load: PageServerLoad = async ({ locals, url }) => {
	if (locals.session) {
		console.log(
			'[LOGIN LOAD] User already logged in, redirecting to /private/home from',
			url.pathname
		);
		throw redirect(303, '/private/home');
	}
	// Nothing to load when the user is not logged in
	return {};
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

		// Recreate the Supabase client here because locals.supabase is not always reliable in actions
		// for auth operations that need to set cookies directly.
		const supabase = createServerClient(PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_ANON_KEY, {
			cookies: {
				getAll: () => {
					const allCookies = cookies.getAll();
					return allCookies;
				},
				setAll: (cookieArray: { name: string; value: string; options: CookieOptions }[]) => {
					cookieArray.forEach(({ name, value, options }) => {
						cookies.set(name, value, { ...options, path: '/' }); // Ensure path is set
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

		const { data, error: signInError } = await supabase.auth.signInWithPassword({
			email,
			password
		});

		if (signInError) {
			console.error('[LOGIN ACTION] Supabase signInWithPassword error:', signInError.message);
			return fail(401, { email, error: signInError.message });
		}

		console.log('[LOGIN ACTION] Supabase signInWithPassword success. User:', data.user?.id);
		// Cookies are set by the Supabase client.
		// The session will be loaded on the next request via the hook.
		throw redirect(303, '/private/home');
	}
};
