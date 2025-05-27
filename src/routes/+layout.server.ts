// src/routes/+layout.server.ts
import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = async ({ locals }) => {
	console.log('[+layout.server.ts] locals.user:', locals.user?.id);
	return {
		user: locals.user // locals.user wird von hooks.server.ts gesetzt
		// session: locals.session // falls benötigt
	};
};