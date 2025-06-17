import { redirect, fail } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals, url }) => {
	if (!locals.session || !locals.user) {
		throw redirect(302, '/login');
	}

	const user = locals.user;
	let studentProfile: { student_id: string } | null = null;
	let enrolledCourseIds: number[] = []; // Assuming course_id is number

	// Sortierparameter aus der URL lesen
	const sortByParam = url.searchParams.get('sort_by');
	const sortOrderParam = url.searchParams.get('sort_order');

	const validSortColumns = ['course_name', 'ects', 'format', 'instructor'];
	const sortBy = (sortByParam && validSortColumns.includes(sortByParam)) ? sortByParam : 'course_name';
	const sortOrder : 'asc' | 'desc' = (sortOrderParam === 'desc') ? 'desc' : 'asc';

	// Lade alle Instruktoren für das Formular "Kurs erstellen"
	const { data: instructorsForForm, error: instructorsError } = await locals.supabase
		.from('instructors')
		.select('instructor_id, first_name, last_name');

	if (instructorsError) {
		console.error('Error loading instructors for form:', instructorsError.message);
		// Optional: fail(500, { message: 'Could not load instructors data.' })
	}

	// Wenn der Benutzer ein Student ist, lade sein Profil und seine Einschreibungen
	if (user.user_metadata?.role === 'student') {
		const { data: studentData, error: studentError } = await locals.supabase
			.from('students')
			.select('student_id, enrollments ( course_id )')
			.eq('user_id', user.id)
			.single();

		if (studentError && studentError.code !== 'PGRST116') { // PGRST116: zero rows
			console.error('Error loading student profile for courses page:', studentError.message);
		}
		if (studentData) {
			studentProfile = { student_id: studentData.student_id.toString() };
			if (studentData.enrollments) {
				enrolledCourseIds = studentData.enrollments.map((e: { course_id: number }) => e.course_id);
			}
		}
	}

	// Basisabfrage für Kurse
	let coursesQuery = locals.supabase
		.from('courses')
		.select('*, instructors (instructor_id, first_name, last_name)');

	const ascending = sortOrder === 'asc';

	// Sortierung anwenden
	if (sortBy === 'instructor') {
		coursesQuery = coursesQuery
			.order('instructors(last_name)', { ascending, nullsFirst: false })
			.order('instructors(first_name)', { ascending, nullsFirst: false });
	} else if (validSortColumns.includes(sortBy)) {
		coursesQuery = coursesQuery.order(sortBy, { ascending, nullsFirst: false });
	}

	const { data: courses, error: coursesError } = await coursesQuery;

	if (coursesError) {
		console.error('Error loading courses:', coursesError.message);
	}

	return {
		user: user,
		courses: courses ?? [],
		instructors: instructorsForForm ?? [],
		studentProfile: studentProfile,
		enrolledCourseIds: enrolledCourseIds,
		sortBy: sortBy,
		sortOrder: sortOrder
	};
};

export const actions: Actions = {
	createCourse: async ({ request, locals }) => {
		if (!locals.session || !locals.user || locals.user.user_metadata?.role !== 'admin') {
			return fail(403, { success: false, message: 'Permission denied.', action: '?/createCourse' });
		}
		const formData = await request.formData();
		const course_name = formData.get('course_name') as string;
		const ects_str = formData.get('ects') as string;
		const hours_str = formData.get('hours') as string;
		const format = formData.get('format') as string;
		const instructor_id_str = formData.get('instructor_id') as string;

		const ects = parseInt(ects_str, 10);
		const hours = parseInt(hours_str, 10);
		const instructor_id = parseInt(instructor_id_str, 10);

		if (!course_name || isNaN(ects) || isNaN(hours) || !format || isNaN(instructor_id)) {
			return fail(400, { success: false, message: 'All fields are required and ECTS/Hours/Instructor ID must be valid numbers.', action: '?/createCourse', error: true });
		}

		const { error } = await locals.supabase.from('courses').insert({
			course_name, ects, hours, format, instructor_id
		});

		if (error) {
			console.error('Error creating course:', error);
			return fail(500, { success: false, message: `Failed to create course: ${error.message}`, action: '?/createCourse', error: true });
		}
		return { success: true, message: 'Course created successfully!', action: '?/createCourse' };
	},

	enrollStudent: async ({ request, locals }) => {
		if (!locals.session || !locals.user) throw redirect(303, '/login');

		const formData = await request.formData();
		const course_id_str = formData.get('course_id') as string;
		const student_id_str = formData.get('student_id') as string;

		if (!course_id_str || !student_id_str) {
			return fail(400, { error: 'Missing course_id or student_id.', success: false, action: '?/enrollStudent', relatedCourseId: course_id_str });
		}

		const course_id = parseInt(course_id_str, 10);
		const student_id = parseInt(student_id_str, 10);

		if (isNaN(course_id) || isNaN(student_id)) {
			return fail(400, { error: 'Invalid course_id or student_id.', success: false, action: '?/enrollStudent', relatedCourseId: course_id_str });
		}

		const { error } = await locals.supabase.from('enrollments').insert({
			course_id: course_id,
			student_id: student_id,
			enrollment_date: new Date().toISOString() // Add current date for enrollment_date
		});

		if (error) {
			console.error('Error enrolling student:', error);
			return fail(500, { error: `Failed to enroll: ${error.message}`, success: false, action: '?/enrollStudent', relatedCourseId: course_id_str });
		}
		return { success: true, message: 'Enrolled successfully!', action: '?/enrollStudent', relatedCourseId: course_id_str };
	},

	unenrollStudent: async ({ request, locals }) => {
		if (!locals.session || !locals.user) throw redirect(303, '/login');

		const formData = await request.formData();
		const course_id_str = formData.get('course_id') as string;
		const student_id_str = formData.get('student_id') as string;

		if (!course_id_str || !student_id_str) {
			return fail(400, { error: 'Missing course_id or student_id for unenrollment.', success: false, action: '?/unenrollStudent', relatedCourseId: course_id_str });
		}

		const course_id = parseInt(course_id_str, 10);
		const student_id = parseInt(student_id_str, 10);

		if (isNaN(course_id) || isNaN(student_id)) {
			return fail(400, { error: 'Invalid course_id or student_id.', success: false, action: '?/unenrollStudent', relatedCourseId: course_id_str });
		}

		try {
			// Step 1: Find the enrollment_id to delete associated grades
			const { data: enrollmentInfo, error: fetchEnrollmentError } = await locals.supabase
				.from('enrollments')
				.select('enrollment_id')
				.eq('student_id', student_id)
				.eq('course_id', course_id)
				.maybeSingle(); // Allows 0 or 1 row, data will be null if 0 rows

			if (fetchEnrollmentError) {
				console.error('Error fetching enrollment_id for grade deletion:', fetchEnrollmentError.message);
				return fail(500, {
					error: `Failed to fetch enrollment details: ${fetchEnrollmentError.message}`,
					success: false,
					action: '?/unenrollStudent',
					relatedCourseId: course_id_str
				});
			}

			if (enrollmentInfo && enrollmentInfo.enrollment_id) {
				const enrollment_id = enrollmentInfo.enrollment_id;

				// Step 1a: Delete associated grades using the enrollment_id
				const { error: gradesError } = await locals.supabase
					.from('student_grades') // Corrected table name
					.delete()
					.eq('enrollment_id', enrollment_id); // Corrected column for deletion

				if (gradesError) {
					console.error('Error deleting student_grades during unenrollment:', gradesError.message);
					return fail(500, {
						error: `Failed to delete grades: ${gradesError.message}`,
						success: false,
						action: '?/unenrollStudent',
						relatedCourseId: course_id_str
					});
				}
			} else {
				console.warn(`No specific enrollment record found for student_id ${student_id} and course_id ${course_id} to delete associated grades. Proceeding to attempt unenrollment.`);
			}

			// Step 2: Delete the enrollment itself
			const { error: enrollmentError } = await locals.supabase
				.from('enrollments')
				.delete()
				.eq('student_id', student_id)
				.eq('course_id', course_id);

			if (enrollmentError) {
				console.error('Error unenrolling student:', enrollmentError.message);
				return fail(500, {
					error: `Failed to unenroll: ${enrollmentError.message}`,
					success: false,
					action: '?/unenrollStudent',
					relatedCourseId: course_id_str
				});
			}

			return {
				success: true,
				message: 'Unenrolled successfully! Associated grades (if any) have been deleted.',
				action: '?/unenrollStudent',
				relatedCourseId: course_id_str
			};

		} catch (e: unknown) {
			let errorMessage = 'An unexpected error occurred during unenrollment.';
			if (e instanceof Error) {
				errorMessage = e.message;
			} else if (typeof e === 'string') {
				errorMessage = e;
			}
			console.error('Server unenroll student error:', e); // Log the original error object
			return fail(500, {
				error: errorMessage,
				success: false,
				action: '?/unenrollStudent',
				relatedCourseId: course_id_str
			});
		}
	}
};