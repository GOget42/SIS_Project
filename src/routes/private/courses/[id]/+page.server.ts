import { supabase } from '$lib/supabaseClient';
import type { PageServerLoad, Actions } from './$types';
import type { User } from '@supabase/supabase-js';
import type { Tables, TablesInsert } from '$lib/database.types';
import { fail } from '@sveltejs/kit';

// Type for course with instructor details
type CourseWithInstructor = Tables<'courses'> & {
	instructors: Pick<Tables<'instructors'>, 'instructor_id' | 'first_name' | 'last_name' | 'email' | 'user_id'> | null;
};

// Type for assignments belonging to a course
type CourseAssignment = Tables<'assignments'>;

// Type for enrolled student list (for admin/instructor)
type EnrolledStudentItem = Tables<'enrollments'> & {
	students: Pick<Tables<'students'>, 'student_id' | 'first_name' | 'last_name' | 'email'> | null;
};

// Type for student's own grades on assignments
type StudentGradeItem = {
	assignments: Pick<Tables<'assignments'>, 'assignment_id' | 'assignment_name' | 'due_date' | 'weight'>;
	grade: number | null;
	feedback: string | null;
	student_grade_id: number;
	submission_date: string | null;
};

// Type for a student's specific enrollment details including their grades
type StudentEnrollmentDetailsData = Tables<'enrollments'> & {
	students: Pick<Tables<'students'>, 'student_id' | 'first_name' | 'last_name' | 'email'> | null;
	assignments_grades: StudentGradeItem[];
};

// The overall data structure returned by the load function
export type PageDataType = {
	user: User | null;
	role: 'admin' | 'instructor' | 'student' | 'unknown' | null;
	course: CourseWithInstructor | null;
	assignments: CourseAssignment[] | null;
	enrolledStudents: EnrolledStudentItem[] | null;
	studentEnrollmentDetails: StudentEnrollmentDetailsData | null;
	allStudentGradesForCourse: Tables<'student_grades'>[] | null;
	availableStudents: Pick<Tables<'students'>, 'student_id' | 'first_name' | 'last_name' | 'email'>[] | null;
	error: { message: string } | null;
};

export const load: PageServerLoad = async ({ params, locals }): Promise<PageDataType> => {
	const supabaseSession = locals.session;
	const user = supabaseSession?.user || null;

	const initialReturnState: PageDataType = {
		user,
		role: null,
		course: null,
		assignments: null,
		enrolledStudents: null,
		studentEnrollmentDetails: null,
		allStudentGradesForCourse: null,
		availableStudents: null,
		error: null
	};

	if (!user) {
		return { ...initialReturnState, user, error: { message: 'Access denied. Please log in.' } };
	}

	const courseIdParam = params.id;
	const numericCourseId = parseInt(courseIdParam, 10);

	if (isNaN(numericCourseId)) {
		return { ...initialReturnState, user, role: 'unknown', error: { message: `Invalid course ID format. The ID "${courseIdParam}" is not a number.` } };
	}

	let determinedRole: PageDataType['role'] = 'unknown';
	let studentIdForRole: number | null = null;

	const { data: adminInfo } = await supabase.from('admins').select('admin_id').eq('user_id', user.id).maybeSingle();
	if (adminInfo) {
		determinedRole = 'admin';
	} else {
		const { data: instructorInfo } = await supabase.from('instructors').select('instructor_id, user_id').eq('user_id', user.id).maybeSingle();
		if (instructorInfo) {
			determinedRole = 'instructor';
		} else {
			const { data: studentInfo } = await supabase.from('students').select('student_id').eq('user_id', user.id).maybeSingle();
			if (studentInfo) {
				determinedRole = 'student';
				studentIdForRole = studentInfo.student_id;
			}
		}
	}
	initialReturnState.role = determinedRole;


	const { data: courseData, error: courseError } = await supabase
		.from('courses')
		.select(`*, instructors (instructor_id, first_name, last_name, email, user_id)`)
		.eq('course_id', numericCourseId)
		.returns<CourseWithInstructor>()
		.maybeSingle();

	if (courseError) {
		console.error(`Database error fetching course ${numericCourseId}:`, courseError);
		return { ...initialReturnState, user, role: determinedRole, error: { message: 'An error occurred while fetching course details.' } };
	}
	if (!courseData) {
		return { ...initialReturnState, user, role: determinedRole, error: { message: `Course with ID ${numericCourseId} not found.` } };
	}
	initialReturnState.course = courseData;

	const { data: courseAssignmentsData, error: assignmentsError } = await supabase
		.from('assignments')
		.select('*')
		.eq('course_id', numericCourseId);
	if (assignmentsError) console.error(`Error fetching assignments for course ${numericCourseId}:`, assignmentsError);
	initialReturnState.assignments = courseAssignmentsData || [];

	if (determinedRole === 'admin' || (determinedRole === 'instructor' && courseData.instructors?.user_id === user.id)) {
		const { data: enrollments, error: enrollmentsError } = await supabase
			.from('enrollments')
			.select(`*, students (student_id, first_name, last_name, email)`)
			.eq('course_id', numericCourseId)
			.returns<EnrolledStudentItem[]>();
		if (enrollmentsError) console.error(`Error fetching enrollments for course ${numericCourseId}:`, enrollmentsError);
		else initialReturnState.enrolledStudents = enrollments || [];
	}


	if (determinedRole === 'student' && studentIdForRole) {
		const { data: studentEnrollment, error: studentEnrollmentError } = await supabase
			.from('enrollments')
			.select(`
                *,
                students (student_id, first_name, last_name, email)
            `)
			.eq('course_id', numericCourseId)
			.eq('student_id', studentIdForRole)
			.returns<Tables<'enrollments'> & { students: Pick<Tables<'students'>, 'student_id' | 'first_name' | 'last_name' | 'email'> | null }>()
			.maybeSingle();

		if (studentEnrollmentError) {
			console.error(`Error fetching student enrollment for student ${studentIdForRole}, course ${numericCourseId}:`, studentEnrollmentError);
		} else if (studentEnrollment) {
			const { data: grades, error: gradesError } = await supabase
				.from('student_grades')
				.select(`
                    *,
                    assignments (assignment_id, assignment_name, due_date, weight)
                `)
				.eq('enrollment_id', studentEnrollment.enrollment_id);

			let formattedGrades: StudentGradeItem[] = [];
			if (gradesError) {
				console.error(`Error fetching student grades for enrollment ${studentEnrollment.enrollment_id}:`, gradesError);
			} else if (grades) {
				formattedGrades = grades.map(g => ({
					assignments: g.assignments || { assignment_id: 'unknown-id', assignment_name: 'Unknown Assignment', due_date: null, weight: null }, // Provide all fields for Pick
					grade: g.grade,
					feedback: g.feedback,
					student_grade_id: g.student_grade_id,
					submission_date: g.submission_date
				})).filter(g => g.assignments && g.assignments.assignment_id !== 'unknown-id') as StudentGradeItem[];
			}
			initialReturnState.studentEnrollmentDetails = {
				...studentEnrollment,
				students: studentEnrollment.students,
				assignments_grades: formattedGrades
			};
		}
	}

	if ((determinedRole === 'admin' || (determinedRole === 'instructor' && courseData.instructors?.user_id === user.id)) && initialReturnState.enrolledStudents) {
		const enrollmentIds = initialReturnState.enrolledStudents.map(e => e.enrollment_id).filter(id => id !== null) as number[];
		if (enrollmentIds.length > 0) {
			const { data: courseGrades, error: courseGradesError } = await supabase
				.from('student_grades')
				.select(`*`)
				.in('enrollment_id', enrollmentIds);
			if (courseGradesError) {
				console.error('Error fetching all student grades for course:', courseGradesError);
			} else {
				initialReturnState.allStudentGradesForCourse = courseGrades || [];
			}
		} else {
			initialReturnState.allStudentGradesForCourse = [];
		}
	}

	if (determinedRole === 'admin' || (determinedRole === 'instructor' && courseData.instructors?.user_id === user.id)) {
		const { data: allStudents, error: allStudentsError } = await supabase
			.from('students')
			.select('student_id, first_name, last_name, email');

		if (allStudentsError) {
			console.error('Error fetching all students:', allStudentsError);
		} else if (allStudents) {
			if (initialReturnState.enrolledStudents && initialReturnState.enrolledStudents.length > 0) {
				const enrolledStudentIds = new Set(
					initialReturnState.enrolledStudents.map(es => es.students?.student_id).filter(id => id !== undefined) as number[]
				);
				initialReturnState.availableStudents = allStudents.filter(s => !enrolledStudentIds.has(s.student_id));
			} else {
				initialReturnState.availableStudents = allStudents;
			}
		}
	}

	return initialReturnState;
};

export const actions: Actions = {
	updateCourse: async ({ request, params, locals }) => {
		const session = locals.session;
		if (!session?.user) {
			return fail(401, { message: 'Unauthorized' });
		}
		const courseId = parseInt(params.id, 10);
		if (isNaN(courseId)) {
			return fail(400, { message: 'Invalid course ID.' });
		}

		const formData = await request.formData();
		const course_name = formData.get('course_name') as string;
		const ects_string = formData.get('ects') as string;
		const format = formData.get('format') as string;
		const hours_string = formData.get('hours') as string;

		const ects = parseInt(ects_string, 10);
		const hours = parseInt(hours_string, 10);


		if (!course_name || isNaN(ects) || !format || isNaN(hours)) {
			return fail(400, { message: 'All fields must be filled correctly.', course_name, ects: ects_string, format, hours: hours_string });
		}

		const { error } = await supabase
			.from('courses')
			.update({ course_name, ects, format, hours })
			.eq('course_id', courseId);

		if (error) {
			console.error('Error updating course:', error);
			return fail(500, { message: `Error updating course: ${error.message}` });
		}
		return { success: true, message: 'Course successfully updated.' };
	},

	addAssignment: async ({ request, params, locals }) => {
		const session = locals.session;
		if (!session?.user) {
			return fail(401, { message: 'Unauthorized' });
		}
		const courseId = parseInt(params.id, 10);
		if (isNaN(courseId)) {
			return fail(400, { message: 'Invalid course ID.' });
		}

		const formData = await request.formData();
		const assignment_name = formData.get('assignment_name') as string;
		const due_date_str = formData.get('due_date') as string;
		const weight_str = formData.get('weight') as string;

		if (!assignment_name || !due_date_str || !weight_str) {
			return fail(400, { message: 'Assignment name, due date, and weight are required.', assignment_name, due_date: due_date_str, weight: weight_str });
		}

		const weightPercentage = parseInt(weight_str, 10);

		if (isNaN(weightPercentage) || weightPercentage < 0 || weightPercentage > 100) {
			return fail(400, { message: 'Weight must be an integer between 0 and 100.', assignment_name, due_date: due_date_str, weight: weight_str });
		}

		const weightForDb = weightPercentage / 100;
		const formattedDueDate = due_date_str ? new Date(due_date_str).toISOString().split('T')[0] : null;

		const newAssignment: TablesInsert<'assignments'> = {
			course_id: courseId,
			assignment_name,
			due_date: formattedDueDate,
			weight: weightForDb,
		};

		const { error } = await supabase.from('assignments').insert(newAssignment);

		if (error) {
			console.error('Error adding assignment:', error);
			return fail(500, { message: `Error adding assignment: ${error.message}` });
		}
		return { success: true, message: 'Assignment successfully added.' };
	},

	updateAssignment: async ({ request, locals }) => {
		const session = await locals.session;
		if (!session?.user) {
			return fail(401, { message: 'Unauthorized' });
		}

		const formData = await request.formData();
		const assignment_id = formData.get('assignment_id') as string;
		const assignment_name = formData.get('assignment_name') as string;
		const due_date_str = formData.get('due_date') as string;
		const weight_str = formData.get('weight') as string;

		if (!assignment_id || !assignment_name || !due_date_str || !weight_str) {
			return fail(400, { message: 'Assignment name, due date, and weight are required.', assignment_name, due_date: due_date_str, weight: weight_str, updatedAssignmentId: assignment_id });
		}

		const weightPercentage = parseInt(weight_str, 10);

		if (isNaN(weightPercentage) || weightPercentage < 0 || weightPercentage > 100) {
			return fail(400, { message: 'Weight must be an integer between 0 and 100.', assignment_name, due_date: due_date_str, weight: weight_str, updatedAssignmentId: assignment_id });
		}

		const weightForDb = weightPercentage / 100;
		const formattedDueDate = due_date_str ? new Date(due_date_str).toISOString().split('T')[0] : null;

		const updatedAssignmentData: Partial<Tables<'assignments'>> = {
			assignment_name,
			due_date: formattedDueDate,
			weight: weightForDb,
		};

		const { error: assignmentUpdateError } = await supabase
			.from('assignments')
			.update(updatedAssignmentData)
			.eq('assignment_id', assignment_id);

		if (assignmentUpdateError) {
			console.error('Error updating assignment:', assignmentUpdateError);
			return fail(500, { message: `Error updating assignment: ${assignmentUpdateError.message}`, updatedAssignmentId: assignment_id });
		}

		const studentGradesCountStr = formData.get('student_grades_count') as string;
		const studentGradesCount = studentGradesCountStr ? parseInt(studentGradesCountStr, 10) : 0;

		if (!isNaN(studentGradesCount) && studentGradesCount > 0) {
			const gradeUpsertOperations: TablesInsert<'student_grades'>[] = [];

			for (let i = 0; i < studentGradesCount; i++) {
				const enrollment_id_str = formData.get(`enrollment_id_${i}`) as string;
				const grade_str = formData.get(`grade_${i}`) as string;

				if (!enrollment_id_str) continue;

				const enrollment_id = parseInt(enrollment_id_str, 10);
				const grade = grade_str.trim() !== '' ? parseFloat(grade_str) : null;

				if (isNaN(enrollment_id)) {
					console.warn(`Invalid enrollment_id_str '${enrollment_id_str}' at index ${i}. Skipping.`);
					continue;
				}

				if (grade !== null) {
					if (isNaN(grade) || grade < 1.0 || grade > 6.0) {
						return fail(400, { message: `Grade for student must be a number between 1.0 and 6.0. Received: ${grade_str}`, updatedAssignmentId: assignment_id });
					}
					if ( (grade * 100) % 25 !== 0 ) {
						return fail(400, { message: `Grade must be in 0.25 increments (e.g., 1.0, 1.25, 1.5, ...). Received: ${grade_str}`, updatedAssignmentId: assignment_id });
					}
				}

				const studentGradeEntry: TablesInsert<'student_grades'> = {
					enrollment_id: enrollment_id,
					assignment_id: assignment_id, // assignment_id is UUID string, ensure it's correctly passed
					grade: grade,
				};
				gradeUpsertOperations.push(studentGradeEntry);
			}

			if (gradeUpsertOperations.length > 0) {
				const { error: gradeUpsertError } = await supabase
					.from('student_grades')
					.upsert(gradeUpsertOperations, { onConflict: 'enrollment_id, assignment_id' });

				if (gradeUpsertError) {
					console.error('Error upserting student grades:', gradeUpsertError);
					return fail(500, { message: `Error saving grades: ${gradeUpsertError.message}`, updatedAssignmentId: assignment_id });
				}
			}
		}

		return { success: true, message: 'Assignment and grades successfully updated.', updatedAssignmentId: assignment_id };
	},

	deleteAssignment: async ({ request, locals }) => {
		const session = await locals.session;
		if (!session?.user) {
			return fail(401, { message: 'Unauthorized' });
		}

		const formData = await request.formData();
		const assignment_id = formData.get('assignment_id') as string;

		if (!assignment_id) {
			return fail(400, { message: 'Assignment ID missing.' });
		}

		const { error: gradeError } = await supabase
			.from('student_grades')
			.delete()
			.eq('assignment_id', assignment_id);

		if (gradeError) {
			console.error('Error deleting student grades for assignment:', gradeError);
			return fail(500, { message: `Error deleting associated grades: ${gradeError.message}` });
		}

		const { error } = await supabase
			.from('assignments')
			.delete()
			.eq('assignment_id', assignment_id);

		if (error) {
			console.error('Error deleting assignment:', error);
			return fail(500, { message: `Error deleting assignment: ${error.message}` });
		}
		return { success: true, message: 'Assignment successfully deleted.', action: '?/deleteAssignment' };
	},

	addStudent: async ({ request, params, locals }) => {
		const session = locals.session;
		if (!session?.user) {
			return fail(401, { addStudentError: 'Unauthorized' });
		}

		const courseId = parseInt(params.id, 10);
		if (isNaN(courseId)) {
			return fail(400, { addStudentError: 'Invalid course ID.' });
		}

		let authorized = false;
		const { data: adminInfo } = await supabase
			.from('admins')
			.select('admin_id')
			.eq('user_id', session.user.id)
			.maybeSingle();

		if (adminInfo) {
			authorized = true;
		} else {
			const { data: courseDetails } = await supabase
				.from('courses')
				.select('instructor_id')
				.eq('course_id', courseId)
				.maybeSingle();

			if (courseDetails?.instructor_id) {
				const { data: instructorDetails } = await supabase
					.from('instructors')
					.select('user_id')
					.eq('instructor_id', courseDetails.instructor_id)
					.eq('user_id', session.user.id)
					.maybeSingle();
				if (instructorDetails) {
					authorized = true;
				}
			}
		}

		if (!authorized) {
			return fail(403, { addStudentError: 'Forbidden: You do not have permission to add students to this course.' });
		}

		const formData = await request.formData();
		const student_id_str = formData.get('student_id') as string;

		if (!student_id_str) {
			return fail(400, { addStudentError: 'Student ID is required.', student_id_form: student_id_str });
		}
		const student_id = parseInt(student_id_str, 10);
		if (isNaN(student_id)) {
			return fail(400, { addStudentError: 'Invalid Student ID format.', student_id_form: student_id_str });
		}

		const { data: studentExists, error: studentCheckError } = await supabase
			.from('students')
			.select('student_id')
			.eq('student_id', student_id)
			.maybeSingle();

		if (studentCheckError) {
			console.error('Error checking student existence:', studentCheckError);
			return fail(500, { addStudentError: 'Error verifying student: ' + studentCheckError.message });
		}
		if (!studentExists) {
			return fail(404, { addStudentError: 'Student not found.', student_id_form: student_id_str });
		}

		const { data: existingEnrollment, error: checkError } = await supabase
			.from('enrollments')
			.select('enrollment_id')
			.eq('course_id', courseId)
			.eq('student_id', student_id)
			.maybeSingle();

		if (checkError) {
			console.error('Error checking existing enrollment:', checkError);
			return fail(500, { addStudentError: 'Error checking enrollment: ' + checkError.message });
		}

		if (existingEnrollment) {
			return fail(409, { addStudentError: 'Student is already enrolled in this course.', student_id_form: student_id_str });
		}

		const newEnrollment: TablesInsert<'enrollments'> = {
			course_id: courseId,
			student_id: student_id,
			enrollment_date: new Date().toISOString().split('T')[0]
		};

		const { error: insertError } = await supabase.from('enrollments').insert(newEnrollment);

		if (insertError) {
			console.error('Error adding student to course:', insertError);
			return fail(500, { addStudentError: `Error enrolling student: ${insertError.message}` });
		}

		return { success: true, addStudentSuccess: 'Student successfully enrolled.', action: '?/addStudent' };
	},

	markCourseFinished: async ({ params, locals }) => {
		const session = locals.session;
		if (!session?.user) {
			return fail(401, { markFinishedError: 'Unauthorized' });
		}

		const courseId = parseInt(params.id, 10);
		if (isNaN(courseId)) {
			return fail(400, { markFinishedError: 'Invalid course ID.' });
		}

		let authorized = false;
		const { data: adminInfo } = await supabase
			.from('admins')
			.select('admin_id')
			.eq('user_id', session.user.id)
			.maybeSingle();

		if (adminInfo) {
			authorized = true;
		} else {
			const { data: courseData } = await supabase
				.from('courses')
				.select('instructor_id')
				.eq('course_id', courseId)
				.maybeSingle();

			if (courseData?.instructor_id) {
				const { data: instructorDetails } = await supabase
					.from('instructors')
					.select('user_id')
					.eq('instructor_id', courseData.instructor_id)
					.eq('user_id', session.user.id)
					.maybeSingle();
				if (instructorDetails) {
					authorized = true;
				}
			}
		}

		if (!authorized) {
			return fail(403, { markFinishedError: 'Forbidden: You do not have permission to modify this course.' });
		}

		const { error: updateError } = await supabase
			.from('courses')
			.update({ active: false })
			.eq('course_id', courseId);

		if (updateError) {
			console.error('Error marking course as finished:', updateError);
			return fail(500, { markFinishedError: `Error updating course: ${updateError.message}` });
		}

		return { success: true, markFinishedSuccess: 'Course marked as finished.', actionResult: 'markCourseFinished' };
	}
};