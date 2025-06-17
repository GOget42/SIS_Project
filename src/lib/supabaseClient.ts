import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { PUBLIC_SUPABASE_ANON_KEY, PUBLIC_SUPABASE_URL } from '$env/static/public';
// Import the type here so the generic parameter below is recognised
import type { Database } from './database.types';

// Re-export the generated Database type for use throughout the app
export type { Database } from './database.types';

export const supabase: SupabaseClient<Database> = createClient(
	PUBLIC_SUPABASE_URL,
	PUBLIC_SUPABASE_ANON_KEY,
	{
		auth: {
			persistSession: true,
			autoRefreshToken: true,
			detectSessionInUrl: true
		}
	}
);
