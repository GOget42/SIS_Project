// src/lib/supabaseClient.ts
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_ANON_KEY } from '$env/static/public';

// Importieren und re-exportieren Sie den Database-Typ
// Der Pfad zeigt nun auf die generierte Datei database.types.ts
export type { Database } from './database.types';
import type { Database } from './database.types'; // Notwendig, damit der Typ im aktuellen Modul bekannt ist

export const supabase: SupabaseClient<Database> = createClient(
	PUBLIC_SUPABASE_URL,
	PUBLIC_SUPABASE_ANON_KEY,
	{
		auth: {
			persistSession: true,
			autoRefreshToken: true,
			detectSessionInUrl: true,
		}
	}
);