import { error, fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { deleteAuthUser } from '$lib/api/auth.ts';
import type {
	StaffCourseAssignment,
	CourseInfo,
	Assignment as StaffPageAssignment
} from './$types'; // Ensure these types are defined in $types or adjust accordingly

export const load: PageServerLoad = async ({ locals: { supabase, getSession }, params }) => {
	const session = await getSession();
	if (!session) {
		throw redirect(303, '/auth/login');
	}

	const { data: instructor, error: instructorError } = await supabase
		.from('instructors')
		.select(
			`
            instructor_id,
            first_name,
            last_name,
            email,
            user_id,
            created_at
            `
		)
		.eq('instructor_id', params.id)
		.single();

	if (instructorError || !instructor) {
		// In case of an error or if no instructor was found, return empty arrays
		// so the page does not break and can show a "Not found" message.
		return { staffMember: null, assignedCourses: [], availableTasks: [] };
	}

	// Fetch courses the instructor is responsible for, including assignments
	const { data: coursesData, error: coursesError } = await supabase
		.from('courses')
		.select(
			`
            course_id,
            course_name,
            assignments (
              assignment_id,
              assignment_name,
              due_date,
              weight
            )
        `
		)
		.eq('instructor_id', instructor.instructor_id);

	let formattedAssignedCourses: StaffCourseAssignment[] = [];
	if (coursesError) {
		console.error('Error fetching courses for staff member:', coursesError);
	} else if (coursesData) {
		// Create an array of promises to fetch student counts for each course in parallel
		const coursePromises = coursesData.map(async (course) => {
			const { count: studentCount, error: countError } = await supabase
				.from('enrollments')
				.select('*', { count: 'exact', head: true })
				.eq('course_id', course.course_id);

			if (countError) {
				console.error(
					`Error fetching student count for course ${course.course_id}:`,
					countError.message
				);
				// Setze student_count auf 0 oder einen anderen Standardwert im Fehlerfall
			}

			return {
				assignment_id: course.course_id, // course_id als eindeutige ID für die #each-Schleife in Svelte
				course: {
					course_id: course.course_id,
					course_name: course.course_name,
					student_count: studentCount === null ? 0 : studentCount // Add student count
				} as CourseInfo,
				assignments: (course.assignments || []).map((asm) => ({
					assignment_id: asm.assignment_id,
					assignment_name: asm.assignment_name,
					due_date: asm.due_date,
					weight: asm.weight
				})) as StaffPageAssignment[]
			};
		});

		// Wait for all promises to resolve to get formatted course data
		formattedAssignedCourses = await Promise.all(coursePromises);
	}

	const availableTasks: never[] = []; // Placeholder for future tasks implementation

	return {
		staffMember: instructor,
		assignedCourses: formattedAssignedCourses,
		availableTasks: availableTasks
	};
};

export const actions: Actions = {
	updateStaffMember: async ({ request, locals: { supabase, getSession }, params }) => {
		const session = await getSession();
		if (!session) {
			throw error(401, 'Unauthorized');
		}

		const formData = await request.formData();
		const first_name = formData.get('first_name') as string;
		const last_name = formData.get('last_name') as string;
		const email = formData.get('email') as string;

		if (!first_name || !last_name || !email) {
			return fail(400, {
				message: 'First name, last name, and email are required.',
				first_name,
				last_name,
				email,
				updateError: true
			});
		}

		const { error: updateError } = await supabase
			.from('instructors')
			.update({
				first_name,
				last_name,
				email
			})
			.eq('instructor_id', params.id);

		if (updateError) {
			return fail(500, {
				message: `Failed to update staff member information: ${updateError.message}`,
				first_name,
				last_name,
				email,
				updateError: true
			});
		}

		return {
			success: true,
			message: 'Staff member information updated successfully.'
		};
	},
	deleteStaffMember: async ({ locals: { supabase, getSession }, params }) => {
		const session = await getSession();
		if (!session) {
			throw error(401, 'Unauthorized');
		}

		const { data: staffMember, error: fetchError } = await supabase
			.from('instructors')
			.select('user_id, instructor_id')
			.eq('instructor_id', params.id)
			.single();

		if (fetchError || !staffMember) {
			return fail(404, { message: 'Staff member not found for deletion.' });
		}

		const authUserIdToDelete = staffMember.user_id;

		const { error: deleteInstructorError } = await supabase
			.from('instructors')
			.delete()
			.eq('instructor_id', params.id);

		if (deleteInstructorError) {
			return fail(500, {
				message: `Failed to delete staff member from database: ${deleteInstructorError.message}`
			});
		}

		if (authUserIdToDelete) {
			try {
				const authResponse = await deleteAuthUser(authUserIdToDelete);
				if (authResponse && authResponse.error) {
					throw authResponse.error; // Fehler weiterwerfen, um im Catch-Block behandelt zu werden
				}
				console.log(`Auth user ${authUserIdToDelete} deleted successfully.`);
			} catch (authError: any) {
				console.error('Failed to delete auth user:', authError.message);
				// Hier könnten Sie entscheiden, ob Sie den Benutzer über den teilweisen Fehler informieren möchten
				// oder ob der Redirect trotzdem erfolgen soll.
			}
		}
		throw redirect(303, '/private/staff');
	}
};
