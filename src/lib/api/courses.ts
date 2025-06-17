import type { Database } from '$lib/supabaseClient';
import { supabase } from '$lib/supabaseClient';

type Course = Database['public']['Tables']['courses']['Row'];
type NewCourse = Database['public']['Tables']['courses']['Insert'];
type CourseUpdate = Database['public']['Tables']['courses']['Update'];

export async function getAllCourses(): Promise<Course[]> {
	const { data, error } = await supabase.from('courses').select('*');
	if (error) throw error;
	return data;
}

export async function getCourseById(id: number): Promise<Course> {
	const { data, error } = await supabase.from('courses').select('*').eq('course_id', id).single();
	if (error) throw error;
	return data;
}

export async function createCourse(course: NewCourse): Promise<Course[]> {
	const { data, error } = await supabase.from('courses').insert([course]);
	if (error) throw error;
	return data;
}

export async function updateCourse(id: number, updates: CourseUpdate): Promise<Course[]> {
	const { data, error } = await supabase.from('courses').update(updates).eq('course_id', id);
	if (error) throw error;
	return data;
}

export async function deleteCourse(id: number): Promise<void> {
	const { error } = await supabase.from('courses').delete().eq('course_id', id);
	if (error) throw error;
}
