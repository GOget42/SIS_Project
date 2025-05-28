// src/routes/private/courses/[id]/+page.server.ts
import { redirect, fail, error as svelteKitError } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
// Assignment wurde entfernt, da es nicht verwendet wird
import type { AppCoursePageData, AppCourse, AppEnrollment, Student } from '$lib/app.types';

export const load: PageServerLoad = async ({ params, locals, depends }): Promise<AppCoursePageData> => {
    depends('supabase:db:courses', 'supabase:db:enrollments', 'supabase:db:assignments', 'supabase:db:instructors', 'supabase:db:students');

    if (!locals.session?.user) {
        throw redirect(302, '/login');
    }
    const course_id_param = params.id;

    const { data: courseData, error: courseError } = await locals.supabase
      .from('courses')
      .select(`
        *,
        instructors!instructor_id(instructor_id, first_name, last_name, email)
      `)
      .eq('course_id', course_id_param)
      .single(); // <AppCourse> entfernt

    if (courseError || !courseData) {
        console.error('Error loading course details:', courseError?.message);
        throw svelteKitError(404, `Course not found or error loading: ${courseError?.message || 'Unknown error'}`);
    }
    const course = courseData as AppCourse; // Typzusicherung hier

    const { data: enrollmentsData, error: enrollmentsError } = await locals.supabase
      .from('enrollments')
      .select(`
            enrollment_id,
            enrollment_date,
            course_id,
            student_id,
            students (student_id, first_name, last_name, email),
            assignments (assignment_id, assignment_name, grade, weight, max_points, due_date, created_at, updated_at, enrollment_id)
        `)
      .eq('course_id', course.course_id)
      .returns(); // <AppEnrollment[]> entfernt

    if (enrollmentsError) {
        console.error('Error loading enrollments for course:', enrollmentsError.message);
        // Nicht unbedingt ein harter Fehler, vielleicht gibt es einfach keine Einschreibungen
    }
    const currentEnrollments = (enrollmentsData || []) as AppEnrollment[]; // Typzusicherung hier

    const enrolledStudentIds = currentEnrollments
      .map((e: AppEnrollment) => e.student_id)
      .filter((id): id is number => id !== null && id !== undefined); // Expliziter Typ für 'e' und Type Guard für 'id'

    let availableStudents: Student[] = [];
    const { data: allStudentsData, error: allStudentsError } = await locals.supabase
      .from('students')
      .select('*');

    if (allStudentsError) {
        console.error('Error loading all students:', allStudentsError.message);
    } else if (allStudentsData) {
        const allStudents = allStudentsData as Student[]; // Typzusicherung hier
        availableStudents = allStudents.filter((s: Student) => !enrolledStudentIds.includes(s.student_id)); // Expliziter Typ für 's'
    }

    return {
        user: locals.session.user,
        course,
        enrollments: currentEnrollments,
        availableStudents,
        error: enrollmentsError ? `Error loading enrollments: ${enrollmentsError.message}` : null, // Fehler weitergeben, falls vorhanden
    };
};

interface AssignmentUpdateData {
    assignment_name?: string;
    grade?: number | null;
    weight?: number | null;
    max_points?: number | null;
    due_date?: string | null;
    updated_at: string;
}

export const actions: Actions = {
    addStudentToCourse: async ({ request, locals, params }) => {
        if (!locals.session?.user) throw redirect(303, '/login');

        const course_id = params.id;
        const formData = await request.formData();
        const student_id = formData.get('student_id') as string;

        if (!student_id) {
            return fail(400, { addStudentError: 'Student ID is required.' , student_id_form: student_id});
        }

        const { data: existingEnrollment, error: checkError } = await locals.supabase
          .from('enrollments')
          .select('enrollment_id')
          .eq('course_id', course_id)
          .eq('student_id', student_id)
          .maybeSingle();

        if (checkError) {
            return fail(500, { addStudentError: `Error checking enrollment: ${checkError.message}`, student_id_form: student_id });
        }
        if (existingEnrollment) {
            return fail(400, { addStudentError: 'Student is already enrolled in this course.', student_id_form: student_id });
        }

        const { error: insertError } = await locals.supabase
          .from('enrollments')
          .insert({
              course_id: parseInt(course_id as string),
              student_id: parseInt(student_id),
              enrollment_date: new Date().toISOString()
          });

        if (insertError) {
            console.error('Error adding student to course:', insertError.message);
            return fail(500, { addStudentError: `Failed to enroll student: ${insertError.message}`, student_id_form: student_id });
        }
        return { addStudentSuccess: 'Student enrolled successfully.' };
    },

    removeStudentFromCourse: async ({ request, locals }) => {
        if (!locals.session?.user) throw redirect(303, '/login');

        const formData = await request.formData();
        const enrollment_id = formData.get('enrollment_id') as string;

        if (!enrollment_id) {
            return fail(400, { removeStudentError: 'Enrollment ID is required.', enrollment_id_form: enrollment_id });
        }
        const numEnrollmentId = parseInt(enrollment_id);

        const { error: deleteAssignmentsError } = await locals.supabase
          .from('assignments')
          .delete()
          .eq('enrollment_id', numEnrollmentId);

        if (deleteAssignmentsError) {
            console.error('Error deleting assignments for enrollment:', deleteAssignmentsError.message);
            return fail(500, { removeStudentError: `Failed to delete assignments: ${deleteAssignmentsError.message}`, enrollment_id_form: enrollment_id });
        }

        const { error: deleteEnrollmentError } = await locals.supabase
          .from('enrollments')
          .delete()
          .eq('enrollment_id', numEnrollmentId);

        if (deleteEnrollmentError) {
            console.error('Error removing student from course:', deleteEnrollmentError.message);
            return fail(500, { removeStudentError: `Failed to remove student: ${deleteEnrollmentError.message}`, enrollment_id_form: enrollment_id });
        }
        return { removeStudentSuccess: 'Student removed from course successfully.' };
    },

    addAssignment: async ({ request, locals, params }) => {
        if (!locals.session) throw redirect(303, '/login');
        const course_id = params.id;
        const formData = await request.formData();

        const enrollment_id_str = formData.get('enrollment_id') as string;
        const assignment_name = formData.get('assignment_name') as string;
        const gradeStr = formData.get('grade') as string | null;
        const weightStr = formData.get('weight') as string | null;
        const max_pointsStr = formData.get('max_points') as string | null;
        const due_date = formData.get('due_date') as string | null;

        if (!enrollment_id_str || !assignment_name) {
            return fail(400, { addAssignmentError: 'Enrollment ID and Assignment Name are required.', enrollment_id_form: enrollment_id_str });
        }
        const enrollment_id = parseInt(enrollment_id_str);

        const { data: enrollmentCheck, error: checkError } = await locals.supabase
          .from('enrollments')
          .select('course_id')
          .eq('enrollment_id', enrollment_id)
          .single();

        if (checkError || !enrollmentCheck || String(enrollmentCheck.course_id) !== course_id) {
            return fail(403, { addAssignmentError: 'Invalid enrollment ID for this course.', enrollment_id_form: enrollment_id_str });
        }

        const grade = gradeStr && gradeStr.trim() !== '' ? parseFloat(gradeStr) : null;
        const weight = weightStr && weightStr.trim() !== '' ? parseFloat(weightStr) : null;
        const max_points = max_pointsStr && max_pointsStr.trim() !== '' ? parseInt(max_pointsStr, 10) : null;

        if (grade !== null && (isNaN(grade) || grade < 1 || grade > 6)) {
            return fail(400, { addAssignmentError: 'Grade must be a number between 1 and 6.', enrollment_id_form: enrollment_id_str });
        }
        if (weight !== null && (isNaN(weight) || weight < 0 || weight > 100)) {
            return fail(400, { addAssignmentError: 'Weight must be a number between 0 and 100.', enrollment_id_form: enrollment_id_str });
        }
        if (max_points !== null && (isNaN(max_points) || max_points < 0)) {
            return fail(400, { addAssignmentError: 'Max points must be a non-negative number.', enrollment_id_form: enrollment_id_str });
        }

        const { error } = await locals.supabase
          .from('assignments')
          .insert({
              enrollment_id,
              assignment_name,
              grade,
              weight: weight !== null ? weight / 100 : null,
              max_points,
              due_date: due_date || null
          });

        if (error) {
            console.error('Error adding assignment:', error.message);
            return fail(500, { addAssignmentError: `Failed to add assignment: ${error.message}`, enrollment_id_form: enrollment_id_str });
        }
        return { addAssignmentSuccess: 'Assignment added successfully.', enrollment_id_form: enrollment_id_str };
    },

    updateAssignment: async ({ request, locals }) => {
        if (!locals.session) throw redirect(303, '/login');
        const formData = await request.formData();

        const assignment_id = formData.get('assignment_id') as string;
        const enrollment_id_str = formData.get('enrollment_id') as string;
        const assignment_name = formData.get('assignment_name') as string;
        const gradeStr = formData.get('grade') as string | null;
        const weightStr = formData.get('weight') as string | null;
        const max_pointsStr = formData.get('max_points') as string | null;
        const due_date = formData.get('due_date') as string | null;

        if (!assignment_id) {
            return fail(400, { updateAssignmentError: 'Assignment ID is required.', enrollment_id_form: enrollment_id_str, assignment_id_form: assignment_id });
        }

        const grade = gradeStr && gradeStr.trim() !== '' ? parseFloat(gradeStr) : null;
        const weight = weightStr && weightStr.trim() !== '' ? parseFloat(weightStr) : null;
        const max_points = max_pointsStr && max_pointsStr.trim() !== '' ? parseInt(max_pointsStr, 10) : null;

        if (grade !== null && (isNaN(grade) || grade < 1 || grade > 6)) {
            return fail(400, { updateAssignmentError: 'Grade must be a number between 1 and 6.', enrollment_id_form: enrollment_id_str, assignment_id_form: assignment_id });
        }
        if (weight !== null && (isNaN(weight) || weight < 0 || weight > 100)) {
            return fail(400, { updateAssignmentError: 'Weight must be a number between 0 and 100.', enrollment_id_form: enrollment_id_str, assignment_id_form: assignment_id });
        }

        const updateData: AssignmentUpdateData = {
            updated_at: new Date().toISOString()
        };
        if (assignment_name) updateData.assignment_name = assignment_name;
        updateData.grade = gradeStr === '' ? null : grade;
        updateData.weight = weightStr === '' ? null : (weight !== null ? weight / 100 : null);
        updateData.max_points = max_pointsStr === '' ? null : max_points;
        updateData.due_date = due_date === '' ? null : (due_date || null);

        const { error } = await locals.supabase
          .from('assignments')
          .update(updateData)
          .eq('assignment_id', assignment_id);

        if (error) {
            console.error('Error updating assignment:', error.message);
            return fail(500, { updateAssignmentError: `Failed to update assignment: ${error.message}`, enrollment_id_form: enrollment_id_str, assignment_id_form: assignment_id });
        }
        return { updateAssignmentSuccess: 'Assignment updated successfully.', enrollment_id_form: enrollment_id_str, assignment_id_form: assignment_id };
    },

    deleteAssignment: async ({ request, locals }) => {
        if (!locals.session) throw redirect(303, '/login');
        const formData = await request.formData();
        const assignment_id = formData.get('assignment_id') as string;
        const enrollment_id_str = formData.get('enrollment_id') as string;

        if (!assignment_id) {
            return fail(400, { deleteAssignmentError: 'Assignment ID is required.', enrollment_id_form: enrollment_id_str, assignment_id_form: assignment_id });
        }

        const { error } = await locals.supabase
          .from('assignments')
          .delete()
          .eq('assignment_id', assignment_id);

        if (error) {
            console.error('Error deleting assignment:', error.message);
            return fail(500, { deleteAssignmentError: `Failed to delete assignment: ${error.message}`, enrollment_id_form: enrollment_id_str, assignment_id_form: assignment_id });
        }
        return { deleteAssignmentSuccess: 'Assignment deleted successfully.', enrollment_id_form: enrollment_id_str, assignment_id_form: assignment_id };
    }
};