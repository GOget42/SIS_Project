import { vi, describe, it, expect, beforeEach } from 'vitest';
import {
	getAllStudents,
	getStudentById,
	createStudent,
	updateStudent,
	deleteStudent
} from '../students';
import { supabase } from '$lib/supabaseClient';

vi.mock('$lib/supabaseClient', () => ({
	supabase: { from: vi.fn() }
}));

const fromMock = supabase.from as unknown as ReturnType<typeof vi.fn>;

beforeEach(() => {
	fromMock.mockReset();
});

describe('students api', () => {
	it('getAllStudents returns data', async () => {
		const expected = [{ student_id: 1, first_name: 'A' }];
		const selectMock = vi.fn().mockResolvedValue({ data: expected, error: null });
		fromMock.mockReturnValue({ select: selectMock });

		const result = await getAllStudents();

		expect(fromMock).toHaveBeenCalledWith('students');
		expect(selectMock).toHaveBeenCalledWith('*');
		expect(result).toEqual(expected);
	});

	it('getStudentById queries by id', async () => {
		const expected = { student_id: 2, first_name: 'B' };
		const singleMock = vi.fn().mockResolvedValue({ data: expected, error: null });
		const eqMock = vi.fn(() => ({ single: singleMock }));
		const selectMock = vi.fn(() => ({ eq: eqMock }));
		fromMock.mockReturnValue({ select: selectMock });

		const result = await getStudentById(2);

		expect(fromMock).toHaveBeenCalledWith('students');
		expect(selectMock).toHaveBeenCalledWith('*');
		expect(eqMock).toHaveBeenCalledWith('student_id', 2);
		expect(singleMock).toHaveBeenCalled();
		expect(result).toEqual(expected);
	});

	it('createStudent inserts and selects', async () => {
		const student = { first_name: 'C' } as any;
		const expected = [{ student_id: 3, first_name: 'C' }];
		const selectMock = vi.fn().mockResolvedValue({ data: expected, error: null });
		const insertMock = vi.fn(() => ({ select: selectMock }));
		fromMock.mockReturnValue({ insert: insertMock });

		const result = await createStudent(student);

		expect(fromMock).toHaveBeenCalledWith('students');
		expect(insertMock).toHaveBeenCalledWith([student]);
		expect(selectMock).toHaveBeenCalled();
		expect(result).toEqual(expected);
	});

	it('updateStudent updates record', async () => {
		const updates = { first_name: 'D' };
		const expected = [{ student_id: 4, first_name: 'D' }];
		const selectMock = vi.fn().mockResolvedValue({ data: expected, error: null });
		const eqMock = vi.fn(() => ({ select: selectMock }));
		const updateMock = vi.fn(() => ({ eq: eqMock }));
		fromMock.mockReturnValue({ update: updateMock });

		const result = await updateStudent(4, updates as any);

		expect(fromMock).toHaveBeenCalledWith('students');
		expect(updateMock).toHaveBeenCalledWith(updates);
		expect(eqMock).toHaveBeenCalledWith('student_id', 4);
		expect(selectMock).toHaveBeenCalled();
		expect(result).toEqual(expected);
	});

	it('deleteStudent removes record', async () => {
		const eqMock = vi.fn().mockResolvedValue({ error: null });
		const deleteMock = vi.fn(() => ({ eq: eqMock }));
		fromMock.mockReturnValue({ delete: deleteMock });

		await deleteStudent(5);

		expect(fromMock).toHaveBeenCalledWith('students');
		expect(deleteMock).toHaveBeenCalled();
		expect(eqMock).toHaveBeenCalledWith('student_id', 5);
	});
});
