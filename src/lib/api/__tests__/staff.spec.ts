import { vi, describe, it, expect, beforeEach } from 'vitest';
import { getAllInstructors, getAllAdmins, getStaffById, updateStaff, deleteStaff } from '../staff';
import { supabase } from '$lib/supabaseClient';

vi.mock('$lib/supabaseClient', () => ({
  supabase: { from: vi.fn() }
}));

const fromMock = (supabase.from as unknown as ReturnType<typeof vi.fn>);

beforeEach(() => {
  fromMock.mockReset();
});

describe('staff api', () => {
  it('getAllInstructors returns data', async () => {
    const expected = [{ instructor_id: '1' }];
    const selectMock = vi.fn().mockResolvedValue({ data: expected, error: null });
    fromMock.mockReturnValue({ select: selectMock });

    const result = await getAllInstructors();

    expect(fromMock).toHaveBeenCalledWith('instructors');
    expect(selectMock).toHaveBeenCalledWith('*');
    expect(result).toEqual(expected);
  });

  it('getAllAdmins returns list', async () => {
    const expected = [{ admin_id: '1' }];
    const selectMock = vi.fn().mockResolvedValue({ data: expected, error: null });
    fromMock.mockReturnValue({ select: selectMock });

    const result = await getAllAdmins();

    expect(fromMock).toHaveBeenCalledWith('admins');
    expect(selectMock).toHaveBeenCalledWith('*');
    expect(result).toEqual(expected);
  });

  it('getStaffById resolves instructor first', async () => {
    const instructorResult = { instructor_id: '2' };
    const singleMockInstructor = vi.fn().mockResolvedValue({ data: instructorResult, error: null });
    const eqInstructor = vi.fn(() => ({ single: singleMockInstructor }));
    const selectInstructor = vi.fn(() => ({ eq: eqInstructor }));

    fromMock.mockReturnValueOnce({ select: selectInstructor });

    const result = await getStaffById('2');

    expect(result).toEqual({ ...instructorResult, role: 'instructor' });
    expect(fromMock).toHaveBeenCalledWith('instructors');
  });

  it('updateStaff updates correct table', async () => {
    const eqMock = vi.fn().mockResolvedValue({ data: [], error: null });
    const updateMock = vi.fn(() => ({ eq: eqMock }));
    fromMock.mockReturnValue({ update: updateMock });

    await updateStaff('10', { a: 1 } as any, 'admin');

    expect(fromMock).toHaveBeenCalledWith('admins');
    expect(updateMock).toHaveBeenCalledWith({ a: 1 });
    expect(eqMock).toHaveBeenCalledWith('admin_id', '10');
  });

  it('deleteStaff removes from table', async () => {
    const eqMock = vi.fn().mockResolvedValue({ error: null });
    const deleteMock = vi.fn(() => ({ eq: eqMock }));
    fromMock.mockReturnValue({ delete: deleteMock });

    await deleteStaff('11', 'instructor');

    expect(fromMock).toHaveBeenCalledWith('instructors');
    expect(deleteMock).toHaveBeenCalled();
    expect(eqMock).toHaveBeenCalledWith('instructor_id', '11');
  });
});
