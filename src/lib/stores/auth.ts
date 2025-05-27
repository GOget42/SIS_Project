// src/lib/stores/auth.ts
import { writable, get } from 'svelte/store';
import type { User } from '@supabase/supabase-js';
import { browser } from '$app/environment';
import { supabase as clientSupabase } from '$lib/supabaseClient';

// Initialwert ist undefined
export const user = writable<User | null | undefined>(undefined);

if (browser) {
	clientSupabase.auth.onAuthStateChange((event, session) => {
		const currentUserInStore = get(user);
		const newUserFromEvent = session?.user ?? null;

		console.log(`[auth.ts] onAuthStateChange - Event: ${event}, NewUserFromEvent ID: ${newUserFromEvent?.id}, CurrentStoreUser ID: ${currentUserInStore?.id}, StoreState: ${currentUserInStore === undefined ? 'undefined' : (currentUserInStore === null ? 'null' : 'user')}`);

		if (event === 'INITIAL_SESSION') {
			// Wenn der Store 'undefined' ist (noch nicht vom Server gesetzt), INITIAL_SESSION vertrauen.
			if (currentUserInStore === undefined) {
				console.log(`[auth.ts] INITIAL_SESSION: Store is undefined. Setting user from event: ${newUserFromEvent?.id}`);
				user.set(newUserFromEvent);
			}
				// Wenn der Store bereits einen User hat UND INITIAL_SESSION keinen User meldet,
			// diesen Zustand ignorieren, um Flackern zu vermeiden. Der Server-Wert hat Vorrang.
			else if (currentUserInStore !== null && newUserFromEvent === null) {
				console.log(`[auth.ts] INITIAL_SESSION: Reported no user, but store already has user (${currentUserInStore?.id}). Ignoring to prevent flicker.`);
			}
			// In anderen Fällen (z.B. beide haben einen User, oder beide sind null), Update durchführen.
			else {
				console.log(`[auth.ts] INITIAL_SESSION: Updating user store to: ${newUserFromEvent?.id}`);
				user.set(newUserFromEvent);
			}
		} else if (event === 'SIGNED_IN') {
			console.log(`[auth.ts] SIGNED_IN: Setting user from event: ${newUserFromEvent?.id}`);
			user.set(newUserFromEvent);
		} else if (event === 'SIGNED_OUT') {
			console.log(`[auth.ts] SIGNED_OUT: Setting user to null.`);
			user.set(null); // Immer auf null setzen bei SIGNED_OUT
		} else if (event === 'USER_UPDATED' || event === 'TOKEN_REFRESHED' || event === 'PASSWORD_RECOVERY') {
			// Nur aktualisieren, wenn sich der Benutzer tatsächlich geändert hat
			if (newUserFromEvent?.id !== currentUserInStore?.id || (newUserFromEvent === null && currentUserInStore !== null) || (newUserFromEvent !== null && currentUserInStore === null) ) {
				console.log(`[auth.ts] ${event}: Updating user from event: ${newUserFromEvent?.id}`);
				user.set(newUserFromEvent);
			} else {
				console.log(`[auth.ts] ${event}: No change in user. Store not updated.`);
			}
		}
	});
}