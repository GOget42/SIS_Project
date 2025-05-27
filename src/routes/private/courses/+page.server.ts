import { redirect, fail } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
    if (!locals.session || !locals.user) {
        throw redirect(302, '/login');
    }

    const user = locals.user;
    let studentProfile: { student_id: string } | null = null;
    let enrolledCourseIds: string[] = [];

    // Lade alle Kurse
    const { data: courses, error: coursesError } = await locals.supabase
      .from('courses')
      .select('*, instructors (instructor_id, first_name, last_name)'); // Join für Anzeige des Instruktors

    if (coursesError) {
        console.error('Error loading courses:', coursesError.message);
        // fail() könnte hier verwendet werden, wenn das Laden der Kurse kritisch ist
    }

    // Lade alle Instruktoren für das Formular "Kurs erstellen"
    const { data: instructors, error: instructorsError } = await locals.supabase
      .from('instructors')
      .select('instructor_id, first_name, last_name');

    if (instructorsError) {
        console.error('Error loading instructors:', instructorsError.message);
    }

    // Wenn der Benutzer ein Student ist, lade sein Profil und seine Einschreibungen
    if (user.user_metadata?.role === 'student') {
        const { data: student, error: studentError } = await locals.supabase
          .from('students')
          .select('student_id')
          .eq('user_id', user.id)
          .single();

        if (studentError) {
            console.error('Error loading student profile for courses page:', studentError.message);
        } else if (student) {
            studentProfile = student;
            const { data: enrollments, error: enrollmentsError } = await locals.supabase
              .from('enrollments')
              .select('course_id')
              .eq('student_id', student.student_id);

            if (enrollmentsError) {
                console.error('Error loading student enrollments:', enrollmentsError.message);
            } else {
                enrolledCourseIds = enrollments?.map(e => e.course_id) || [];
            }
        }
    }

    return {
        user: user,
        courses: courses ?? [],
        instructors: instructors ?? [],
        studentProfile: studentProfile, // Kann null sein
        enrolledCourseIds: enrolledCourseIds
    };
};

export const actions: Actions = {
    createCourse: async ({ request, locals }) => {
        if (!locals.session) throw redirect(303, '/login');
        // Berechtigungsprüfung: Nur Admins oder Instruktoren dürfen Kurse erstellen
        const userRole = locals.user?.user_metadata?.role;
        if (userRole !== 'admin' && userRole !== 'instructor') {
            return fail(403, { error: 'You are not authorized to create courses.' });
        }

        const formData = await request.formData();
        const course_name = formData.get('course_name') as string;
        const ects = parseInt(formData.get('ects') as string);
        const hours = parseInt(formData.get('hours') as string);
        const format = formData.get('format') as string;
        const instructor_id = formData.get('instructor_id') as string;

        if (!course_name || isNaN(ects) || isNaN(hours) || !format || !instructor_id) {
            return fail(400, { error: 'Missing required fields or invalid data for creating course.', course_name, ects, hours, format, instructor_id });
        }

        try {
            const { error } = await locals.supabase
              .from('courses')
              .insert([{ course_name, ects, hours, format, instructor_id }]);

            if (error) {
                console.error('Error creating course:', error.message);
                return fail(500, { error: `Failed to create course: ${error.message}` });
            }
            return { success: true, message: 'Course created successfully.' };
        } catch (e: any) {
            console.error('Server create course error:', e.message);
            return fail(500, { error: e.message || 'An unexpected error occurred.' });
        }
    },

    enrollStudent: async ({ request, locals }) => {
        if (!locals.session || !locals.user) throw redirect(303, '/login');
        if (locals.user.user_metadata?.role !== 'student') {
            return fail(403, { error: 'Only students can enroll in courses.' });
        }

        const formData = await request.formData();
        const course_id = formData.get('course_id') as string;
        const student_id = formData.get('student_id') as string; // Wird vom Frontend gesendet

        if (!course_id || !student_id) {
            return fail(400, { error: 'Missing course_id or student_id for enrollment.' });
        }

        try {
            const { error } = await locals.supabase
              .from('enrollments')
              .insert({ student_id, course_id, enrollment_date: new Date().toISOString() });

            if (error) {
                console.error('Error enrolling student:', error.message);
                return fail(500, { error: `Failed to enroll: ${error.message}` });
            }
            return { success: true, message: 'Enrolled successfully!' };
        } catch (e: any) {
            console.error('Server enroll student error:', e.message);
            return fail(500, { error: e.message || 'An unexpected error occurred.' });
        }
    },

    disenrollStudent: async ({ request, locals }) => {
        if (!locals.session || !locals.user) throw redirect(303, '/login');
        if (locals.user.user_metadata?.role !== 'student') {
            return fail(403, { error: 'Only students can disenroll from courses.' });
        }

        const formData = await request.formData();
        const course_id = formData.get('course_id') as string;
        const student_id = formData.get('student_id') as string; // Wird vom Frontend gesendet

        if (!course_id || !student_id) {
            return fail(400, { error: 'Missing course_id or student_id for disenrollment.' });
        }

        try {
            const { error } = await locals.supabase
              .from('enrollments')
              .delete()
              .eq('student_id', student_id)
              .eq('course_id', course_id);

            if (error) {
                console.error('Error disenrolling student:', error.message);
                return fail(500, { error: `Failed to disenroll: ${error.message}` });
            }
            return { success: true, message: 'Disenrolled successfully!' };
        } catch (e: any) {
            console.error('Server disenroll student error:', e.message);
            return fail(500, { error: e.message || 'An unexpected error occurred.' });
        }
    }
};