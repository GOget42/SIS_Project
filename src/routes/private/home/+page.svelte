<script lang="ts">
    import type { PageData } from './$types';
    import StudentsPerCourseChart from '$lib/components/StudentsPerCourseChart.svelte';
    import GPAPerCourseChart from '$lib/components/GPAPerCourseChart.svelte';
    import ProgressChart from '$lib/components/ProgressChart.svelte';
    import GradeDistributionStudentChart from '$lib/components/GradeDistributionStudentChart.svelte';
    import StudentAssignmentTimeline from '$lib/components/StudentAssignmentTimeline.svelte';
    import GradeDistributionInstructorChart from '$lib/components/GradeDistributionInstructorChart.svelte';
    import InstructorAssignmentTimeline from '$lib/components/InstructorAssignmentTimeline.svelte';
    import AdminCourseOverview from '$lib/components/AdminCourseOverview.svelte';
    import AdminStudentOverview from '$lib/components/AdminStudentOverview.svelte';

    export let data: PageData;

    const user = data.user;
    const profile = data.profile; // This is ProfilesRow | null
    const role = data.role;

    // --- Studenten specific logic ---
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

    // --- Instructor specific reactive variables ---
    let instructorProfileForChart: { instructor_id: number } | undefined = undefined;
    let instructorStudentEnrollmentChartData: Array<{ course_name: string; student_count: number }> = [];

    interface InstructorCourseSummary {
        course_id: number; course_name: string; student_count: number; average_grade: number | null; format: string; ects: number;
    }

    // --- Admin specific types ---
    interface AdminCourseSummary {
        course_id: number; course_name: string; student_count: number; average_grade: number | null; format: string; ects: number; instructor_name?: string | null;
    }

    $: {
        if (role === 'student' && data.courses && profile && 'student_id' in profile && profile.student_id) {
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

            const coursesForInstructor = data.courses as InstructorCourseSummary[] | undefined;
            if (coursesForInstructor) {
                instructorStudentEnrollmentChartData = coursesForInstructor.map(c => ({
                    course_name: c.course_name,
                    student_count: c.student_count
                }));
            } else {
                instructorStudentEnrollmentChartData = [];
            }
        }
    }

</script>

<div class="container mx-auto p-4 sm:p-6 lg:p-8">
    {#if user && profile}
        <div class="bg-white shadow-lg rounded-lg p-6 mb-8">
            <h1 class="text-3xl font-bold text-gray-800 mb-2">
                Welcome, <span class="text-blue-600 capitalize">{role || 'User'}</span> {profile.first_name || user.email?.split('@')[0]}!
            </h1>
            <p class="text-md text-gray-600"><strong>Email:</strong> {profile.email || user.email}</p>
        </div>

        {#if role === 'student'}
            {#if studentIdForCharts}
                <div class="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
                    <div class="bg-white shadow-xl rounded-xl p-6">
                        <ProgressChart student_id={studentIdForCharts} />
                    </div>
                    <div class="bg-white shadow-xl rounded-xl p-6">
                        <GradeDistributionStudentChart student_id={studentIdForCharts} />
                    </div>
                </div>
                <div class="mt-8">
                    <StudentAssignmentTimeline student_id={studentIdForCharts} />
                </div>
            {:else}
                <div class="bg-yellow-100 border-l-4 border-yellow-500 text-yellow-700 p-4 mb-6" role="alert">
                    <p class="font-bold">Hinweis</p>
                    <p>Studenten-ID nicht im Profil gefunden oder Profil unvollständig, Diagramme können nicht angezeigt werden.</p>
                </div>
            {/if}

            {#if data.courses && (data.courses as CourseDataForStudent[]).length > 0}
                <div class="bg-white shadow-md rounded-lg p-6 mt-8">
                    <h2 class="text-2xl font-semibold text-gray-700 mb-4">Enrolled Courses</h2>
                    <ul class="space-y-3">
                        {#each data.courses as course (course.course_id)}
                            {@const studentCourse = course as CourseDataForStudent}
                            <li class="border border-gray-200 p-4 rounded-md hover:bg-gray-50">
                                <a href={`/private/courses/${studentCourse.course_id}`} class="text-blue-600 hover:text-blue-800 hover:underline font-medium">
                                    {studentCourse.course_name} {#if studentCourse.ects}<span class="text-sm text-gray-500"> ({studentCourse.ects} ECTS)</span>{/if}
                                </a>
                            </li>
                        {/each}
                    </ul>
                </div>
            {:else}
                <div class="bg-white shadow-md rounded-lg p-6 text-center mt-8">
                    <p class="text-gray-500">You are not enrolled in any courses.</p>
                </div>
            {/if}

        {:else if role === 'instructor'}
            {@const instructorCourses = data.courses as InstructorCourseSummary[] | undefined}
            <div class="bg-white shadow-xl rounded-xl p-6 mb-8">
                <h2 class="text-2xl font-semibold text-gray-800 mb-6">Performance Overview</h2>
                <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <div>
                        {#if instructorProfileForChart?.instructor_id}
                            <GradeDistributionInstructorChart instructor_id={instructorProfileForChart.instructor_id.toString()} />
                        {:else}
                            <div class="flex flex-col items-center justify-center h-full bg-gray-50 p-4 rounded-lg text-center">
                                <p class="text-md font-semibold text-gray-600">Grade Distribution Data</p>
                                <p class="text-sm text-gray-500 mt-1">Instructor ID not available to display grade distribution.</p>
                            </div>
                        {/if}
                    </div>
                    <div>
                        {#if instructorStudentEnrollmentChartData.length > 0}
                            <StudentsPerCourseChart courses={instructorStudentEnrollmentChartData} title="Student Enrollment per Course" />
                        {:else}
                            <div class="flex flex-col items-center justify-center h-full bg-gray-50 p-4 rounded-lg text-center">
                                <svg xmlns="http://www.w3.org/2000/svg" class="h-10 w-10 text-gray-400 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                                    <path stroke-linecap="round" stroke-linejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-2.277M17 20H7m10 0v-2c0-.653-.084-1.283-.24-1.88M7 16H5m2 0v-1a3 3 0 013-3h4a3 3 0 013 3v1m-9 4h10M5 20H3.28A1.99 1.99 0 011.5 18.225V18a2 2 0 012-2h1.161M12 12a3 3 0 100-6 3 3 0 000 6z" />
                                </svg>
                                <p class="text-md font-semibold text-gray-600">Student Enrollment Data</p>
                                <p class="text-sm text-gray-500 mt-1">
                                    No courses assigned or student counts are unavailable to display enrollment data.
                                </p>
                            </div>
                        {/if}
                    </div>
                </div>
            </div>

            <!-- StudentAssignmentTimeline for Instructor -->
            {#if instructorProfileForChart?.instructor_id}
                <div class="bg-white shadow-xl rounded-xl p-6 my-8">
                    <InstructorAssignmentTimeline instructor_id={instructorProfileForChart.instructor_id.toString()} />
                </div>
            {:else}
                <div class="bg-yellow-100 border-l-4 border-yellow-500 text-yellow-700 p-4 my-8" role="alert">
                    <p class="font-bold">Hinweis</p>
                    <p>Instructor ID nicht verfügbar, Aufgaben-Timeline kann nicht angezeigt werden.</p>
                </div>
            {/if}

            {#if instructorCourses && instructorCourses.length > 0}
                <div class="bg-white shadow-md rounded-lg p-6">
                    <h2 class="text-2xl font-semibold text-gray-700 mb-4">Teaching Courses</h2>
                    <ul class="space-y-3">
                        {#each instructorCourses as course (course.course_id)}
                            <li class="border border-gray-200 p-4 rounded-md hover:bg-gray-50">
                                <a href={`/private/courses/${course.course_id}`} class="text-blue-600 hover:text-blue-800 hover:underline font-medium">
                                    {course.course_name} <span class="text-sm text-gray-500">({course.format}, {course.ects} ECTS)</span>
                                </a>
                            </li>
                        {/each}
                    </ul>
                </div>
            {:else}
                <div class="bg-white shadow-md rounded-lg p-6 text-center">
                    <p class="text-gray-500">You are not teaching any courses.</p>
                </div>
            {/if}

        {:else if role === 'admin'}
            <div class="mb-8">
                <div class="p-6">
                    <div class="mb-4">
                        <AdminCourseOverview/>
                    </div>
                </div>
            </div>
            <div class="mb-8">
                <div class="p-6">
                    <div class="mb-4">
                        <AdminStudentOverview/>
                    </div>
                </div>
            </div>
        {:else}
            <div class="bg-white shadow-md rounded-lg p-6 text-center">
                <p class="text-gray-500">Role specific view not available for '{role || 'undefined role'}'.</p>
            </div>
        {/if}
    {:else if user}
        <div class="bg-white shadow-md rounded-lg p-6 text-center">
            <p class="text-gray-500">Loading profile information...</p>
        </div>
    {:else}
        <div class="bg-white shadow-md rounded-lg p-6 text-center">
            <p class="text-gray-500">Redirecting to login...</p>
        </div>
    {/if}
</div>