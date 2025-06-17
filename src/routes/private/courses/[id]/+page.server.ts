import { supabase } from '$lib/supabaseClient';
import type { PageServerLoad, Actions } from './$types';
import type { User } from '@supabase/supabase-js';
import type { Tables, TablesInsert, TablesUpdate } from '$lib/database.types';
import { fail, error as svelteKitError } from '@sveltejs/kit';

// Type for course with instructor details
type CourseWithInstructor = Tables<'courses'> & {
	instructors: Pick<
		Tables<'instructors'>,
		'instructor_id' | 'first_name' | 'last_name' | 'email' | 'user_id'
	> | null;
};

// Type for enrolled student data
export interface EnrolledStudentData extends Tables<'enrollments'> {
	students: Pick<Tables<'students'>, 'student_id' | 'first_name' | 'last_name' | 'email' | 'user_id'> | null;
}

// Type for student's specific enrollment details including their grades for assignments
export interface StudentEnrollmentDetailsData extends Tables<'enrollments'> {
	students: Pick<Tables<'students'>, 'student_id' | 'first_name' | 'last_name' | 'email'> | null;
	courses: Pick<Tables<'courses'>, 'course_id' | 'course_name'> | null;
	assignments_grades: Array<{
		student_grade_id: number | null;
		grade: number | null;
		feedback: string | null;
		submission_date: string | null;
		assignments: Pick<Tables<'assignments'>, 'assignment_id' | 'assignment_name' | 'due_date' | 'weight'>;
	}>;
}

export const load: PageServerLoad = async ({ params, locals, depends }) => {
	depends('supabase:db:course-details');
	const session = locals.session;
	const user = session?.user;

	if (!user) {
		throw svelteKitError(401, 'Unauthorized');
	}

	const courseId = parseInt(params.id, 10);
	if (isNaN(courseId)) {
		throw svelteKitError(404, 'Course not found: Invalid ID');
	}

	// Fetch course details with instructor
	const { data: courseData, error: courseError } = await supabase
		.from('courses')
		.select(`
      *,
      instructors (
        instructor_id,
        first_name,
        last_name,
        email,
        user_id
      )
    `)
		.eq('course_id', courseId)
		.single();

	if (courseError || !courseData) {
		console.error('Error fetching course:', courseError?.message);
		throw svelteKitError(404, courseError?.message || 'Course not found');
	}
	const course = courseData as CourseWithInstructor;

	// Determine user role
	let role: 'admin' | 'instructor' | 'student' | 'none' = 'none';
	const { data: adminProfile } = await supabase.from('admins').select('user_id').eq('user_id', user.id).single();
	if (adminProfile) {
		role = 'admin';
	} else {
		// Check if the user is the instructor for THIS course
		if (course.instructors?.user_id === user.id) {
			role = 'instructor';
		} else {
			// Check if the user is enrolled as a student in THIS course
			// We need to join with students table to match user_id
			const { data: studentEnrollmentCheck, error: studentCheckError } = await supabase
				.from('enrollments')
				.select('student_id, students!inner(user_id)')
				.eq('course_id', courseId)
				.eq('students.user_id', user.id)
				.maybeSingle();

			if (studentCheckError) {
				console.error("Error checking student enrollment:", studentCheckError.message);
			}
			if (studentEnrollmentCheck) {
				role = 'student';
			}
		}
	}


	// Fetch assignments for the course
	const { data: assignments, error: assignmentsError } = await supabase
		.from('assignments')
		.select('*')
		.eq('course_id', courseId)
		.order('due_date', { ascending: true });

	if (assignmentsError) {
		console.error('Error fetching assignments:', assignmentsError.message);
	}

	let enrolledStudents: EnrolledStudentData[] | null = null;
	if (role === 'admin' || role === 'instructor') {
		const { data: studentsData, error: studentsError } = await supabase
			.from('enrollments')
			.select(`
        *,
        students (
          student_id,
          first_name,
          last_name,
          email,
          user_id
        )
      `)
			.eq('course_id', courseId);
		if (studentsError) console.error('Error fetching enrolled students:', studentsError.message);
		else enrolledStudents = studentsData as EnrolledStudentData[];
	}

	let studentEnrollmentDetails: StudentEnrollmentDetailsData | null = null;
	if (role === 'student') {
		const { data: enrollment, error: enrollmentError } = await supabase
			.from('enrollments')
			.select(`
        enrollment_id,
        enrollment_date,
        course_id,
        student_id,
        students!inner (student_id, first_name, last_name, email, user_id),
        courses!inner (course_id, course_name)
      `)
			.eq('course_id', courseId)
			.eq('students.user_id', user.id)
			.single();


		if (enrollmentError || !enrollment) {
			console.error('Error fetching student enrollment details:', enrollmentError?.message);
		} else {
			const typedEnrollment = enrollment as unknown as Omit<StudentEnrollmentDetailsData, 'assignments_grades'>;
			const { data: grades, error: gradesError } = await supabase
				.from('student_grades')
				.select(`
          student_grade_id,
          grade,
          feedback,
          submission_date,
          assignments!inner (
            assignment_id,
            assignment_name,
            due_date,
            weight
          )
        `)
				.eq('enrollment_id', typedEnrollment.enrollment_id);

			if (gradesError) console.error('Error fetching student grades:', gradesError.message);
			studentEnrollmentDetails = {
				...typedEnrollment,
				assignments_grades: grades || []
			};
		}
	}

	let allStudentGradesForCourse: Tables<'student_grades'>[] | null = null;
	if ((role === 'admin' || role === 'instructor') && enrolledStudents && enrolledStudents.length > 0) {
		const enrollmentIds = enrolledStudents.map(e => e.enrollment_id);
		const { data: grades, error: gradesError } = await supabase
			.from('student_grades')
			.select('*')
			.in('enrollment_id', enrollmentIds);
		if (gradesError) console.error('Error fetching all student grades:', gradesError.message);
		else allStudentGradesForCourse = grades;
	} else if (role === 'admin' || role === 'instructor') {
		allStudentGradesForCourse = [];
	}

	let availableStudents: Pick<Tables<'students'>, 'student_id' | 'first_name' | 'last_name' | 'email'>[] | null = null;
	if (role === 'admin' || role === 'instructor') {
		const { data: enrolledStudentUserIdsData, error: enrolledIdsError } = await supabase
			.from('enrollments')
			.select('students!inner(user_id)')
			.eq('course_id', courseId);

		if (enrolledIdsError) {
			console.error('Error fetching enrolled student user IDs:', enrolledIdsError.message);
		} else {
			const enrolledUserIds = enrolledStudentUserIdsData.map(e => e.students?.user_id).filter(id => !!id) as string[];

			let query = supabase
				.from('students')
				.select('student_id, first_name, last_name, email');

			if (enrolledUserIds.length > 0) {
				query = query.not('user_id', 'in', `(${enrolledUserIds.join(',')})`);
			}

			const { data: studentsList, error: availableStudentsError } = await query;

			if (availableStudentsError) console.error('Error fetching available students:', availableStudentsError.message);
			else availableStudents = studentsList;
		}
	}

	return {
		user,
		course,
		assignments: assignments || [],
		enrolledStudents,
		studentEnrollmentDetails,
		role,
		allStudentGradesForCourse,
		availableStudents,
	};
};

export const actions: Actions = {
	updateCourse: async ({ request, params, locals }) => {
		const session = locals.session;
		if (!session?.user) return fail(401, { message: 'Unauthorized', action: '?/updateCourse' });

		const courseId = parseInt(params.id, 10);
		if (isNaN(courseId)) return fail(400, { message: 'Invalid course ID', action: '?/updateCourse' });

		const formData = await request.formData();
		const course_name = formData.get('course_name') as string;
		const ects_str = formData.get('ects') as string;
		const format = formData.get('format') as string;
		const hours_str = formData.get('hours') as string;

		if (!course_name || !ects_str || !format || !hours_str) {
			return fail(400, { message: 'All fields are required.', course_name, ects: ects_str, format, hours: hours_str, action: '?/updateCourse' });
		}
		const ects = parseInt(ects_str, 10);
		const hours = parseInt(hours_str, 10);
		if (isNaN(ects) || isNaN(hours) || ects <= 0 || hours <= 0) {
			return fail(400, { message: 'ECTS and Hours must be positive numbers.', course_name, ects: ects_str, format, hours: hours_str, action: '?/updateCourse' });
		}

		const { data: courseOwnerData, error: courseOwnerError } = await supabase
			.from('courses')
			.select('instructor_id, instructors(user_id)')
			.eq('course_id', courseId)
			.single();

		if (courseOwnerError || !courseOwnerData) {
			return fail(404, { message: 'Course not found or error fetching owner.', action: '?/updateCourse' });
		}

		let authorized = false;
		const { data: adminInfo } = await supabase.from('admins').select('user_id').eq('user_id', session.user.id).single();
		if (adminInfo) authorized = true;
		else if (courseOwnerData.instructors?.user_id === session.user.id) authorized = true;

		if (!authorized) return fail(403, { message: 'You are not authorized to update this course.', action: '?/updateCourse' });

		const courseUpdate: TablesUpdate<'courses'> = { course_name, ects, format, hours };
		const { error } = await supabase.from('courses').update(courseUpdate).eq('course_id', courseId);

		if (error) return fail(500, { message: `Failed to update course: ${error.message}`, action: '?/updateCourse' });
		return { success: true, message: 'Course updated successfully.', action: '?/updateCourse' };
	},

	addAssignment: async ({ request, params, locals }) => {
		const session = locals.session;
		if (!session?.user) return fail(401, { message: 'Unauthorized', action: '?/addAssignment' });

		const courseId = parseInt(params.id, 10);
		if (isNaN(courseId)) return fail(400, { message: 'Invalid course ID', action: '?/addAssignment' });

		const formData = await request.formData();
		const assignment_name = formData.get('assignment_name') as string;
		const due_date_str = formData.get('due_date') as string;
		const weight_str = formData.get('weight') as string;

		if (!assignment_name || !due_date_str || !weight_str) {
			return fail(400, { message: 'Assignment name, due date, and weight are required.', action: '?/addAssignment' });
		}
		const weight = parseFloat(weight_str) / 100;
		if (isNaN(weight) || weight < 0 || weight > 1) {
			return fail(400, { message: 'Weight must be a number between 0 and 100.', action: '?/addAssignment' });
		}
		const due_date = new Date(due_date_str).toISOString();

		const { data: courseDetails, error: courseCheckError } = await supabase
			.from('courses')
			.select('instructor_id, instructors(user_id), active')
			.eq('course_id', courseId)
			.single();
		if (courseCheckError || !courseDetails) return fail(404, { message: 'Course not found.', action: '?/addAssignment' });
		if (!courseDetails.active) return fail(400, { message: 'Cannot add assignments to an inactive course.', action: '?/addAssignment' });

		let authorized = false;
		const { data: adminInfo } = await supabase.from('admins').select('user_id').eq('user_id', session.user.id).single();
		if (adminInfo) authorized = true;
		else if (courseDetails.instructors?.user_id === session.user.id) authorized = true;
		if (!authorized) return fail(403, { message: 'Not authorized.', action: '?/addAssignment' });

		const { data: existingAssignments, error: weightCheckError } = await supabase
			.from('assignments')
			.select('weight')
			.eq('course_id', courseId);
		if (weightCheckError) return fail(500, { message: 'Error checking existing assignment weights.', action: '?/addAssignment' });

		const currentTotalWeight = existingAssignments?.reduce((sum, a) => sum + (a.weight || 0), 0) || 0;
		if (currentTotalWeight + weight > 1.00001) {
			return fail(400, { message: `Total weight including this assignment (${((currentTotalWeight + weight) * 100).toFixed(0)}%) would exceed 100%.`, action: '?/addAssignment' });
		}

		const newAssignment: TablesInsert<'assignments'> = { course_id: courseId, assignment_name, due_date, weight };
		const { error } = await supabase.from('assignments').insert(newAssignment);
		if (error) return fail(500, { message: `Failed to add assignment: ${error.message}`, action: '?/addAssignment' });
		return { success: true, message: 'Assignment added successfully.', action: '?/addAssignment' };
	},

	updateAssignment: async ({ request, locals, params }) => {
		const session = locals.session;
		if (!session?.user) return fail(401, { message: 'Unauthorized', action: '?/updateAssignment' });

		const courseId = parseInt(params.id, 10);
		if (isNaN(courseId)) return fail(400, { message: 'Invalid course ID', action: '?/updateAssignment' });

		const formData = await request.formData();
		const assignment_id = formData.get('assignment_id') as string;
		const assignment_name = formData.get('assignment_name') as string;
		const due_date_str = formData.get('due_date') as string;
		const weight_str = formData.get('weight') as string;
		const student_grades_count_str = formData.get('student_grades_count') as string;

		if (!assignment_id || !assignment_name || !due_date_str || !weight_str) {
			return fail(400, { message: 'Assignment ID, name, due date, and weight are required.', updatedAssignmentId: assignment_id, action: '?/updateAssignment' });
		}
		const weight = parseFloat(weight_str) / 100;
		if (isNaN(weight) || weight < 0 || weight > 1) {
			return fail(400, { message: 'Weight must be a number between 0 and 100.', updatedAssignmentId: assignment_id, action: '?/updateAssignment' });
		}
		const due_date = new Date(due_date_str).toISOString();

		const { data: courseDetails, error: courseCheckError } = await supabase
			.from('courses')
			.select('instructor_id, instructors(user_id), active')
			.eq('course_id', courseId)
			.single();
		if (courseCheckError || !courseDetails) return fail(404, { message: 'Course not found.', updatedAssignmentId: assignment_id, action: '?/updateAssignment' });
		if (!courseDetails.active) return fail(400, { message: 'Cannot update assignments for an inactive course.', updatedAssignmentId: assignment_id, action: '?/updateAssignment' });

		let authorized = false;
		const { data: adminInfo } = await supabase.from('admins').select('user_id').eq('user_id', session.user.id).single();
		if (adminInfo) authorized = true;
		else if (courseDetails.instructors?.user_id === session.user.id) authorized = true;
		if (!authorized) return fail(403, { message: 'Not authorized.', updatedAssignmentId: assignment_id, action: '?/updateAssignment' });

		const { data: currentAssignment, error: currentAssignmentError } = await supabase
			.from('assignments')
			.select('weight')
			.eq('assignment_id', assignment_id)
			.single();
		if (currentAssignmentError || !currentAssignment) return fail(404, { message: 'Assignment not found.', updatedAssignmentId: assignment_id, action: '?/updateAssignment' });

		if (currentAssignment.weight !== weight) {
			const { data: otherAssignments, error: weightCheckError } = await supabase
				.from('assignments')
				.select('weight')
				.eq('course_id', courseId)
				.not('assignment_id', 'eq', assignment_id);
			if (weightCheckError) return fail(500, { message: 'Error checking assignment weights.', updatedAssignmentId: assignment_id, action: '?/updateAssignment' });
			const otherTotalWeight = otherAssignments?.reduce((sum, a) => sum + (a.weight || 0), 0) || 0;
			if (otherTotalWeight + weight > 1.00001) {
				return fail(400, { message: `Total weight including this assignment (${((otherTotalWeight + weight) * 100).toFixed(0)}%) would exceed 100%.`, updatedAssignmentId: assignment_id, action: '?/updateAssignment' });
			}
		}

		const assignmentUpdate: TablesUpdate<'assignments'> = { assignment_name, due_date, weight };
		const { error: updateError } = await supabase.from('assignments').update(assignmentUpdate).eq('assignment_id', assignment_id);
		if (updateError) return fail(500, { message: `Failed to update assignment: ${updateError.message}`, updatedAssignmentId: assignment_id, action: '?/updateAssignment' });

		const student_grades_count = parseInt(student_grades_count_str || '0', 10);
		if (student_grades_count > 0) {
			for (let i = 0; i < student_grades_count; i++) {
				const enrollment_id_str = formData.get(`enrollment_id_${i}`) as string;
				const grade_str = formData.get(`grade_${i}`) as string;

				if (!enrollment_id_str) continue;
				const enrollment_id = parseInt(enrollment_id_str, 10);

				let grade_value: number | null = null;
				if (grade_str && grade_str.trim() !== '') {
					grade_value = parseFloat(grade_str);
					if (isNaN(grade_value) || grade_value < 1.0 || grade_value > 6.0) {
						return fail(400, { message: `Invalid grade value. Must be between 1.0 and 6.0. Grade provided: ${grade_str}`, updatedAssignmentId: assignment_id, action: '?/updateAssignment' });
					}
				}

				const { data: existingGrade, error: existingGradeError } = await supabase
					.from('student_grades')
					.select('student_grade_id')
					.eq('enrollment_id', enrollment_id)
					.eq('assignment_id', assignment_id)
					.maybeSingle();

				if (existingGradeError) {
					console.error("Error checking existing grade:", existingGradeError);
					return fail(500, { message: 'Error processing student grades.', updatedAssignmentId: assignment_id, action: '?/updateAssignment' });
				}

				if (grade_value !== null) {
					const gradeData: TablesInsert<'student_grades'> | TablesUpdate<'student_grades'> = {
						enrollment_id,
						assignment_id,
						grade: grade_value,
						submission_date: new Date().toISOString()
					};
					if (existingGrade) {
						const { error: gradeUpdateError } = await supabase.from('student_grades').update(gradeData).eq('student_grade_id', existingGrade.student_grade_id);
						if (gradeUpdateError) console.warn(`Failed to update grade: ${gradeUpdateError.message}`);
					} else {
						const { error: gradeInsertError } = await supabase.from('student_grades').insert(gradeData as TablesInsert<'student_grades'>);
						if (gradeInsertError) console.warn(`Failed to insert grade: ${gradeInsertError.message}`);
					}
				} else if (existingGrade) {
					const { error: deleteGradeError } = await supabase
						.from('student_grades')
						.delete()
						.eq('student_grade_id', existingGrade.student_grade_id);
					if (deleteGradeError) console.warn(`Error deleting grade: ${deleteGradeError.message}`);
				}
			}
		}
		return { success: true, message: 'Assignment and grades updated.', action: '?/updateAssignment', updatedAssignmentId: assignment_id };
	},

	deleteAssignment: async ({ request, locals, params }) => {
		const session = locals.session;
		if (!session?.user) return fail(401, { message: 'Unauthorized', action: '?/deleteAssignment' });

		const courseId = parseInt(params.id, 10);
		if (isNaN(courseId)) return fail(400, { message: 'Invalid course ID', action: '?/deleteAssignment' });

		const formData = await request.formData();
		const assignment_id = formData.get('assignment_id') as string;
		if (!assignment_id) return fail(400, { message: 'Assignment ID is required.', action: '?/deleteAssignment' });

		const { data: courseDetails, error: courseCheckError } = await supabase
			.from('courses')
			.select('instructor_id, instructors(user_id), active')
			.eq('course_id', courseId)
			.single();
		if (courseCheckError || !courseDetails) return fail(404, { message: 'Course not found.', action: '?/deleteAssignment' });
		if (!courseDetails.active) return fail(400, { message: 'Cannot modify assignments for an inactive course.', action: '?/deleteAssignment' });

		let authorized = false;
		const { data: adminInfo } = await supabase.from('admins').select('user_id').eq('user_id', session.user.id).single();
		if (adminInfo) authorized = true;
		else if (courseDetails.instructors?.user_id === session.user.id) authorized = true;
		if (!authorized) return fail(403, { message: 'Not authorized.', action: '?/deleteAssignment' });

		const { error: gradesDeleteError } = await supabase
			.from('student_grades')
			.delete()
			.eq('assignment_id', assignment_id);
		if (gradesDeleteError) return fail(500, { message: `Failed to delete student grades for assignment: ${gradesDeleteError.message}`, action: '?/deleteAssignment' });

		const { error: assignmentDeleteError } = await supabase
			.from('assignments')
			.delete()
			.eq('assignment_id', assignment_id);
		if (assignmentDeleteError) return fail(500, { message: `Failed to delete assignment: ${assignmentDeleteError.message}`, action: '?/deleteAssignment' });

		return { success: true, message: 'Assignment deleted successfully.', action: '?/deleteAssignment' };
	},

	addStudent: async ({ request, params, locals }) => {
		const session = locals.session;
		if (!session?.user) return fail(401, { addStudentError: 'Unauthorized', action: '?/addStudent' });

		const courseId = parseInt(params.id, 10);
		if (isNaN(courseId)) return fail(400, { addStudentError: 'Invalid course ID', action: '?/addStudent' });

		const formData = await request.formData();
		const student_id_str = formData.get('student_id') as string;
		if (!student_id_str) return fail(400, { addStudentError: 'Please select a student.', student_id_form: student_id_str, action: '?/addStudent' });
		const student_id = parseInt(student_id_str, 10);
		if (isNaN(student_id)) return fail(400, { addStudentError: 'Invalid student ID selected.', student_id_form: student_id_str, action: '?/addStudent' });

		const { data: courseDetails, error: courseCheckError } = await supabase
			.from('courses')
			.select('instructor_id, instructors(user_id), active')
			.eq('course_id', courseId)
			.single();
		if (courseCheckError || !courseDetails) return fail(404, { addStudentError: 'Course not found.', action: '?/addStudent' });
		if (!courseDetails.active) return fail(400, { addStudentError: 'Cannot add students to an inactive course.', action: '?/addStudent' });

		let authorized = false;
		const { data: adminInfo } = await supabase.from('admins').select('user_id').eq('user_id', session.user.id).single();
		if (adminInfo) authorized = true;
		else if (courseDetails.instructors?.user_id === session.user.id) authorized = true;
		if (!authorized) return fail(403, { addStudentError: 'You are not authorized.', action: '?/addStudent' });

		const { data: existingEnrollment, error: checkError } = await supabase
			.from('enrollments')
			.select('enrollment_id')
			.eq('course_id', courseId)
			.eq('student_id', student_id)
			.maybeSingle();
		if (checkError) return fail(500, { addStudentError: 'Error checking enrollment.', action: '?/addStudent' });
		if (existingEnrollment) return fail(400, { addStudentError: 'Student is already enrolled in this course.', student_id_form: student_id_str, action: '?/addStudent' });

		const newEnrollment: TablesInsert<'enrollments'> = {
			course_id: courseId,
			student_id: student_id,
			enrollment_date: new Date().toISOString()
		};
		const { error: insertError } = await supabase.from('enrollments').insert(newEnrollment);
		if (insertError) return fail(500, { addStudentError: `Failed to enroll student: ${insertError.message}`, action: '?/addStudent' });

		return { success: true, addStudentSuccess: 'Student successfully enrolled.', action: '?/addStudent' };
	},

	unenrollStudent: async ({ request, params, locals }) => {
		const session = locals.session;
		if (!session?.user) {
			return fail(401, { unenrollStudentError: 'Unauthorized access. Please log in.', action: '?/unenrollStudent' });
		}

		const courseId = parseInt(params.id, 10);
		if (isNaN(courseId)) {
			return fail(400, { unenrollStudentError: 'Invalid course ID.', action: '?/unenrollStudent' });
		}

		const formData = await request.formData();
		const enrollment_id_str = formData.get('enrollment_id') as string;
		if (!enrollment_id_str) {
			return fail(400, { unenrollStudentError: 'Enrollment ID is required.', action: '?/unenrollStudent' });
		}
		const enrollment_id = parseInt(enrollment_id_str, 10);
		if (isNaN(enrollment_id)) {
			return fail(400, { unenrollStudentError: 'Invalid enrollment ID format.', action: '?/unenrollStudent' });
		}

		let authorized = false;
		const { data: adminInfo } = await supabase
			.from('admins')
			.select('user_id')
			.eq('user_id', session.user.id)
			.single();

		if (adminInfo) {
			authorized = true;
		} else {
			const { data: courseOwnerData, error: courseOwnerError } = await supabase
				.from('courses')
				.select('instructor_id, instructors(user_id)')
				.eq('course_id', courseId)
				.single();
			if (courseOwnerError || !courseOwnerData) {
				return fail(404, { unenrollStudentError: 'Course not found or error fetching owner details.', action: '?/unenrollStudent' });
			}
			if (courseOwnerData.instructors?.user_id === session.user.id) {
				authorized = true;
			}
		}

		if (!authorized) {
			return fail(403, { unenrollStudentError: 'You are not authorized to unenroll students from this course.', action: '?/unenrollStudent' });
		}

		const { data: courseDetails, error: courseCheckError } = await supabase
			.from('courses')
			.select('active')
			.eq('course_id', courseId)
			.single();

		if (courseCheckError || !courseDetails) {
			return fail(404, { unenrollStudentError: 'Course not found.', action: '?/unenrollStudent' });
		}
		if (!courseDetails.active) {
			return fail(400, { unenrollStudentError: 'Cannot unenroll students from an inactive course.', action: '?/unenrollStudent' });
		}

		const { error: gradesDeleteError } = await supabase
			.from('student_grades')
			.delete()
			.eq('enrollment_id', enrollment_id);

		if (gradesDeleteError) {
			console.error(`Error deleting student grades for enrollment_id ${enrollment_id}:`, gradesDeleteError);
			return fail(500, { unenrollStudentError: `Failed to delete student grades: ${gradesDeleteError.message}`, action: '?/unenrollStudent' });
		}

		const { error: enrollmentDeleteError } = await supabase
			.from('enrollments')
			.delete()
			.eq('enrollment_id', enrollment_id);

		if (enrollmentDeleteError) {
			console.error(`Error deleting enrollment_id ${enrollment_id}:`, enrollmentDeleteError);
			return fail(500, { unenrollStudentError: `Failed to unenroll student: ${enrollmentDeleteError.message}`, action: '?/unenrollStudent' });
		}

		return {
			success: true,
			unenrollStudentSuccess: 'Student successfully unenrolled.',
			action: '?/unenrollStudent'
		};
	},

	markCourseFinished: async ({ params, locals }) => {
		const session = locals.session;
		if (!session?.user) return fail(401, { markFinishedError: 'Unauthorized', actionResult: 'markCourseFinished' });

		const courseId = parseInt(params.id, 10);
		if (isNaN(courseId)) return fail(400, { markFinishedError: 'Invalid course ID', actionResult: 'markCourseFinished' });

		const { data: courseDetails, error: courseCheckError } = await supabase
			.from('courses')
			.select('instructor_id, instructors(user_id)')
			.eq('course_id', courseId)
			.single();
		if (courseCheckError || !courseDetails) return fail(404, { markFinishedError: 'Course not found.', actionResult: 'markCourseFinished' });

		let authorized = false;
		const { data: adminInfo } = await supabase.from('admins').select('user_id').eq('user_id', session.user.id).single();
		if (adminInfo) authorized = true;
		else if (courseDetails.instructors?.user_id === session.user.id) authorized = true;
		if (!authorized) return fail(403, { markFinishedError: 'Not authorized.', actionResult: 'markCourseFinished' });

		const { error } = await supabase
			.from('courses')
			.update({ active: false })
			.eq('course_id', courseId);

		if (error) return fail(500, { markFinishedError: `Failed to mark course as inactive: ${error.message}`, actionResult: 'markCourseFinished' });
		return { success: true, markFinishedSuccess: 'Course marked as inactive.', actionResult: 'markCourseFinished' };
	}
};