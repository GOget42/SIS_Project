import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = async ({ locals }) => {
	console.log('[+layout.server.ts] locals.user:', locals.user?.id);
	return {
		user: locals.user // locals.user is set in hooks.server.ts
		// session: locals.session // if needed
	};
};
