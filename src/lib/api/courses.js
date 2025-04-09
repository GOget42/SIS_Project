import { supabase } from '$lib/supabaseClient'

export async function getAllCourses() {
  const { data, error } = await supabase.from('courses').select('*')
  if (error) throw error
  return data
}

export async function getCourseById(id) {
  const { data, error } = await supabase.from('courses').select('*').eq('course_id', id).single()
  if (error) throw error
  return data
}

export async function createCourse(course) {
  const { data, error } = await supabase.from('courses').insert([course])
  if (error) throw error
  return data
}

export async function updateCourse(id, updates) {
  const { data, error } = await supabase.from('courses').update(updates).eq('course_id', id)
  if (error) throw error
  return data
}

export async function deleteCourse(id) {
  const { error } = await supabase.from('courses').delete().eq('course_id', id)
  if (error) throw error
}
