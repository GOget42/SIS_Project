// src/routes/private/staff/+page.server.ts
import { redirect, fail } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { PUBLIC_SUPABASE_URL } from '$env/static/public';

export const load: PageServerLoad = async ({ locals }) => {
    if (!locals.session) {
        throw redirect(302, '/login');
    }

    const { data: instructors, error: instructorsError } = await locals.supabase.from('instructors').select('*');
    const { data: admins, error: adminsError } = await locals.supabase.from('admins').select('*');

    if (instructorsError) {
        console.error('Error loading instructors:', instructorsError.message);
    }
    if (adminsError) {
        console.error('Error loading admins:', adminsError.message);
    }

    return {
        user: locals.user,
        instructors: instructors ?? [],
        admins: admins ?? []
    };
};

export const actions: Actions = {
    createInstructor: async ({ request, locals, fetch: eventFetch }) => {
        const formData = await request.formData();
        const first_name = formData.get('first_name') as string;
        const last_name = formData.get('last_name') as string;
        const email = formData.get('email') as string;
        const password = formData.get('password') as string; // Passwort direkt als string erwarten

        if (!first_name || !last_name || !email || !password) { // Passwort-Prüfung hinzugefügt
            return fail(400, { error: 'Missing required fields, including password.', first_name, last_name, email });
        }

        // Die automatische Passwortgenerierung wurde entfernt.
        // if (!password) {
        //     password = Math.random().toString(36).slice(-10) + 'aA1!';
        // }

        const supabaseFunctionUrl = `${PUBLIC_SUPABASE_URL}/functions/v1/create-user`;

        try {
            const response = await eventFetch(supabaseFunctionUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${locals.session?.access_token}`
                },
                body: JSON.stringify({ email, password, role: 'instructor', first_name, last_name })
            });

            const data = await response.json();

            if (!response.ok) {
                console.error('Error from create-user function (instructor):', data.error);
                return fail(response.status, { error: data.error || 'Failed to create instructor auth user' });
            }

            return { success: true, message: 'Instructor created successfully.' };
        } catch (error: unknown) {
            let message = 'An unexpected error occurred.';
            if (error instanceof Error) {
                message = error.message;
            }
            console.error('Server create instructor error:', message);
            return fail(500, { error: message });
        }
    },

    createAdmin: async ({ request, locals, fetch: eventFetch }) => {
        const formData = await request.formData();
        const first_name = formData.get('first_name') as string;
        const last_name = formData.get('last_name') as string;
        const email = formData.get('email') as string;
        const password = formData.get('password') as string; // Passwort direkt als string erwarten

        if (!first_name || !last_name || !email || !password) { // Passwort-Prüfung hinzugefügt
            return fail(400, { error: 'Missing required fields for admin, including password.', first_name, last_name, email });
        }
        // Die automatische Passwortgenerierung wurde entfernt.
        // if (!password) {
        //     password = Math.random().toString(36).slice(-10) + 'aA1!';
        // }

        const supabaseFunctionUrl = `${PUBLIC_SUPABASE_URL}/functions/v1/create-user`;

        try {
            const response = await eventFetch(supabaseFunctionUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${locals.session?.access_token}`
                },
                body: JSON.stringify({ email, password, role: 'admin', first_name, last_name })
            });
            const data = await response.json();

            if (!response.ok) {
                console.error('Error from create-user function (admin):', data.error);
                return fail(response.status, { error: data.error || 'Failed to create admin auth user' });
            }
            return { success: true, message: 'Admin created successfully.' };
        } catch (error: unknown) {
            let message = 'An unexpected error occurred.';
            if (error instanceof Error) {
                message = error.message;
            }
            console.error('Server create admin error:', message);
            return fail(500, { error: message });
        }
    },

    updateInstructor: async ({ request, locals }) => {
        if (!locals.session) throw redirect(303, '/login');
        const formData = await request.formData();

        const instructor_id = formData.get('instructor_id') as string;
        const user_id = formData.get('user_id') as string;
        const first_name = formData.get('first_name') as string;
        const last_name = formData.get('last_name') as string;
        const email = formData.get('email') as string;
        const password = formData.get('password') as string | null;

        if (!instructor_id || !user_id || !first_name || !last_name || !email) {
            return fail(400, { error: 'Missing required fields for update.', instructor_id, first_name, last_name, email });
        }

        try {
            const { error: instructorUpdateError } = await locals.supabase
              .from('instructors')
              .update({ first_name, last_name, email })
              .eq('instructor_id', instructor_id);

            if (instructorUpdateError) {
                console.error('Error updating instructor record:', instructorUpdateError.message);
                return fail(500, { error: `Failed to update instructor data: ${instructorUpdateError.message}` });
            }

            if (password && password.trim() !== '') {
                const { error: authUpdateError } = await locals.supabase.auth.admin.updateUserById(
                  user_id,
                  { password: password }
                );
                if (authUpdateError) {
                    console.error('Error updating auth user password for instructor:', authUpdateError.message);
                    return fail(500, { error: `Instructor data updated, but failed to update password: ${authUpdateError.message}` });
                }
            }
            return { success: true, message: 'Instructor updated successfully.' };
        } catch (error: unknown) {
            let message = 'An unexpected error occurred.';
            if (error instanceof Error) {
                message = error.message;
            }
            console.error('Server update instructor error:', message);
            return fail(500, { error: message });
        }
    },

    deleteInstructor: async ({ request, locals }) => {
        if (!locals.session) throw redirect(303, '/login');
        const formData = await request.formData();
        const instructor_id = formData.get('instructor_id') as string;
        const user_id = formData.get('user_id') as string;

        if (!instructor_id || !user_id) {
            return fail(400, { error: 'Missing instructor_id or user_id for deletion.' });
        }

        try {
            const { error: deleteInstructorError } = await locals.supabase
              .from('instructors')
              .delete()
              .eq('instructor_id', instructor_id);

            if (deleteInstructorError) {
                console.error('Error deleting instructor record:', deleteInstructorError.message);
                return fail(500, { error: `Failed to delete instructor record: ${deleteInstructorError.message}` });
            }

            const { error: deleteAuthUserError } = await locals.supabase.auth.admin.deleteUser(user_id);
            if (deleteAuthUserError) {
                console.error('Error deleting auth user for instructor:', deleteAuthUserError.message);
                return fail(500, { error: `Instructor record deleted, but failed to delete auth user: ${deleteAuthUserError.message}. Please check Supabase Auth users.` });
            }

            return { success: true, message: 'Instructor and auth user deleted successfully.' };
        } catch (error: unknown) {
            let message = 'An unexpected error occurred.';
            if (error instanceof Error) {
                message = error.message;
            }
            console.error('Server delete instructor error:', message);
            return fail(500, { error: message });
        }
    },

    deleteAdmin: async ({ request, locals }) => {
        if (!locals.session) throw redirect(303, '/login');
        const formData = await request.formData();
        const admin_id = formData.get('admin_id') as string;
        const user_id = formData.get('user_id') as string;

        if (!admin_id || !user_id) {
            return fail(400, { error: 'Missing admin_id or user_id for deletion.' });
        }

        try {
            const { error: deleteAdminError } = await locals.supabase
              .from('admins')
              .delete()
              .eq('admin_id', admin_id);

            if (deleteAdminError) {
                console.error('Error deleting admin record:', deleteAdminError.message);
                return fail(500, { error: `Failed to delete admin record: ${deleteAdminError.message}` });
            }

            const { error: deleteAuthUserError } = await locals.supabase.auth.admin.deleteUser(user_id);
            if (deleteAuthUserError) {
                console.error('Error deleting auth user for admin:', deleteAuthUserError.message);
                return fail(500, { error: `Admin record deleted, but failed to delete auth user: ${deleteAuthUserError.message}. Please check Supabase Auth users.` });
            }
            return { success: true, message: 'Admin and auth user deleted successfully.' };
        } catch (error: unknown) {
            let message = 'An unexpected error occurred.';
            if (error instanceof Error) {
                message = error.message;
            }
            console.error('Server delete admin error:', message);
            return fail(500, { error: message });
        }
    }
};