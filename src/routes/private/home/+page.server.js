import { redirect } from '@sveltejs/kit';

export async function load({ locals }) {
    if (!locals.session) {
        throw redirect(302, '/login');
    }

    return {
        user: locals.user
    };
}
