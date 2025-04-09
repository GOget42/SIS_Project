import { redirect } from '@sveltejs/kit';

export async function load({ params, locals }) {
    if (!locals.session) {
        throw redirect(302, '/login');
    }

    const { data: course, error } = await locals.supabase
      .from('courses')
      .select('*')
      .eq('course_id', params.id)
      .single();

    if (error) {
        console.error(error);
        throw redirect(302, '/private/courses');
    }

    return {
        user: locals.user,
        course
    };
}
