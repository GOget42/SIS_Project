import { redirect, fail } from '@sveltejs/kit';

export async function load({ locals }) {
    if (!locals.session) throw redirect(302, '/login');

    const { data: instructors } = await locals.supabase.from('instructors').select('*');
    const { data: admins } = await locals.supabase.from('admins').select('*');

    return {
        user: locals.user,
        instructors: instructors ?? [],
        admins: admins ?? []
    };
}

export const actions = {
    createInstructor: async ({ request, locals }) => {
        const formData = await request.formData();
        const first_name = formData.get('first_name');
        const last_name = formData.get('last_name');
        const email = formData.get('email');

        const password = Math.random().toString(36).slice(-10) + '!Aa1';

        try {
            const response = await fetch('https://aylyakkvlvfptimufmwo.functions.supabase.co/create-user', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${locals.session.access_token}`
                },
                body: JSON.stringify({ email, password, role: 'instructor', first_name, last_name })
            });

            const data = await response.json();

            if (!response.ok) {
                return fail(400, { error: data.error || 'Failed to create instructor' });
            }

            return { success: true };
        } catch (error) {
            console.error('Error creating instructor:', error.message);
            return fail(500, { error: error.message });
        }
    },

    createAdmin: async ({ request, locals }) => {
        const formData = await request.formData();
        const first_name = formData.get('first_name');
        const last_name = formData.get('last_name');
        const email = formData.get('email');

        const password = Math.random().toString(36).slice(-10) + '!Aa1';

        try {
            const response = await fetch('https://aylyakkvlvfptimufmwo.functions.supabase.co/create-user', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${locals.session.access_token}`
                },
                body: JSON.stringify({ email, password, role: 'admin', first_name, last_name })
            });

            const data = await response.json();

            if (!response.ok) {
                return fail(400, { error: data.error || 'Failed to create admin' });
            }

            return { success: true };
        } catch (error) {
            console.error('Error creating admin:', error.message);
            return fail(500, { error: error.message });
        }
    }
};
