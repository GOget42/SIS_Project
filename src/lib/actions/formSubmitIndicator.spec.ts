// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest';
import { formSubmitIndicator } from './formSubmitIndicator';
import { startFormSubmission, endFormSubmission } from '$lib/stores/formLoadingStore';
import { enhance } from '$app/forms';

vi.mock('$app/forms', () => ({ enhance: vi.fn(() => ({ destroy: vi.fn() })) }));
vi.mock('$lib/stores/formLoadingStore', () => ({
	startFormSubmission: vi.fn(),
	endFormSubmission: vi.fn()
}));

describe('formSubmitIndicator action', () => {
	it('calls enhance and handles submission', async () => {
		const node = document.createElement('form');
		const result = formSubmitIndicator(node);
		expect(enhance).toHaveBeenCalled();
		const handle = (enhance as any).mock.calls[0][1];
		const updateMock = vi.fn();
		const updateFn = await handle({} as any);
		await updateFn({ update: updateMock } as any);
		expect(startFormSubmission).toHaveBeenCalled();
		expect(updateMock).toHaveBeenCalled();
		expect(endFormSubmission).toHaveBeenCalled();
		result.destroy();
		const destroyFn = (enhance as any).mock.results[0].value.destroy;
		expect(destroyFn).toHaveBeenCalled();
	});
});
