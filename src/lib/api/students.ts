import type { Database } from '$lib/supabaseClient';
import { supabase } from '$lib/supabaseClient';

type Student = Database['public']['Tables']['students']['Row'];
type NewStudent = Database['public']['Tables']['students']['Insert'];
type StudentUpdate = Database['public']['Tables']['students']['Update'];

export async function getAllStudents(): Promise<Student[]> {
	const { data, error } = await supabase.from('students').select('*');
	if (error) throw error;
	return data || [];
}

export async function getStudentById(id: number): Promise<Student> {
	const { data, error } = await supabase
		.from('students')
		.select('*')
		.eq('student_id', id) // 'student_id' is the column in the DB
		.single();
	if (error) throw error;
	return data; // data is of type Student if no error occurs
}

export async function createStudent(student: NewStudent): Promise<Student[]> {
	// NewStudent should not contain student_id when it is auto-generated,
	// or it should be optional and of type number.
	const { data, error } = await supabase.from('students').insert([student]).select();
	if (error) throw error;
	return data || [];
}

export async function updateStudent(id: number, updates: StudentUpdate): Promise<Student[]> {
	// StudentUpdate should have student_id optional or omitted since it is not changed via updates.
	const { data, error } = await supabase
		.from('students')
		.update(updates)
		.eq('student_id', id) // 'student_id' is the column in the DB
		.select();
	if (error) throw error;
	return data || [];
}

export async function deleteStudent(id: number): Promise<void> {
	const { error } = await supabase.from('students').delete().eq('student_id', id); // 'student_id' is the column in the DB
	if (error) throw error;
}
