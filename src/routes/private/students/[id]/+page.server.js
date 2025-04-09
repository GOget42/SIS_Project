import { redirect } from '@sveltejs/kit';
import { getStudentById } from '$lib/api/students';

export async function load({ params, locals }) {
    if (!locals.session) {
        throw redirect(302, '/login');
    }

    const student = await getStudentById(params.id);

    return {
        user: locals.user,
        student
    };
}
