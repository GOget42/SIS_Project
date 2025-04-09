// src/routes/login/+page.server.js
import { fail, redirect } from '@sveltejs/kit';
import { createServerClient } from '@supabase/ssr';
import { PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_ANON_KEY } from '$env/static/public';

/** @type {import('./$types').Actions} */
export const actions = {
	login: async ({ request, cookies, fetch }) => {
		const formData = await request.formData();
		const email = formData.get('email');
		const password = formData.get('password');

		const supabase = createServerClient(PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_ANON_KEY, {
			cookies: {
				getAll: () => cookies.getAll(),
				setAll: (cookiesToSet) => {
					cookiesToSet.forEach(({ name, value, options }) => {
						cookies.set(name, value, { ...options, path: '/' });
					});
				}
			},
			global: { fetch }
		});

		const { error } = await supabase.auth.signInWithPassword({ email, password });

		if (error) {
			return fail(400, { error: error.message });
		}

		throw redirect(303, '/private/home');
	}
};
