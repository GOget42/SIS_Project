import type { RequestHandler } from './$types';
import { type CookieOptions, createServerClient } from '@supabase/ssr';
import { dev } from '$app/environment';
import { redirect } from '@sveltejs/kit';
import { PUBLIC_SUPABASE_ANON_KEY, PUBLIC_SUPABASE_URL } from '$env/static/public';

export const GET: RequestHandler = async ({ cookies }) => {
	const supabase = createServerClient(PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_ANON_KEY, {
		cookies: {
			getAll: () => {
				return cookies.getAll();
			},
			setAll: (cookieArray: { name: string; value: string; options: CookieOptions }[]) => {
				cookieArray.forEach(({ name, value, options }) => {
					cookies.set(name, value, { ...options, path: '/' });
				});
			}
		},
		cookieOptions: {
			path: '/',
			httpOnly: true,
			secure: !dev,
			sameSite: 'lax'
		}
	});

	const { error } = await supabase.auth.signOut();

	if (error) {
		console.error('[Logout Server Endpoint] Supabase sign out error:', error.message);
	} else {
		console.log(
			'[Logout Server Endpoint] Supabase sign out successful. Cookies should be cleared.'
		);
	}

	throw redirect(303, '/login');
};
