import { render } from '@testing-library/svelte';
import { describe, expect, it } from 'vitest';
import LoadingIndicator from './LoadingIndicator.svelte';

describe('LoadingIndicator component', () => {
	it('renders loading text', () => {
		const { getByText } = render(LoadingIndicator);
		expect(getByText('Loading...')).toBeInTheDocument();
	});
});
