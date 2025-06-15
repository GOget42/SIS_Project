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
	let sortBy = (sortByParam && validSortColumns.includes(sortByParam)) ? sortByParam : 'course_name';
	let sortOrder : 'asc' | 'desc' = (sortOrderParam === 'desc') ? 'desc' : 'asc';

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
				// @ts-ignore
				enrolledCourseIds = studentData.enrollments.map(e => e.course_id);
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
		// Sortierung nach Nachname des Instruktors, dann Vorname
		// Diese Syntax geht davon aus, dass 'instructors' ein Objekt ist, das durch den Select geladen wird.
		coursesQuery = coursesQuery
			.order('instructors(last_name)', { ascending, nullsFirst: false }) // PostgREST syntax for joined table column
			.order('instructors(first_name)', { ascending, nullsFirst: false });
	} else if (validSortColumns.includes(sortBy)) { // sortBy ist 'course_name', 'ects', oder 'format'
		coursesQuery = coursesQuery.order(sortBy, { ascending, nullsFirst: false });
	}
	// Standard-Sortierung, falls keine oder eine ungültige angegeben wurde (bereits oben behandelt)

	const { data: courses, error: coursesError } = await coursesQuery;

	if (coursesError) {
		console.error('Error loading courses:', coursesError.message);
		// Optional: return fail(500, { message: 'Could not load courses.' });
	}

	return {
		user: user,
		courses: courses ?? [],
		instructors: instructorsForForm ?? [], // Für das "Create Course" Formular
		studentProfile: studentProfile,
		enrolledCourseIds: enrolledCourseIds,
		sortBy: sortBy, // Aktuelle Sortierspalte zurückgeben
		sortOrder: sortOrder // Aktuelle Sortierreihenfolge zurückgeben
	};
};

export const actions: Actions = {
	createCourse: async ({ request, locals }) => {
		if (!locals.session || !locals.user || locals.user.user_metadata?.role !== 'admin') {
			return fail(403, { success: false, message: 'Permission denied.', action: '?/createCourse' });
		}
		const formData = await request.formData();
		const course_name = formData.get('course_name') as string;
		const ects = parseInt(formData.get('ects') as string, 10);
		const hours = parseInt(formData.get('hours') as string, 10);
		const format = formData.get('format') as string;
		const instructor_id = formData.get('instructor_id') as string;

		if (!course_name || isNaN(ects) || isNaN(hours) || !format || !instructor_id) {
			return fail(400, { success: false, message: 'All fields are required and ECTS/Hours must be numbers.', action: '?/createCourse', error: true });
		}

		const { error } = await locals.supabase.from('courses').insert({
			course_name, ects, hours, format, instructor_id: parseInt(instructor_id, 10)
		});

		if (error) {
			console.error('Error creating course:', error);
			return fail(500, { success: false, message: `Failed to create course: ${error.message}`, action: '?/createCourse', error: true });
		}
		return { success: true, message: 'Course created successfully!', action: '?/createCourse' };
	},

	enrollStudent: async ({ request, locals }) => {
		if (!locals.session || !locals.user) throw redirect(303, '/login');
		// Studenten können sich selbst einschreiben, Admins könnten andere einschreiben (hier nicht implementiert)
		// if (locals.user.user_metadata?.role !== 'student') {
		//     return fail(403, { error: 'Only students can enroll.' });
		// }
		const formData = await request.formData();
		const course_id = formData.get('course_id') as string;
		const student_id = formData.get('student_id') as string; // Muss vom Frontend kommen

		if (!course_id || !student_id) {
			return fail(400, { error: 'Missing course_id or student_id.', success: false, action: '?/enrollStudent', relatedCourseId: course_id });
		}

		const { error } = await locals.supabase.from('enrollments').insert({
			course_id: parseInt(course_id, 10),
			student_id: parseInt(student_id, 10) // Assuming student_id is also an integer
		});

		if (error) {
			console.error('Error enrolling student:', error);
			return fail(500, { error: `Failed to enroll: ${error.message}`, success: false, action: '?/enrollStudent', relatedCourseId: course_id });
		}
		return { success: true, message: 'Enrolled successfully!', action: '?/enrollStudent', relatedCourseId: course_id };
	},

	unenrollStudent: async ({ request, locals }) => { // Name von disenrollStudent zu unenrollStudent geändert für Konsistenz
		if (!locals.session || !locals.user) throw redirect(303, '/login');

		const formData = await request.formData();
		const course_id = formData.get('course_id') as string;
		const student_id = formData.get('student_id') as string;

		if (!course_id || !student_id) {
			return fail(400, { error: 'Missing course_id or student_id for unenrollment.', success: false, action: '?/unenrollStudent', relatedCourseId: course_id });
		}

		try {
			const { error } = await locals.supabase
				.from('enrollments')
				.delete()
				.eq('student_id', parseInt(student_id,10))
				.eq('course_id', parseInt(course_id,10));

			if (error) {
				console.error('Error unenrolling student:', error.message);
				return fail(500, { error: `Failed to unenroll: ${error.message}`, success: false, action: '?/unenrollStudent', relatedCourseId: course_id });
			}
			return { success: true, message: 'Unenrolled successfully!', action: '?/unenrollStudent', relatedCourseId: course_id };
		} catch (e: any) {
			console.error('Server unenroll student error:', e.message);
			return fail(500, { error: e.message || 'An unexpected error occurred.', success: false, action: '?/unenrollStudent', relatedCourseId: course_id });
		}
	}
};