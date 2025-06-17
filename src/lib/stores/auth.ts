import { get, writable } from 'svelte/store';
import type { User } from '@supabase/supabase-js';
import { browser } from '$app/environment';
import { supabase as clientSupabase } from '$lib/supabaseClient';

// Initial value is undefined
export const user = writable<User | null | undefined>(undefined);

if (browser) {
	clientSupabase.auth.onAuthStateChange((event, session) => {
		const currentUserInStore = get(user);
		const newUserFromEvent = session?.user ?? null;

		console.log(
			`[auth.ts] onAuthStateChange - Event: ${event}, NewUserFromEvent ID: ${newUserFromEvent?.id}, CurrentStoreUser ID: ${currentUserInStore?.id}, StoreState: ${currentUserInStore === undefined ? 'undefined' : currentUserInStore === null ? 'null' : 'user'}`
		);

		if (event === 'INITIAL_SESSION') {
			// If the store is 'undefined' (not yet set by the server), trust INITIAL_SESSION.
			if (currentUserInStore === undefined) {
				console.log(
					`[auth.ts] INITIAL_SESSION: Store is undefined. Setting user from event: ${newUserFromEvent?.id}`
				);
				user.set(newUserFromEvent);
			}
			// If the store already has a user and INITIAL_SESSION reports none,
			// ignore to prevent flicker. The server value takes precedence.
			else if (currentUserInStore !== null && newUserFromEvent === null) {
				console.log(
					`[auth.ts] INITIAL_SESSION: Reported no user, but store already has user (${currentUserInStore?.id}). Ignoring to prevent flicker.`
				);
			}
			// In other cases (both have a user or both are null), update the store.
			else {
				console.log(`[auth.ts] INITIAL_SESSION: Updating user store to: ${newUserFromEvent?.id}`);
				user.set(newUserFromEvent);
			}
		} else if (event === 'SIGNED_IN') {
			console.log(`[auth.ts] SIGNED_IN: Setting user from event: ${newUserFromEvent?.id}`);
			user.set(newUserFromEvent);
		} else if (event === 'SIGNED_OUT') {
			console.log(`[auth.ts] SIGNED_OUT: Setting user to null.`);
			user.set(null); // Always reset to null on SIGNED_OUT
		} else if (
			event === 'USER_UPDATED' ||
			event === 'TOKEN_REFRESHED' ||
			event === 'PASSWORD_RECOVERY'
		) {
			// Only update if the user actually changed
			if (
				newUserFromEvent?.id !== currentUserInStore?.id ||
				(newUserFromEvent === null && currentUserInStore !== null) ||
				(newUserFromEvent !== null && currentUserInStore === null)
			) {
				console.log(`[auth.ts] ${event}: Updating user from event: ${newUserFromEvent?.id}`);
				user.set(newUserFromEvent);
			} else {
				console.log(`[auth.ts] ${event}: No change in user. Store not updated.`);
			}
		}
	});
}
