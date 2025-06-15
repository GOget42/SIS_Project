import type { Tables } from './database.types';
import type { User } from '@supabase/supabase-js';

// Alias-Typen für leichtere Verwendung
export type Course = Tables<'courses'>;
export type Instructor = Tables<'instructors'>;
export type Student = Tables<'students'>;
export type Enrollment = Tables<'enrollments'>;
export type Assignment = Tables<'assignments'>;
export type Admin = Tables<'admins'>;

// Erweitert für die Kursdetailseite
export interface AppCourse extends Course {
	instructors: Instructor | null;
}

export interface AppEnrollment extends Enrollment {
	students: Student | null;
	assignments: Assignment[];
}

// Typ für die Daten, die von der `load` Funktion in `+page.server.ts` zurückgegeben werden
export interface AppCoursePageData {
	user: User | null;
	course: AppCourse | null;
	enrollments: AppEnrollment[];
	availableStudents: Student[];
	error?: string | null;
}

// Typen für Formular-Action-Rückgaben
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
	// grade_form?: string; // Entfernt
	weight_form?: string;
	max_points_form?: string;
	due_date_form?: string;
}

// Kombinierter Typ für die `form` Prop in Svelte
export type CoursePageActionData = AddStudentFormResult &
	RemoveStudentFormResult &
	AddAssignmentFormResult &
	UpdateAssignmentFormResult &
	DeleteAssignmentFormResult &
	AddAssignmentToCourseFormResult & {
	error?: string;
};