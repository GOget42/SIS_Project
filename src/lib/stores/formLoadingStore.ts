import { writable } from 'svelte/store';

/**
 * Svelte store to track the global state of form submissions.
 * True if any form is currently submitting, false otherwise.
 */
export const isFormSubmitting = writable(false);

/**
 * Sets the form submission state to true.
 * Call this function when a form submission begins.
 */
export function startFormSubmission() {
	isFormSubmitting.set(true);
}

/**
 * Sets the form submission state to false.
 * Call this function when a form submission ends (either successfully or with an error).
 */
export function endFormSubmission() {
	isFormSubmitting.set(false);
}
