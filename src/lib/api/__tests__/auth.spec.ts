import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createAuthUser, deleteAuthUser } from '../auth';
import { supabase } from '$lib/supabaseClient';

vi.mock('$lib/supabaseClient', () => ({
	supabase: { auth: { getSession: vi.fn() } }
}));

declare let global: any;

beforeEach(() => {
	(supabase.auth.getSession as any).mockReset();
	global.fetch = vi.fn();
});

describe('auth api', () => {
	it('createAuthUser posts data', async () => {
		(supabase.auth.getSession as any).mockResolvedValue({
			data: { session: { access_token: 't' } }
		});
		(global.fetch as any).mockResolvedValue({
			ok: true,
			json: () => Promise.resolve({ user: { id: 'u1' } })
		});

		const user = await createAuthUser('e', 'p', 'role', 'f', 'l');

		expect(global.fetch).toHaveBeenCalled();
		expect(user).toEqual({ id: 'u1' });
	});

	it('deleteAuthUser posts', async () => {
		(supabase.auth.getSession as any).mockResolvedValue({
			data: { session: { access_token: 't' } }
		});
		(global.fetch as any).mockResolvedValue({
			ok: true,
			json: () => Promise.resolve({ success: true })
		});

		const result = await deleteAuthUser('id1');

		expect(global.fetch).toHaveBeenCalled();
		expect(result).toEqual({ success: true });
	});
});
