// src/routes/private/students/[id]/+page.server.ts
import { redirect, fail } from '@sveltejs/kit';
import { getStudentById } // Angenommen, diese Funktion existiert und gibt Student oder null zurück
// TODO: Stellen Sie sicher, dass getStudentById korrekt implementiert ist und den Student-Typ zurückgibt,
// der { student_id: number, ... } entspricht.
    from '$lib/api/students.js';
import type { Actions, PageServerLoad } from './$types';

// Interne Typdefinitionen für diese Server-Datei
interface Assignment {
    assignment_id: string; // UUID
    assignment_name: string;
    grade: number | null;
    weight: number | null;
    max_points: number | null;
    due_date: string | null; // Format YYYY-MM-DD
}

interface EnrolledCourseData {
    enrollment_id: number;
    courses: { // Supabase nistet dies als Objekt, wenn es eine 1:1-Beziehung ist
        course_id: number;
        course_name: string;
    } | null;
    assignments: Assignment[];
}

interface AvailableCourseData {
    course_id: number;
    course_name: string;
}

export const load: PageServerLoad = async ({ params, locals }) => {
    if (!locals.session) {
        throw redirect(302, '/login');
    }

    const student_id_param = parseInt(params.id, 10);
    if (isNaN(student_id_param)) {
        return fail(400, { error: 'Invalid student ID format.' });
    }

    // TODO: Stellen Sie sicher, dass getStudentById params.id (string) korrekt behandelt oder student_id_param (number) erwartet.
    // Für Konsistenz, wenn getStudentById eine string ID erwartet:
    const student = await getStudentById(params.id);
    // Wenn getStudentById eine number ID erwartet:
    // const student = await getStudentById(student_id_param);


    let availableCourses: AvailableCourseData[] = [];
    let enrolledCourses: EnrolledCourseData[] = [];

    if (student && student.student_id) { // student.student_id sollte hier eine Zahl sein
        // Kurse abrufen, in denen der Student NICHT eingeschrieben ist
        const { data: enrolledCourseIdsData, error: idsError } = await locals.supabase
          .from('enrollments')
          .select('course_id')
          .eq('student_id', student.student_id);

        if (idsError) {
            console.error('Error fetching enrolled course IDs:', idsError.message);
        }

        const enrolledCourseIds = enrolledCourseIdsData?.map(e => e.course_id) || [];

        const courseQuery = locals.supabase.from('courses').select('course_id, course_name');
        if (enrolledCourseIds.length > 0) {
            courseQuery.not('course_id', 'in', `(${enrolledCourseIds.join(',')})`);
        }
        const { data: coursesNotEnrolled, error: coursesError } = await courseQuery;

        if (coursesError) {
            console.error('Error fetching available courses:', coursesError.message);
        } else {
            availableCourses = coursesNotEnrolled || [];
        }

        // Kurse abrufen, in denen der Student eingeschrieben ist, inklusive Assignments
        const { data: enrolledData, error: enrolledError } = await locals.supabase
          .from('enrollments')
          .select(`
                enrollment_id,
                courses (course_id, course_name),
                assignments (assignment_id, assignment_name, grade, weight, max_points, due_date)
            `)
          .eq('student_id', student.student_id);

        if (enrolledError) {
            console.error('Error fetching enrolled courses with assignments:', enrolledError.message);
        } else {
            enrolledCourses = (enrolledData || []).map(e => ({
                ...e,
                courses: e.courses // Sicherstellen, dass courses ein Objekt ist oder null
            })) as EnrolledCourseData[];
        }
    } else {
        // Student nicht gefunden oder student.student_id ist nicht vorhanden
        // Fehlerbehandlung oder leere Arrays zurückgeben
        console.warn(`Student with id ${params.id} not found or has no student_id property.`);
    }

    return {
        user: locals.user,
        student, // student kann null sein, wenn nicht gefunden
        availableCourses,
        enrolledCourses // umbenannt von enrolledCoursesData für Klarheit in PageData
    };
};

export const actions: Actions = {
    enrollStudent: async ({ request, locals, params }) => {
        if (!locals.session) {
            throw redirect(303, '/login');
        }

        const formData = await request.formData();
        const course_id_form = formData.get('course_id') as string;
        const student_id_param = params.id;

        if (!course_id_form) {
            return fail(400, { error: 'Course ID is missing.' });
        }
        const course_id = parseInt(course_id_form, 10);
        const student_id = parseInt(student_id_param, 10);

        if (isNaN(course_id) || isNaN(student_id)) {
            return fail(400, { error: 'Invalid ID format.' });
        }

        const { data: studentExists, error: studentCheckError } = await locals.supabase
          .from('students')
          .select('student_id')
          .eq('student_id', student_id)
          .single();

        if (studentCheckError || !studentExists) {
            return fail(404, { error: 'Student not found.' });
        }

        const { data: existingEnrollment, error: checkError } = await locals.supabase
          .from('enrollments')
          .select('enrollment_id')
          .eq('student_id', student_id)
          .eq('course_id', course_id)
          .maybeSingle();

        if (checkError) {
            console.error('Error checking existing enrollment:', checkError.message);
            return fail(500, { error: 'Could not verify enrollment status.' });
        }

        if (existingEnrollment) {
            return fail(409, { error: 'Student is already enrolled in this course.' });
        }

        const { error: insertError } = await locals.supabase
          .from('enrollments')
          .insert({
              student_id: student_id,
              course_id: course_id,
              enrollment_date: new Date().toISOString().split('T')[0] // Nur Datum YYYY-MM-DD
          });

        if (insertError) {
            console.error('Error enrolling student:', insertError.message);
            return fail(500, { error: `Failed to enroll student: ${insertError.message}` });
        }

        return { success: true, message: 'Student enrolled successfully.' };
    }
};