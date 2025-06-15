import { enhance } from '$app/forms';
import { startFormSubmission, endFormSubmission } from '$lib/stores/formLoadingStore';
import type { SubmitFunction } from '@sveltejs/kit';

/**
 * A Svelte action that enhances a form to show a global loading indicator during submission.
 * It wraps SvelteKit's `enhance` functionality and calls `startFormSubmission` and
 * `endFormSubmission` around the submission lifecycle.
 *
 * @param node The HTMLFormElement to enhance.
 * @param userProvidedSubmitFunction An optional custom submit handler, similar to the one
 *                                   passed to SvelteKit's `enhance`.
 * @returns A Svelte action result object with a `destroy` method.
 */
export function formSubmitIndicator(
	node: HTMLFormElement,
	userProvidedSubmitFunction?: SubmitFunction
): { destroy: () => void } {
	const handleSubmit: SubmitFunction = async (input) => {
		startFormSubmission();

		if (userProvidedSubmitFunction) {
			const userResultOrUpdater = userProvidedSubmitFunction(input);

			if (typeof userResultOrUpdater === 'function') {
				// User returned an updater function directly
				return async (output) => {
					try {
						await userResultOrUpdater(output);
					} finally {
						endFormSubmission();
					}
				};
			} else if (userResultOrUpdater instanceof Promise) {
				// User returned a Promise
				try {
					const resolvedUserResult = await userResultOrUpdater;
					if (typeof resolvedUserResult === 'function') {
						// Promise resolved to an updater function
						return async (output) => {
							try {
								await resolvedUserResult(output);
							} finally {
								endFormSubmission();
							}
						};
					} else {
						// Promise resolved to void/undefined, use SvelteKit's default update
						return async (output) => {
							try {
								await output.update();
							} finally {
								endFormSubmission();
							}
						};
					}
				} catch (error) {
					// Promise rejected, ensure submission ends
					endFormSubmission();
					throw error; // Re-throw the error so SvelteKit can handle it
				}
			} else {
				// User function returned void/undefined directly, use SvelteKit's default update
				return async (output) => {
					try {
						await output.update();
					} finally {
						endFormSubmission();
					}
				};
			}
		} else {
			// No user-provided submit function, use SvelteKit's default update
			return async (output) => {
				try {
					await output.update();
				} finally {
					endFormSubmission();
				}
			};
		}
	};

	const enhanced = enhance(node, handleSubmit);

	return {
		destroy: () => {
			if (enhanced && typeof enhanced.destroy === 'function') {
				enhanced.destroy();
			}
		}
	};
}