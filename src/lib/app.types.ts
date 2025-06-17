import type { Tables } from './database.types';
import type { User } from '@supabase/supabase-js';

// Alias types for easier usage
export type Course = Tables<'courses'>;
export type Instructor = Tables<'instructors'>;
export type Student = Tables<'students'>;
export type Enrollment = Tables<'enrollments'>;
export type Assignment = Tables<'assignments'>;
export type Admin = Tables<'admins'>;

// Extended for the course detail page
export interface AppCourse extends Course {
	instructors: Instructor | null;
}

export interface AppEnrollment extends Enrollment {
	students: Student | null;
	assignments: Assignment[];
}

// Type for the data returned by the `load` function in `+page.server.ts`
export interface AppCoursePageData {
	user: User | null;
	course: AppCourse | null;
	enrollments: AppEnrollment[];
	availableStudents: Student[];
	error?: string | null;
}

// Types for form action returns
export interface AddStudentFormResult {
	addStudentSuccess?: string;
	addStudentError?: string;
	student_id_form?: string;
}

export interface RemoveStudentFormResult {
	removeStudentSuccess?: string;
	removeStudentError?: string;
	enrollment_id_form?: string;
}

export interface AddAssignmentFormResult {
	addAssignmentSuccess?: string;
	addAssignmentError?: string;
	enrollment_id_form?: string;
}

export interface UpdateAssignmentFormResult {
	updateAssignmentSuccess?: string;
	updateAssignmentError?: string;
	assignment_id_form?: string;
	enrollment_id_form?: string;
}

export interface DeleteAssignmentFormResult {
	deleteAssignmentSuccess?: string;
	deleteAssignmentError?: string;
	assignment_id_form?: string;
	enrollment_id_form?: string;
}

export interface AddAssignmentToCourseFormResult {
	addAssignmentToCourseSuccess?: string;
	addAssignmentToCourseError?: string;
	assignment_name_form?: string;
        // grade_form?: string; // Removed
	weight_form?: string;
	max_points_form?: string;
	due_date_form?: string;
}

// Combined type for the `form` prop in Svelte
export type CoursePageActionData = AddStudentFormResult &
	RemoveStudentFormResult &
	AddAssignmentFormResult &
	UpdateAssignmentFormResult &
	DeleteAssignmentFormResult &
	AddAssignmentToCourseFormResult & {
	error?: string;
};