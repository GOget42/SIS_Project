import type { Database } from '$lib/supabaseClient';
import { supabase } from '$lib/supabaseClient';

type Admin = Database['public']['Tables']['admins']['Row'];
type AdminUpdate = Database['public']['Tables']['admins']['Update'];

type Instructor = Database['public']['Tables']['instructors']['Row'];
type InstructorUpdate = Database['public']['Tables']['instructors']['Update'];

export async function getAllInstructors(): Promise<Instructor[]> {
	const { data, error } = await supabase.from('instructors').select('*');
	if (error) throw error;
	return data;
}

export async function getAllAdmins(): Promise<Admin[]> {
	const { data, error } = await supabase.from('admins').select('*');
	if (error) throw error;
	return data;
}

// `id` should be either an instructor_id or an admin_id
export async function getStaffById(id: string): Promise<(Admin | Instructor) & { role: string }> {
	const { data: instructor, error: instructorError } = await supabase
		.from('instructors')
		.select('*')
		.eq('instructor_id', id)
		.single();

	if (instructor && !instructorError) {
		return { ...instructor, role: 'instructor' };
	}

	const { data: admin, error: adminError } = await supabase
		.from('admins')
		.select('*')
		.eq('admin_id', id)
		.single();

	if (admin && !adminError) {
		return { ...admin, role: 'admin' };
	}

	throw new Error('Staff not found or ID does not match expected type (instructor_id or admin_id)');
}

export async function updateStaff(
	id: string, // admin_id or instructor_id
	updates: Partial<InstructorUpdate | AdminUpdate>,
	role: 'admin' | 'instructor'
): Promise<Admin[] | Instructor[]> {
	const table = role === 'admin' ? 'admins' : 'instructors';
	const idColumn = role === 'admin' ? 'admin_id' : 'instructor_id';
	const { data, error } = await supabase.from(table).update(updates).eq(idColumn, id);
	if (error) throw error;
	return data;
}

export async function deleteStaff(id: string, role: 'admin' | 'instructor'): Promise<void> {
	const table = role === 'admin' ? 'admins' : 'instructors';
	const idColumn = role === 'admin' ? 'admin_id' : 'instructor_id';
	const { error } = await supabase.from(table).delete().eq(idColumn, id);
	if (error) throw error;
}
