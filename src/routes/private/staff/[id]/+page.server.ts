// src/routes/private/students/[id]/+page.server.ts
import { redirect, fail } from '@sveltejs/kit';
import { getStudentById } from '$lib/api/students.js';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params, locals }) => {
	if (!locals.session) {
		throw redirect(302, '/login');
	}

	const student = await getStudentById(params.id);
	let availableCourses: any[] = [];
	let enrolledCoursesData: any[] = [];

	if (student) {
		const { data: allCoursesData, error: coursesError } = await locals.supabase
			.from('courses')
			.select('course_id, course_name');

		if (coursesError) {
			console.error('Error loading courses:', coursesError.message);
		}

		const { data: currentEnrollments, error: enrollmentsError } = await locals.supabase
			.from('enrollments')
			.select('course_id')
			.eq('student_id', student.student_id);

		if (enrollmentsError) {
			console.error('Error loading enrollments for available courses:', enrollmentsError.message);
		}

		if (allCoursesData) {
			const enrolledCourseIds = new Set(currentEnrollments?.map(e => e.course_id) || []);
			availableCourses = allCoursesData.filter(course => !enrolledCourseIds.has(course.course_id));
		}

		const { data: detailedEnrollments, error: detailedEnrollmentsError } = await locals.supabase
			.from('enrollments')
			.select(`
                enrollment_id,
                courses ( course_id, course_name, ects ),
                assignments ( assignment_id, assignment_name, grade, weight, due_date )
            `)
			.eq('student_id', student.student_id);

		if (detailedEnrollmentsError) {
			console.error('Error loading detailed enrolled courses:', detailedEnrollmentsError.message);
		} else if (detailedEnrollments) {
			enrolledCoursesData = detailedEnrollments.map(e => ({
				enrollment_id: e.enrollment_id,
				course_id: e.courses?.course_id,
				course_name: e.courses?.course_name,
				ects: e.courses?.ects,
				assignments: e.assignments || []
			}));
		}

	} else {
		console.warn(`Student with id ${params.id} not found.`);
	}

	return {
		user: locals.user,
		student,
		availableCourses,
		enrolledCourses: enrolledCoursesData
	};
};

export const actions: Actions = {
	enrollStudent: async ({ request, locals, params }) => {
		if (!locals.session) {
			throw redirect(303, '/login');
		}

		const formData = await request.formData();
		const course_id = formData.get('course_id') as string;
		const student_id = params.id;

		if (!course_id) {
			return fail(400, { error: 'Course ID is missing.' });
		}
		if (!student_id) {
			return fail(400, { error: 'Student ID is missing.' });
		}

		const { data: studentExists } = await locals.supabase
			.from('students')
			.select('student_id')
			.eq('student_id', student_id)
			.single();

		if (!studentExists) {
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
				enrollment_date: new Date().toISOString()
				// 'grade' wird hier nicht mehr eingefügt
			});

		if (insertError) {
			console.error('Error enrolling student:', insertError.message);
			return fail(500, { error: `Failed to enroll student: ${insertError.message}` });
		}

		return { success: true, message: 'Student enrolled successfully.' };
	}
};