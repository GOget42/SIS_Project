import { vi, describe, it, expect, beforeEach } from 'vitest';
import { getAllEnrollments, createEnrollment, deleteEnrollment } from '../enrollments';
import { supabase } from '$lib/supabaseClient';

vi.mock('$lib/supabaseClient', () => ({
	supabase: { from: vi.fn() }
}));

const fromMock = supabase.from as unknown as ReturnType<typeof vi.fn>;

beforeEach(() => {
	fromMock.mockReset();
});

describe('enrollments api', () => {
	it('getAllEnrollments fetches data', async () => {
		const expected = [{ enrollment_id: 1 }];
		const selectMock = vi.fn().mockResolvedValue({ data: expected, error: null });
		fromMock.mockReturnValue({ select: selectMock });

		const result = await getAllEnrollments();

		expect(fromMock).toHaveBeenCalledWith('enrollments');
		expect(selectMock).toHaveBeenCalledWith('*');
		expect(result).toEqual(expected);
	});

	it('createEnrollment inserts', async () => {
		const enrollment = { student_id: 1 } as any;
		const expected = [{ enrollment_id: 2 }];
		const insertMock = vi.fn().mockResolvedValue({ data: expected, error: null });
		fromMock.mockReturnValue({ insert: insertMock });

		const result = await createEnrollment(enrollment);

		expect(fromMock).toHaveBeenCalledWith('enrollments');
		expect(insertMock).toHaveBeenCalledWith([enrollment]);
		expect(result).toEqual(expected);
	});

	it('deleteEnrollment deletes by id', async () => {
		const eqMock = vi.fn().mockResolvedValue({ error: null });
		const deleteMock = vi.fn(() => ({ eq: eqMock }));
		fromMock.mockReturnValue({ delete: deleteMock });

		await deleteEnrollment(3);

		expect(fromMock).toHaveBeenCalledWith('enrollments');
		expect(deleteMock).toHaveBeenCalled();
		expect(eqMock).toHaveBeenCalledWith('enrollment_id', 3);
	});
});
