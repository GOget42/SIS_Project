// src/lib/api/students.ts
import type { Database } from '$lib/supabaseClient'; // Stellt sicher, dass 'Database' von supabaseClient exportiert wird
import { supabase } from '$lib/supabaseClient';

// Die Supabase-Typen (Row, Insert, Update) sollten student_id bereits als number definieren,
// wenn es in der DB ein Integer ist und die Typen korrekt generiert wurden.
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
    .eq('student_id', id) // 'student_id' ist die Spalte in der DB
    .single();
  if (error) throw error;
  return data; // data ist vom Typ Student, wenn kein Fehler auftritt
}

export async function createStudent(student: NewStudent): Promise<Student[]> {
  // NewStudent sollte student_id nicht enthalten, wenn es auto-generiert wird,
  // oder es sollte optional sein und vom Typ number.
  const { data, error } = await supabase
    .from('students')
    .insert([student])
    .select();
  if (error) throw error;
  return data || [];
}

export async function updateStudent(id: number, updates: StudentUpdate): Promise<Student[]> {
  // StudentUpdate sollte student_id optional oder nicht enthalten, da es nicht über updates geändert wird.
  const { data, error } = await supabase
    .from('students')
    .update(updates)
    .eq('student_id', id) // 'student_id' ist die Spalte in der DB
    .select();
  if (error) throw error;
  return data || [];
}

export async function deleteStudent(id: number): Promise<void> {
  const { error } = await supabase
    .from('students')
    .delete()
    .eq('student_id', id); // 'student_id' ist die Spalte in der DB
  if (error) throw error;
}