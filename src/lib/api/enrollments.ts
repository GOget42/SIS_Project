// src/lib/api/enrollments.ts
import type { Database } from '$lib/supabaseClient';
import { supabase } from '$lib/supabaseClient';

type Enrollment = Database['public']['Tables']['enrollments']['Row'];
type NewEnrollment = Database['public']['Tables']['enrollments']['Insert'];

export async function getAllEnrollments(): Promise<Enrollment[]> {
  const { data, error } = await supabase.from('enrollments').select('*');
  if (error) throw error;
  return data;
}

export async function createEnrollment(enrollment: NewEnrollment): Promise<Enrollment[]> {
  const { data, error } = await supabase.from('enrollments').insert([enrollment]);
  if (error) throw error;
  return data;
}

export async function deleteEnrollment(id: string): Promise<void> {
  const { error } = await supabase.from('enrollments').delete().eq('enrollment_id', id);
  if (error) throw error;
}
