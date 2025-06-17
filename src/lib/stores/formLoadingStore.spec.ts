import { describe, expect, it } from 'vitest';
import { endFormSubmission, isFormSubmitting, startFormSubmission } from './formLoadingStore';
import { get } from 'svelte/store';

describe('formLoadingStore', () => {
	it('toggles values', () => {
		expect(get(isFormSubmitting)).toBe(false);
		startFormSubmission();
		expect(get(isFormSubmitting)).toBe(true);
		endFormSubmission();
		expect(get(isFormSubmitting)).toBe(false);
	});
});
