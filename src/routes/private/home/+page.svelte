<script lang="ts">
	import type { PageData } from './$types';
	import StudentsPerCourseChart from '$lib/components/StudentsPerCourseChart.svelte';
	import ProgressChart from '$lib/components/ProgressChart.svelte';
	import GradeDistributionStudentChart from '$lib/components/GradeDistributionStudentChart.svelte';
	import StudentAssignmentTimeline from '$lib/components/StudentAssignmentTimeline.svelte';
	import GradeDistributionInstructorChart from '$lib/components/GradeDistributionInstructorChart.svelte';
	import InstructorAssignmentTimeline from '$lib/components/InstructorAssignmentTimeline.svelte';
	import AdminCourseOverview from '$lib/components/AdminCourseOverview.svelte';
	import AdminStudentOverview from '$lib/components/AdminStudentOverview.svelte';

	export let data: PageData;

	const user = data.user;
	const profile = data.profile; // ProfilesRow | null
	const role = data.role;

	// --- Student-specific logic ---
	interface CourseDataForStudent {
		course_id: number;
		course_name: string;
		ects: number | null;
		assignments: Array<{
			assignment_id: string | number;
			assignment_name: string;
			grade: number | null;
			weight: number | null;
			due_date: string | null;
		}>;
	}

	let studentIdForCharts: string | undefined = undefined;

	// --- Instructor-specific reactive variables ---
	let instructorProfileForChart: { instructor_id: number } | undefined = undefined;
	let instructorStudentEnrollmentChartData: Array<{ course_name: string; student_count: number }> = [];

	interface InstructorCourseSummary {
		course_id: number;
		course_name: string;
		student_count: number;
		average_grade: number | null;
		format: string;
		ects: number;
	}

	// Reactive block for ID and chart data
	$: {
		if (
			role === 'student' &&
			data.courses &&
			profile &&
			'student_id' in profile &&
			profile.student_id
		) {
			studentIdForCharts = profile.student_id.toString();
		} else {
			studentIdForCharts = undefined;
		}

		if (role === 'instructor') {
			if (profile && 'instructor_id' in profile && profile.instructor_id) {
				instructorProfileForChart = profile as { instructor_id: number };
			} else {
				instructorProfileForChart = undefined;
			}

			const coursesForInstructor = Array.isArray(data.courses)
				? (data.courses as InstructorCourseSummary[])
				: undefined;
			if (coursesForInstructor) {
				instructorStudentEnrollmentChartData = coursesForInstructor.map((c) => ({
					course_name: c.course_name,
					student_count: c.student_count
				}));
			} else {
				instructorStudentEnrollmentChartData = [];
			}
		}
	}

	// Reactive derivation of typed course lists
	$: coursesForStudent = Array.isArray(data.courses)
		? (data.courses as CourseDataForStudent[])
		: undefined;

	$: instructorCourses = Array.isArray(data.courses)
		? (data.courses as InstructorCourseSummary[])
		: undefined;
</script>

<div class="container mx-auto p-4 sm:p-6 lg:p-8">
	{#if user && profile}
		<div class="mb-8 rounded-lg bg-white p-6 shadow-lg">
			<h1 class="mb-2 text-3xl font-bold text-gray-800">
				Welcome, <span class="text-blue-600 capitalize">{role || 'User'}</span>
				{profile.first_name || user.email?.split('@')[0]}!
			</h1>
			<p class="text-md text-gray-600">
				<strong>Email:</strong> {profile.email || user.email}
			</p>
		</div>

		{#if role === 'student'}
			{#if studentIdForCharts}
				<div class="mb-8 grid grid-cols-1 gap-6 lg:grid-cols-2">
					<div class="rounded-xl bg-white p-6 shadow-xl">
						<ProgressChart student_id={studentIdForCharts} />
					</div>
					<div class="rounded-xl bg-white p-6 shadow-xl">
						<GradeDistributionStudentChart student_id={studentIdForCharts} />
					</div>
				</div>
				<div class="mt-8">
					<StudentAssignmentTimeline student_id={studentIdForCharts} />
				</div>
			{:else}
				<div
					class="mb-6 border-l-4 border-yellow-500 bg-yellow-100 p-4 text-yellow-700"
					role="alert"
				>
					<p class="font-bold">Note</p>
					<p>
						Student ID not found in the profile or profile incomplete, charts cannot be displayed.
					</p>
				</div>
			{/if}

			{#if coursesForStudent && coursesForStudent.length > 0}
				<div class="mt-8 rounded-lg bg-white p-6 shadow-md">
					<h2 class="mb-4 text-2xl font-semibold text-gray-700">Enrolled Courses</h2>
					<ul class="space-y-3">
						{#each coursesForStudent as course (course.course_id)}
							<li class="rounded-md border border-gray-200 p-4 hover:bg-gray-50">
								<a
									href={`/private/courses/${course.course_id}`}
									class="font-medium text-blue-600 hover:text-blue-800 hover:underline"
								>
									{course.course_name}
									{#if course.ects}
										<span class="text-sm text-gray-500">({course.ects} ECTS)</span>
									{/if}
								</a>
							</li>
						{/each}
					</ul>
				</div>
			{:else}
				<div class="mt-8 rounded-lg bg-white p-6 text-center shadow-md">
					<p class="text-gray-500">You are not enrolled in any courses.</p>
				</div>
			{/if}

		{:else if role === 'instructor'}
			<div class="mb-8 rounded-xl bg-white p-6 shadow-xl">
				<h2 class="mb-6 text-2xl font-semibold text-gray-800">Performance Overview</h2>
				<div class="grid grid-cols-1 gap-6 lg:grid-cols-2">
					<div>
						{#if instructorProfileForChart?.instructor_id}
							<GradeDistributionInstructorChart
								instructor_id={instructorProfileForChart.instructor_id.toString()}
							/>
						{:else}
							<div
								class="flex h-full flex-col items-center justify-center rounded-lg bg-gray-50 p-4 text-center"
							>
								<p class="text-md font-semibold text-gray-600">Grade Distribution Data</p>
								<p class="mt-1 text-sm text-gray-500">
									Instructor ID not available to display grade distribution.
								</p>
							</div>
						{/if}
					</div>
					<div>
						{#if instructorStudentEnrollmentChartData.length > 0}
							<StudentsPerCourseChart
								courses={instructorStudentEnrollmentChartData}
								title="Student Enrollment per Course"
							/>
						{:else}
							<div
								class="flex h-full flex-col items-center justify-center rounded-lg bg-gray-50 p-4 text-center"
							>
								<svg
									xmlns="http://www.w3.org/2000/svg"
									class="mb-2 h-10 w-10 text-gray-400"
									fill="none"
									viewBox="0 0 24 24"
									stroke="currentColor"
									stroke-width="2"
								>
									<path
										stroke-linecap="round"
										stroke-linejoin="round"
										d="M17 20h5v-2a3 3 0 00-5.356-2.277M17 20H7m10 0v-2c0-.653-.084-1.283-.24-1.88M7 16H5m2 0v-1a3 3 0 013-3h4a3 3 0 013 3v1m-9 4h10M5 20H3.28A1.99 1.99 0 011.5 18.225V18a2 2 0 012-2h1.161M12 12a3 3 0 100-6 3 3 0 000 6z"
									/>
								</svg>
								<p class="text-md font-semibold text-gray-600">Student Enrollment Data</p>
								<p class="mt-1 text-sm text-gray-500">
									No courses assigned or student counts are unavailable to display enrollment data.
								</p>
							</div>
						{/if}
					</div>
				</div>
			</div>

			{#if instructorProfileForChart?.instructor_id}
				<div class="my-8">
					<InstructorAssignmentTimeline
						instructor_id={instructorProfileForChart.instructor_id.toString()}
					/>
				</div>
			{:else}
				<div
					class="my-8 border-l-4 border-yellow-500 bg-yellow-100 p-4 text-yellow-700"
					role="alert"
				>
					<p class="font-bold">Note</p>
					<p>Instructor ID not available, assignment timeline cannot be displayed.</p>
				</div>
			{/if}

			{#if instructorCourses && instructorCourses.length > 0}
				<div class="rounded-lg bg-white p-6 shadow-md">
					<h2 class="mb-4 text-2xl font-semibold text-gray-700">Teaching Courses</h2>
					<ul class="space-y-3">
						{#each instructorCourses as course (course.course_id)}
							<li class="rounded-md border border-gray-200 p-4 hover:bg-gray-50">
								<a
									href={`/private/courses/${course.course_id}`}
									class="font-medium text-blue-600 hover:text-blue-800 hover:underline"
								>
									{course.course_name}
									<span class="text-sm text-gray-500">
                    ({course.format}, {course.ects} ECTS)
                  </span>
								</a>
							</li>
						{/each}
					</ul>
				</div>
			{:else}
				<div class="rounded-lg bg-white p-6 text-center shadow-md">
					<p class="text-gray-500">You are not teaching any courses.</p>
				</div>
			{/if}

		{:else if role === 'admin'}
			<div class="mb-8">
				<div class="p-6">
					<div class="mb-4">
						<AdminCourseOverview />
					</div>
				</div>
			</div>
			<div class="mb-8">
				<div class="p-6">
					<div class="mb-4">
						<AdminStudentOverview />
					</div>
				</div>
			</div>
		{:else}
			<div class="rounded-lg bg-white p-6 text-center shadow-md">
				<p class="text-gray-500">
					Role specific view not available for '{role || 'undefined role'}'.
				</p>
			</div>
		{/if}
	{:else if user}
		<div class="rounded-lg bg-white p-6 text-center shadow-md">
			<p class="text-gray-500">Loading profile information...</p>
		</div>
	{:else}
		<div class="rounded-lg bg-white p-6 text-center shadow-md">
			<p class="text-gray-500">Redirecting to login...</p>
		</div>
	{/if}
</div>
