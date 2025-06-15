// src/routes/private/students/[id]/+page.server.ts
import { redirect, fail } from '@sveltejs/kit';
import { getStudentById }	from '$lib/api/students.ts';
import type { Actions, PageServerLoad } from './$types';
import type { PostgrestError } from '@supabase/supabase-js';

// Internal type definitions for this server file
interface Assignment {
	assignment_id: string; // UUID
	assignment_name: string;
	weight: number | null;
	due_date: string | null; // Format YYYY-MM-DD
	grade: number | null; // Will be assigned after fetching from student_grades
}

interface EnrolledCourseData {
	enrollment_id: number;
	courses: {
		course_id: number;
		course_name: string;
		assignments: Assignment[]; // Assignments are now nested here
	} | null;
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

	const student = await getStudentById(student_id_param);


	let availableCourses: AvailableCourseData[] = [];
	let enrolledCourses: EnrolledCourseData[] = [];

	if (student && student.student_id) { // student.student_id should be a number here
		// Fetch courses in which the student is NOT enrolled
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

		// Fetch courses in which the student is enrolled, including assignments and grades
		// Temporary interface for raw data from Supabase
		interface RawStudentGrade {
			assignment_id: string;
			grade: number | null;
			student_grade_id: string; // Assumption: string (e.g., UUID) if not an auto-incrementing integer.
		}
		interface RawCourseAssignment {
			assignment_id: string;
			assignment_name: string;
			due_date: string | null;
			weight: number | null;
		}
		interface RawEnrollment {
			enrollment_id: number;
			courses: {
				course_id: number;
				course_name: string;
				assignments: RawCourseAssignment[];
			} | null;
			student_grades: RawStudentGrade[];
		}

		const { data: enrolledData, error: enrolledError } = await locals.supabase
			.from('enrollments')
			.select(`
                enrollment_id,
                courses (
                    course_id,
                    course_name,
                    assignments (
                        assignment_id,
                        assignment_name,
                        due_date,
                        weight
                    )
                ),
                student_grades (
                    assignment_id,
                    grade,
                    student_grade_id
                )
            `)
			.eq('student_id', student.student_id) as { data: RawEnrollment[] | null, error: PostgrestError | null };

		if (enrolledError) {
			console.error('Error fetching enrolled courses with assignments and grades:', enrolledError.message);
		} else {
			enrolledCourses = (enrolledData || []).map((enrollment: RawEnrollment) => {
				const gradesMap = new Map<string, number | null>();
				if (enrollment.student_grades) {
					for (const sg of enrollment.student_grades) {
						gradesMap.set(sg.assignment_id, sg.grade);
					}
				}

				let processedAssignments: Assignment[] = [];
				if (enrollment.courses && enrollment.courses.assignments) {
					processedAssignments = enrollment.courses.assignments.map(asm => ({
						...asm,
						grade: gradesMap.get(asm.assignment_id) ?? null
					}));
				}

				return {
					enrollment_id: enrollment.enrollment_id,
					courses: enrollment.courses
						? {
							...enrollment.courses,
							assignments: processedAssignments
						}
						: null
				};
			});
		}

	} else {
		// Student not found or student.student_id is not present
		// Error handling or return empty arrays
		console.warn(`Student with id ${params.id} not found or has no student_id property.`);
	}

	return {
		user: locals.user,
		student, // student can be null if not found
		availableCourses,
		enrolledCourses // renamed from enrolledCoursesData for clarity in PageData
	};
};

export const actions: Actions = {
	enrollStudent: async ({ request, locals, params }) => {
		if (!locals.session) {
			throw redirect(303, '/login');
		}

		const formData = await request.formData();
		const course_id_form = formData.get('course_id') as string;
		const student_id_param = params.id; // This is a string from URL params

		if (!course_id_form) {
			return fail(400, { error: 'Course ID is missing.' });
		}
		const course_id = parseInt(course_id_form, 10);
		const student_id = parseInt(student_id_param, 10); // Parse student_id from URL param

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
				enrollment_date: new Date().toISOString().split('T')[0] // Only date YYYY-MM-DD
			});

		if (insertError) {
			console.error('Error enrolling student:', insertError.message);
			return fail(500, { error: `Failed to enroll student: ${insertError.message}` });
		}

		return { success: true, message: 'Student enrolled successfully.' };
	}
};