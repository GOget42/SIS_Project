import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
    if (!locals.session || !locals.user) {
        throw redirect(302, '/login');
    }

    const user = locals.user;
    let profile: any = null;
    let role: string = user.user_metadata?.role || '';
    let courses: any[] = [];

    try {
        if (role === 'student') {
            const { data: studentData, error: studentError } = await locals.supabase
              .from('students')
              .select('student_id, first_name, last_name, email')
              .eq('user_id', user.id)
              .single();

            if (studentError) throw studentError;
            if (studentData) {
                profile = studentData;
                const { data: enrolledCourses, error: enrollError } = await locals.supabase
                  .from('enrollments')
                  .select('courses (course_id, course_name, format, ects)')
                  .eq('student_id', studentData.student_id);

                if (enrollError) throw enrollError;
                courses = enrolledCourses?.map(e => e.courses) || [];
            }
        } else if (role === 'instructor') {
            const { data: instructorData, error: instructorError } = await locals.supabase
              .from('instructors')
              .select('instructor_id, first_name, last_name, email')
              .eq('user_id', user.id)
              .single();

            if (instructorError) throw instructorError;
            if (instructorData) {
                profile = instructorData;
                const { data: teachingCourses, error: coursesError } = await locals.supabase
                  .from('courses')
                  .select('course_id, course_name, format, ects')
                  .eq('instructor_id', instructorData.instructor_id);

                if (coursesError) throw coursesError;
                courses = teachingCourses || [];
            }
        } else if (role === 'admin') {
            // Admin-Profil aus der 'admins'-Tabelle abrufen
            const { data: adminData, error: adminError } = await locals.supabase
              .from('admins')
              .select('first_name, email') // Stellen Sie sicher, dass die benötigten Felder ausgewählt werden
              .eq('user_id', user.id)
              .single();

            if (adminError && adminError.code !== 'PGRST116') { // PGRST116: Zeile nicht gefunden (erwartet bei .single())
                console.error(`Error fetching admin profile for user ${user.id}: ${adminError.message}. Falling back to defaults.`);
                // Fallback, falls ein Datenbankfehler auftritt
                profile = {
                    first_name: user.email?.split('@')[0] || 'Admin',
                    email: user.email
                };
            } else if (adminData) {
                // Admin-Daten erfolgreich aus der Tabelle 'admins' abgerufen
                profile = {
                    first_name: adminData.first_name,
                    email: adminData.email
                };
            } else {
                // Kein Admin-Eintrag in der Tabelle 'admins' für diese user_id (PGRST116 oder adminData ist null)
                // Dies kann passieren, wenn ein Admin-Benutzer in Auth, aber nicht in der 'admins'-Tabelle erstellt wurde.
                console.warn(`Admin record not found in 'admins' table for user_id: ${user.id}. Using default derived profile.`);
                profile = {
                    first_name: user.email?.split('@')[0] || 'Admin',
                    email: user.email
                };
            }
            // Admins haben in diesem Kontext keine direkt zugeordneten "Kurse"
        }
    } catch (error: any) { // Typ 'any' beibehalten gemäß Originalcode, aber 'unknown' wäre besser
        console.error(`Error loading dashboard data for role ${role}:`, error.message);
        // Profil und Kurse bleiben bei einem Fehler leer/null, das Frontend sollte dies behandeln.
    }

    return {
        user: user,
        profile: profile,
        role: role,
        courses: courses
    };
};