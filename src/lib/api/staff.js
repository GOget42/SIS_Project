import { supabase } from '$lib/supabaseClient';

export async function getAllInstructors() {
	const { data, error } = await supabase.from('instructors').select('*');
	if (error) throw error;
	return data;
}

export async function getAllAdmins() {
	const { data, error } = await supabase.from('admins').select('*');
	if (error) throw error;
	return data;
}

export async function getStaffById(id) {
	// First try instructors
	const { data: instructor, error: instructorError } = await supabase
		.from('instructors')
		.select('*')
		.eq('id', id)
		.single();

	if (instructor && !instructorError) {
		return { ...instructor, role: 'instructor' };
	}

	// Then try admins
	const { data: admin, error: adminError } = await supabase
		.from('admins')
		.select('*')
		.eq('id', id)
		.single();

	if (admin && !adminError) {
		return { ...admin, role: 'admin' };
	}

	throw new Error('Staff not found');
}

export async function updateStaff(id, updates, role) {
	const table = role === 'admin' ? 'admins' : 'instructors';
	const { data, error } = await supabase.from(table).update(updates).eq('id', id);
	if (error) throw error;
	return data;
}

export async function deleteStaff(id, role) {
	const table = role === 'admin' ? 'admins' : 'instructors';
	const { error } = await supabase.from(table).delete().eq('id', id);
	if (error) throw error;
}
