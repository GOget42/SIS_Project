// src/app.d.ts
import type { SupabaseClient, Session, User } from '@supabase/supabase-js';

declare global {
	namespace App {
		interface Locals {
			supabase: SupabaseClient;
			session: Session | null;
                        user: User | null; // Added for event.locals.user
		}
		interface PageData {
                        session?: Session | null; // Optional if you pass the session to PageData
                        user?: User | null;    // Optional if you pass the user to PageData
		}
		// interface Error {}
		// interface Platform {}
	}
}

export {};