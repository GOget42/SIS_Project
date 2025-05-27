// src/app.d.ts
import type { SupabaseClient, Session, User } from '@supabase/supabase-js';

declare global {
	namespace App {
		interface Locals {
			supabase: SupabaseClient;
			session: Session | null;
			user: User | null; // Hinzufügen für event.locals.user
		}
		interface PageData {
			session?: Session | null; // Optional: wenn Sie die Session an PageData übergeben
			user?: User | null;    // Optional: wenn Sie den Benutzer an PageData übergeben
		}
		// interface Error {}
		// interface Platform {}
	}
}

export {};