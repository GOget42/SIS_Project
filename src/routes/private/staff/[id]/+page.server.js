import { redirect } from '@sveltejs/kit';
import { getStaffById } from '$lib/api/staff';

export async function load({ params, locals }) {
	if (!locals.session) {
		throw redirect(302, '/login');
	}

	const staff = await getStaffById(params.id);

	return {
		user: locals.user,
		staff
	};
}
