import { supabase } from '$lib/supabaseClient'

export async function getAllStudents() {
  const { data, error } = await supabase.from('students').select('*')
  if (error) throw error
  return data
}

export async function getStudentById(id) {
  const { data, error } = await supabase.from('students').select('*').eq('id', id).single()
  if (error) throw error
  return data
}

export async function createStudent(student) {
  const { data, error } = await supabase.from('students').insert([student])
  if (error) throw error
  return data
}

export async function updateStudent(id, updates) {
  const { data, error } = await supabase.from('students').update(updates).eq('id', id)
  if (error) throw error
  return data
}

export async function deleteStudent(id) {
  const { error } = await supabase.from('students').delete().eq('id', id)
  if (error) throw error
}
