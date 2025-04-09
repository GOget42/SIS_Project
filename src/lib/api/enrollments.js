import { supabase } from '$lib/supabaseClient'

export async function getAllEnrollments() {
  const { data, error } = await supabase.from('enrollments').select('*')
  if (error) throw error
  return data
}

export async function createEnrollment(enrollment) {
  const { data, error } = await supabase.from('enrollments').insert([enrollment])
  if (error) throw error
  return data
}

export async function deleteEnrollment(id) {
  const { error } = await supabase.from('enrollments').delete().eq('enrollment_id', id)
  if (error) throw error
}
