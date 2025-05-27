// src/routes/private/courses/[id]/+page.server.ts
import { redirect, fail, error as svelteKitError } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params, locals }) => {
    if (!locals.session) {
        throw redirect(302, '/login');
    }
    const course_id = params.id;

    // Korrigierter Hinweis: Verwenden Sie 'instructor_id' als Fremdschlüsselspalte in 'courses',
    // die auf die 'instructors'-Tabelle verweist.
    const { data: course, error: courseError } = await locals.supabase
      .from('courses')
      .select(`
        *,
        instructors!instructor_id(instructor_id, first_name, last_name, email)
      `)
      .eq('course_id', course_id)
      .single();

    if (courseError || !course) {
        console.error('Error loading course details:', courseError?.message);
        // Die Fehlermeldung von Supabase kann hier hilfreich sein.
        throw svelteKitError(404, `Course not found or error loading instructor: ${courseError?.message}`);
    }

    const { data: enrollments, error: enrollmentsError } = await locals.supabase
      .from('enrollments')
      .select(`
            enrollment_id,
            enrollment_date,
            students (student_id, first_name, last_name, email),
            assignments (assignment_id, assignment_name, grade, weight, max_points, due_date, created_at, updated_at)
        `)
      .eq('course_id', course_id);

    if (enrollmentsError) {
        console.error('Error loading enrollments for course:', enrollmentsError.message);
        // Fehler nicht werfen, leere Liste ist ok, oder spezifische Fehlerbehandlung
    }

    return {
        user: locals.user,
        course,
        enrollments: enrollments || []
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
    addAssignment: async ({ request, locals, params }) => {
        if (!locals.session) throw redirect(303, '/login');
        const course_id = params.id;
        const formData = await request.formData();

        const enrollment_id = formData.get('enrollment_id') as string;
        const assignment_name = formData.get('assignment_name') as string;
        const gradeStr = formData.get('grade') as string | null;
        const weightStr = formData.get('weight') as string | null;
        const max_pointsStr = formData.get('max_points') as string | null;
        const due_date = formData.get('due_date') as string | null;

        if (!enrollment_id || !assignment_name) {
            return fail(400, { addAssignmentError: 'Enrollment ID and Assignment Name are required.', enrollment_id_form: enrollment_id });
        }

        const { data: enrollmentCheck, error: checkError } = await locals.supabase
          .from('enrollments')
          .select('course_id')
          .eq('enrollment_id', enrollment_id)
          .single();

        if (checkError || !enrollmentCheck || String(enrollmentCheck.course_id) !== course_id) {
            return fail(403, { addAssignmentError: 'Invalid enrollment ID for this course.', enrollment_id_form: enrollment_id });
        }

        const grade = gradeStr && gradeStr.trim() !== '' ? parseFloat(gradeStr) : null;
        const weight = weightStr && weightStr.trim() !== '' ? parseFloat(weightStr) : null;
        const max_points = max_pointsStr && max_pointsStr.trim() !== '' ? parseInt(max_pointsStr, 10) : null;

        if (grade !== null && (isNaN(grade) || grade < 1 || grade > 6)) {
            return fail(400, { addAssignmentError: 'Grade must be a number between 1 and 6.', enrollment_id_form: enrollment_id });
        }
        if (weight !== null && (isNaN(weight) || weight < 0 || weight > 1)) {
            return fail(400, { addAssignmentError: 'Weight must be a number between 0 and 1 (e.g., 0.4 for 40%).', enrollment_id_form: enrollment_id });
        }

        const { error } = await locals.supabase
          .from('assignments')
          .insert({
              enrollment_id,
              assignment_name,
              grade,
              weight,
              max_points,
              due_date: due_date || null
          });

        if (error) {
            console.error('Error adding assignment:', error.message);
            return fail(500, { addAssignmentError: `Failed to add assignment: ${error.message}`, enrollment_id_form: enrollment_id });
        }
        return { addAssignmentSuccess: 'Assignment added successfully.', enrollment_id_form: enrollment_id };
    },

    updateAssignment: async ({ request, locals }) => {
        if (!locals.session) throw redirect(303, '/login');
        const formData = await request.formData();

        const assignment_id = formData.get('assignment_id') as string;
        const enrollment_id = formData.get('enrollment_id') as string;
        const assignment_name = formData.get('assignment_name') as string;
        const gradeStr = formData.get('grade') as string | null;
        const weightStr = formData.get('weight') as string | null;
        const max_pointsStr = formData.get('max_points') as string | null;
        const due_date = formData.get('due_date') as string | null;

        if (!assignment_id) {
            return fail(400, { updateAssignmentError: 'Assignment ID is required.', enrollment_id_form: enrollment_id, assignment_id_form: assignment_id });
        }

        const grade = gradeStr && gradeStr.trim() !== '' ? parseFloat(gradeStr) : null;
        const weight = weightStr && weightStr.trim() !== '' ? parseFloat(weightStr) : null;
        const max_points = max_pointsStr && max_pointsStr.trim() !== '' ? parseInt(max_pointsStr, 10) : null;

        if (grade !== null && (isNaN(grade) || grade < 1 || grade > 6)) {
            return fail(400, { updateAssignmentError: 'Grade must be a number between 1 and 6.', enrollment_id_form: enrollment_id, assignment_id_form: assignment_id });
        }
        if (weight !== null && (isNaN(weight) || weight < 0 || weight > 1)) {
            return fail(400, { updateAssignmentError: 'Weight must be a number between 0 and 1.', enrollment_id_form: enrollment_id, assignment_id_form: assignment_id });
        }

        const updateData: AssignmentUpdateData = {
            updated_at: new Date().toISOString()
        };
        if (assignment_name) updateData.assignment_name = assignment_name;
        if (gradeStr !== null) updateData.grade = grade; else if (gradeStr === '') updateData.grade = null;
        if (weightStr !== null) updateData.weight = weight; else if (weightStr === '') updateData.weight = null;
        if (max_pointsStr !== null) updateData.max_points = max_points; else if (max_pointsStr === '') updateData.max_points = null;
        if (due_date !== null) updateData.due_date = due_date; else if (due_date === '') updateData.due_date = null;


        const { error } = await locals.supabase
          .from('assignments')
          .update(updateData)
          .eq('assignment_id', assignment_id);

        if (error) {
            console.error('Error updating assignment:', error.message);
            return fail(500, { updateAssignmentError: `Failed to update assignment: ${error.message}`, enrollment_id_form: enrollment_id, assignment_id_form: assignment_id });
        }
        return { updateAssignmentSuccess: 'Assignment updated successfully.', enrollment_id_form: enrollment_id, assignment_id_form: assignment_id };
    },

    deleteAssignment: async ({ request, locals }) => {
        if (!locals.session) throw redirect(303, '/login');
        const formData = await request.formData();
        const assignment_id = formData.get('assignment_id') as string;
        const enrollment_id = formData.get('enrollment_id') as string;

        if (!assignment_id) {
            return fail(400, { deleteAssignmentError: 'Assignment ID is required.', enrollment_id_form: enrollment_id });
        }

        const { error } = await locals.supabase
          .from('assignments')
          .delete()
          .eq('assignment_id', assignment_id);

        if (error) {
            console.error('Error deleting assignment:', error.message);
            return fail(500, { deleteAssignmentError: `Failed to delete assignment: ${error.message}`, enrollment_id_form: enrollment_id });
        }
        return { deleteAssignmentSuccess: 'Assignment deleted successfully.', enrollment_id_form: enrollment_id };
    }
};