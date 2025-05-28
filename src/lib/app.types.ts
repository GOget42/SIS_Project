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
	instructors: Instructor | null; // Supabase Join-Syntax !instructor_id(...) liefert Objekt oder null
}

export interface AppEnrollment extends Enrollment {
	students: Student | null; // Supabase Join-Syntax students(*) liefert Objekt oder null
	assignments: Assignment[]; // Supabase Join-Syntax assignments(...) liefert Array
}

// Typ für die Daten, die von der `load` Funktion in `+page.server.ts` zurückgegeben werden
export interface AppCoursePageData {
	user: User | null; // Oder ein spezifischerer User-Typ Ihrer Anwendung
	course: AppCourse | null;
	enrollments: AppEnrollment[];
	availableStudents: Student[]; // Studenten, die noch nicht im Kurs sind
	error?: string | null;
}

// Typen für Formular-Action-Rückgaben (optional, aber gut für Typsicherheit im Svelte-Code)
export interface AddStudentFormResult {
	addStudentSuccess?: string;
	addStudentError?: string;
	student_id_form?: string; // Zur Identifizierung des Formulars bei Fehlern
}

export interface RemoveStudentFormResult {
	removeStudentSuccess?: string;
	removeStudentError?: string;
	enrollment_id_form?: string;
}

export interface AddAssignmentFormResult {
	addAssignmentSuccess?: string;
	addAssignmentError?: string;
	enrollment_id_form?: string; // Um das Formular zu identifizieren
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

// Kombinierter Typ für die `form` Prop in Svelte
export type CoursePageActionData = AddStudentFormResult &
	RemoveStudentFormResult &
	AddAssignmentFormResult &
	UpdateAssignmentFormResult &
	DeleteAssignmentFormResult & {
	// Allgemeine Fehler, falls nicht spezifisch für eine Aktion
	error?: string;
};