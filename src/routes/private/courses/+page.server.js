import { redirect } from '@sveltejs/kit';

export async function load({ locals }) {
    if (!locals.session) {
        throw redirect(302, '/login');
    }

    const { data: courses, error } = await locals.supabase.from('courses').select('*');
    if (error) {
        console.error(error);
    }

    return {
        user: locals.user,
        courses: courses ?? []
    };
}
