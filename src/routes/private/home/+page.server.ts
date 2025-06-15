import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import type { Tables } from '$lib/database.types';

// Typen für Studentendaten (bereits vorhanden)
interface AssignmentData {
	assignment_id: string;
	assignment_name: string;
	due_date: string | null;
	weight: number | null;
	grade: number | null;
}

interface CourseDataForStudent {
	course_id: number;
	course_name: string;
	format: string | null;
	ects: number | null;
	assignments: AssignmentData[];
}

// Typen für Instruktorendaten (bereits vorhanden)
interface InstructorCourseSummary {
	course_id: number;
	course_name: string;
	format: string;
	ects: number;
	student_count: number;
	average_grade: number | null;
}

interface InstructorUpcomingAssignment {
	unique_key: string;
	assignment_name: string;
	due_date: string;
	course_id: number;
	course_name: string;
}

// Neue Typen für Administratordaten
interface AdminCourseSummary {
	course_id: number;
	course_name: string;
	format: string; // In DB non-nullable
	ects: number;   // In DB non-nullable
	student_count: number;
	average_grade: number | null;
	instructor_name?: string | null; // Optional: Name des Dozenten
}

export const load: PageServerLoad = async ({ locals }) => {
	if (!locals.session || !locals.user) {
		throw redirect(302, '/login');
	}

	const user = locals.user;
	let profile: Tables<'students'> | Tables<'instructors'> | Tables<'admins'> | { first_name?: string | null, email?: string | null } | null = null;
	let role: string = user.user_metadata?.role || '';

	let coursesData: CourseDataForStudent[] | InstructorCourseSummary[] | AdminCourseSummary[] = [];
	let upcomingInstructorAssignments: InstructorUpcomingAssignment[] | undefined = undefined;

	try {
		if (role === 'student') {
			const { data: studentData, error: studentError } = await locals.supabase
				.from('students')
				.select('student_id, first_name, last_name, email')
				.eq('user_id', user.id)
				.single();
			if (studentError) throw studentError;
			if (studentData) {
				profile = studentData;
				const { data: studentEnrollments, error: enrollError } = await locals.supabase
					.from('enrollments')
					.select(`enrollment_id, courses (course_id, course_name, format, ects)`)
					.eq('student_id', studentData.student_id);
				if (enrollError) throw enrollError;
				if (studentEnrollments) {
					const coursePromises = studentEnrollments.map(async (enrollment) => {
						const courseBase = enrollment.courses as Tables<'courses'>;
						if (!courseBase) return null;
						const { data: courseAssignmentsData } = await locals.supabase
							.from('assignments')
							.select('assignment_id, assignment_name, due_date, weight, grade')
							.eq('enrollment_id', enrollment.enrollment_id);
						const typedAssignments: AssignmentData[] = (courseAssignmentsData || []).map(a => ({ ...a }));
						return { ...courseBase, assignments: typedAssignments };
					});
					const resolvedCourses = await Promise.all(coursePromises);
					coursesData = resolvedCourses.filter(course => course !== null) as CourseDataForStudent[];
				}
			}
		} else if (role === 'instructor') {
			const { data: instructorData, error: instructorError } = await locals.supabase
				.from('instructors')
				.select('instructor_id, first_name, last_name, email')
				.eq('user_id', user.id)
				.single();
			if (instructorError) throw instructorError;
			if (instructorData) {
				profile = instructorData;
				const { data: teachingCoursesRaw, error: coursesError } = await locals.supabase
					.from('courses')
					.select('course_id, course_name, format, ects')
					.eq('instructor_id', instructorData.instructor_id);
				if (coursesError) throw coursesError;

				const teachingCourses = teachingCoursesRaw || [];
				const instructorCourseSummaries: InstructorCourseSummary[] = [];
				let collectedRawAssignmentsForInstructor: { assignment_id: string, name: string, dueDate: string, courseId: number, courseName: string, enrollment_id: number }[] = [];
				const today = new Date();
				today.setHours(0, 0, 0, 0);

				for (const course of teachingCourses) {
					const { data: enrollments, error: enrollmentsError } = await locals.supabase
						.from('enrollments')
						.select('enrollment_id')
						.eq('course_id', course.course_id);
					if (enrollmentsError) {
						instructorCourseSummaries.push({ ...course, student_count: 0, average_grade: null });
						continue;
					}
					const student_count = enrollments?.length || 0;
					const studentCourseGrades: number[] = [];

					if (enrollments && enrollments.length > 0) {
						for (const enrollment of enrollments) {
							const { data: studentAssignments, error: studentAssignmentsError } = await locals.supabase
								.from('assignments')
								.select('assignment_id, assignment_name, grade, weight, due_date')
								.eq('enrollment_id', enrollment.enrollment_id);
							if (studentAssignmentsError) continue;

							let totalWeightedGrade = 0;
							let totalWeight = 0;
							let hasGradedAssignments = false;
							if (studentAssignments) {
								studentAssignments.forEach(sa => {
									if (sa.grade !== null && sa.weight !== null && sa.weight > 0) {
										totalWeightedGrade += sa.grade * sa.weight;
										totalWeight += sa.weight;
										hasGradedAssignments = true;
									}
									// Collect upcoming assignments for instructor
									if (sa.due_date) {
										const dueDate = new Date(sa.due_date);
										if (dueDate >= today) {
											collectedRawAssignmentsForInstructor.push({
												assignment_id: sa.assignment_id,
												name: sa.assignment_name,
												dueDate: sa.due_date,
												courseId: course.course_id,
												courseName: course.course_name,
												enrollment_id: enrollment.enrollment_id // Nicht direkt für unique key gebraucht, aber für Kontext
											});
										}
									}
								});
							}
							if (hasGradedAssignments && totalWeight > 0) {
								studentCourseGrades.push(parseFloat((totalWeightedGrade / totalWeight).toFixed(2)));
							}
						}
					}
					let average_course_grade: number | null = null;
					if (studentCourseGrades.length > 0) {
						average_course_grade = parseFloat((studentCourseGrades.reduce((s, g) => s + g, 0) / studentCourseGrades.length).toFixed(2));
					}
					instructorCourseSummaries.push({ ...course, student_count, average_grade: average_course_grade });
				}
				coursesData = instructorCourseSummaries;

				const uniqueAssignmentsMap = new Map<string, InstructorUpcomingAssignment>();
				collectedRawAssignmentsForInstructor.forEach(rawAsn => {
					// Unique key per assignment definition (name, due date, course), not per student assignment
					const key = `${rawAsn.courseId}-${rawAsn.name}-${rawAsn.dueDate}`;
					if (!uniqueAssignmentsMap.has(key)) {
						uniqueAssignmentsMap.set(key, {
							unique_key: key,
							assignment_name: rawAsn.name,
							due_date: rawAsn.dueDate,
							course_id: rawAsn.courseId,
							course_name: rawAsn.courseName,
						});
					}
				});
				upcomingInstructorAssignments = Array.from(uniqueAssignmentsMap.values())
					.sort((a, b) => new Date(a.due_date).getTime() - new Date(b.due_date).getTime());
			}
		} else if (role === 'admin') {
			const { data: adminData, error: adminError } = await locals.supabase
				.from('admins')
				.select('admin_id, first_name, email')
				.eq('user_id', user.id)
				.single();

			if (adminError && adminError.code !== 'PGRST116') {
				profile = { first_name: user.email?.split('@')[0] || 'Admin', email: user.email };
			} else if (adminData) {
				profile = adminData;
			} else {
				profile = { first_name: user.email?.split('@')[0] || 'Admin', email: user.email };
			}

			// Daten für Admins laden: Systemweite Kursstatistiken
			const { data: allCoursesRaw, error: coursesError } = await locals.supabase
				.from('courses')
				.select('course_id, course_name, format, ects, instructor_id, instructors (first_name, last_name)'); // Dozenteninfo mitladen

			if (coursesError) throw coursesError;

			const allCourses = allCoursesRaw || [];
			const adminCourseSummaries: AdminCourseSummary[] = [];

			for (const course of allCourses) {
				const { data: enrollments, error: enrollmentsError } = await locals.supabase
					.from('enrollments')
					.select('enrollment_id')
					.eq('course_id', course.course_id);

				if (enrollmentsError) {
					console.error(`Error fetching enrollments for course ${course.course_id}:`, enrollmentsError.message);
					adminCourseSummaries.push({
						...(course as any), // Cast, da instructors verschachtelt ist
						student_count: 0,
						average_grade: null,
						instructor_name: course.instructors ? `${course.instructors.first_name} ${course.instructors.last_name}` : 'N/A'
					});
					continue;
				}

				const student_count = enrollments?.length || 0;
				const courseStudentGrades: number[] = [];

				if (enrollments && enrollments.length > 0) {
					for (const enrollment of enrollments) {
						const { data: studentAssignments, error: studentAssignmentsError } = await locals.supabase
							.from('assignments')
							.select('grade, weight')
							.eq('enrollment_id', enrollment.enrollment_id);

						if (studentAssignmentsError) continue;

						let totalWeightedGrade = 0;
						let totalWeight = 0;
						let hasGradedAssignments = false;

						if (studentAssignments) {
							studentAssignments.forEach(sa => {
								if (sa.grade !== null && sa.weight !== null && sa.weight > 0) {
									totalWeightedGrade += sa.grade * sa.weight;
									totalWeight += sa.weight;
									hasGradedAssignments = true;
								}
							});
						}
						if (hasGradedAssignments && totalWeight > 0) {
							courseStudentGrades.push(parseFloat((totalWeightedGrade / totalWeight).toFixed(2)));
						}
					}
				}

				let average_course_grade: number | null = null;
				if (courseStudentGrades.length > 0) {
					const sumOfGrades = courseStudentGrades.reduce((sum, grade) => sum + grade, 0);
					average_course_grade = parseFloat((sumOfGrades / courseStudentGrades.length).toFixed(2));
				}
				adminCourseSummaries.push({
					course_id: course.course_id,
					course_name: course.course_name,
					format: course.format,
					ects: course.ects,
					student_count,
					average_grade: average_course_grade,
					instructor_name: course.instructors ? `${course.instructors.first_name} ${course.instructors.last_name}`.trim() : 'N/A'
				});
			}
			coursesData = adminCourseSummaries;
		}
	} catch (error: any) {
		console.error(`Error loading dashboard data for role ${role}:`, error.message);
	}

	return {
		user: user,
		profile: profile,
		role: role,
		courses: coursesData, // Enthält jetzt AdminCourseSummary[] für Admins
		upcomingInstructorAssignments: upcomingInstructorAssignments,
	};
};