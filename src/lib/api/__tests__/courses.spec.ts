import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createCourse, deleteCourse, getAllCourses, getCourseById, updateCourse } from '../courses';
import { supabase } from '$lib/supabaseClient';

vi.mock('$lib/supabaseClient', () => ({
	supabase: { from: vi.fn() }
}));

const fromMock = supabase.from as unknown as ReturnType<typeof vi.fn>;

beforeEach(() => {
	fromMock.mockReset();
});

describe('courses api', () => {
	it('getAllCourses returns list', async () => {
		const expected = [{ course_id: 1, course_name: 'Math' }];
		const selectMock = vi.fn().mockResolvedValue({ data: expected, error: null });
		fromMock.mockReturnValue({ select: selectMock });

		const result = await getAllCourses();

		expect(fromMock).toHaveBeenCalledWith('courses');
		expect(selectMock).toHaveBeenCalledWith('*');
		expect(result).toEqual(expected);
	});

	it('getCourseById queries by id', async () => {
		const expected = { course_id: 2, course_name: 'Sci' };
		const singleMock = vi.fn().mockResolvedValue({ data: expected, error: null });
		const eqMock = vi.fn(() => ({ single: singleMock }));
		const selectMock = vi.fn(() => ({ eq: eqMock }));
		fromMock.mockReturnValue({ select: selectMock });

		const result = await getCourseById(2);

		expect(fromMock).toHaveBeenCalledWith('courses');
		expect(selectMock).toHaveBeenCalledWith('*');
		expect(eqMock).toHaveBeenCalledWith('course_id', 2);
		expect(result).toEqual(expected);
	});

	it('createCourse inserts', async () => {
		const course = { course_name: 'Art' } as any;
		const expected = [{ course_id: 3 }];
		const insertMock = vi.fn().mockResolvedValue({ data: expected, error: null });
		fromMock.mockReturnValue({ insert: insertMock });

		const result = await createCourse(course);

		expect(fromMock).toHaveBeenCalledWith('courses');
		expect(insertMock).toHaveBeenCalledWith([course]);
		expect(result).toEqual(expected);
	});

	it('updateCourse updates record', async () => {
		const updates = { course_name: 'BIO' };
		const eqMock = vi.fn().mockResolvedValue({ data: [], error: null });
		const updateMock = vi.fn(() => ({ eq: eqMock }));
		fromMock.mockReturnValue({ update: updateMock });

		await updateCourse(4, updates as any);

		expect(fromMock).toHaveBeenCalledWith('courses');
		expect(updateMock).toHaveBeenCalledWith(updates);
		expect(eqMock).toHaveBeenCalledWith('course_id', 4);
	});

	it('deleteCourse deletes record', async () => {
		const eqMock = vi.fn().mockResolvedValue({ error: null });
		const deleteMock = vi.fn(() => ({ eq: eqMock }));
		fromMock.mockReturnValue({ delete: deleteMock });

		await deleteCourse(5);

		expect(fromMock).toHaveBeenCalledWith('courses');
		expect(deleteMock).toHaveBeenCalled();
		expect(eqMock).toHaveBeenCalledWith('course_id', 5);
	});
});
