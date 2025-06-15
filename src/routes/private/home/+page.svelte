<script lang="ts">
    import type { PageData } from './$types';
    import StudentsPerCourseChart from '$lib/components/StudentsPerCourseChart.svelte';
    import GPAPerCourseChart from '$lib/components/GPAPerCourseChart.svelte'; // Importieren

    export let data: PageData;

    const user = data.user;
    const profile = data.profile;
    const role = data.role;

    // --- Studenten spezifische Logik ---
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
    interface CalculatedCourseGrade {
        course_id: string | number;
        course_name: string;
        average_grade: number | null;
        total_weight_graded: number;
    }
    function calculateCourseGrades(studentCourses: CourseDataForStudent[]): CalculatedCourseGrade[] {
        return studentCourses.map(course => {
            let totalWeightedGrade = 0, totalWeightConsidered = 0, hasGradedAssignments = false;
            course.assignments?.forEach(a => {
                if (a.grade !== null && a.grade !== undefined && a.weight !== null && a.weight > 0) {
                    totalWeightedGrade += a.grade * a.weight;
                    totalWeightConsidered += a.weight;
                    hasGradedAssignments = true;
                }
            });
            if (!hasGradedAssignments || totalWeightConsidered === 0) return { course_id: course.course_id, course_name: course.course_name, average_grade: null, total_weight_graded: 0 };
            return { course_id: course.course_id, course_name: course.course_name, average_grade: parseFloat((totalWeightedGrade / totalWeightConsidered).toFixed(2)), total_weight_graded: parseFloat(totalWeightConsidered.toFixed(2)) };
        });
    }
    interface UpcomingAssignment {
        assignment_id: string | number; assignment_name: string; due_date: string; course_name: string; course_id: string | number;
    }
    function getUpcomingAssignments(studentCourses: CourseDataForStudent[]): UpcomingAssignment[] {
        const upcoming: UpcomingAssignment[] = []; const today = new Date(); today.setHours(0,0,0,0);
        studentCourses.forEach(c => c.assignments?.forEach(a => { if (a.due_date) { const d = new Date(a.due_date); if (d >= today) upcoming.push({ assignment_id: a.assignment_id, assignment_name: a.assignment_name, due_date: a.due_date, course_name: c.course_name, course_id: c.course_id }); }}));
        return upcoming.sort((a,b) => new Date(a.due_date).getTime() - new Date(b.due_date).getTime());
    }
    let studentIdForCharts: string | undefined = undefined;
    let courseGrades: CalculatedCourseGrade[] = [];
    let overallAverageGrade: number | null = null;
    let upcomingAssignmentsList: UpcomingAssignment[] = [];
    $: if (role === 'student' && data.courses && profile && 'student_id' in profile) {
        studentIdForCharts = (profile.student_id as number).toString(); // student_id ist number in DB
        const studentCourses = data.courses as CourseDataForStudent[];
        if (studentCourses.length > 0) {
            courseGrades = calculateCourseGrades(studentCourses);
            const validGrades = courseGrades.filter(cg => cg.average_grade !== null);
            overallAverageGrade = validGrades.length > 0 ? parseFloat((validGrades.reduce((s,cg) => s + (cg.average_grade || 0),0) / validGrades.length).toFixed(2)) : null;
            upcomingAssignmentsList = getUpcomingAssignments(studentCourses);
        } else { courseGrades = []; overallAverageGrade = null; upcomingAssignmentsList = []; }
    }

    // --- Instructor spezifische Typen (aus PageData, hier zur Klarheit) ---
    interface InstructorCourseSummary {
        course_id: number; course_name: string; student_count: number; average_grade: number | null; format: string; ects: number;
    }
    interface InstructorUpcomingAssignment {
        unique_key: string; assignment_name: string; due_date: string; course_name: string; course_id: number;
    }

    // --- Admin spezifische Typen (aus PageData, hier zur Klarheit) ---
    interface AdminCourseSummary {
        course_id: number; course_name: string; student_count: number; average_grade: number | null; format: string; ects: number; instructor_name?: string | null;
    }

</script>

<div class="container mx-auto p-4 sm:p-6 lg:p-8">
    {#if user && profile}
        <div class="bg-white shadow-lg rounded-lg p-6 mb-8">
            <h1 class="text-3xl font-bold text-gray-800 mb-2">
                Welcome, <span class="text-blue-600 capitalize">{role}</span> {profile.first_name || user.email?.split('@')[0]}!
            </h1>
            <p class="text-md text-gray-600"><strong>Email:</strong> {profile.email || user.email}</p>
        </div>

        {#if role === 'student'}
            {#if studentIdForCharts}
                <StudentCharts student_id={studentIdForCharts} />
            {:else}
                <div class="bg-yellow-100 border-l-4 border-yellow-500 text-yellow-700 p-4 mb-6" role="alert">
                    <p class="font-bold">Hinweis</p><p>Studenten-ID nicht im Profil gefunden, Diagramme können nicht angezeigt werden.</p>
                </div>
            {/if}
            <div class="mt-8 grid grid-cols-1 md:grid-cols-2 gap-6">
                <div class="bg-white shadow-md rounded-lg p-6">
                    <h2 class="text-xl font-semibold text-gray-700 mb-4">My Average Grades</h2>
                    {#if courseGrades.length > 0}
                        <ul class="space-y-2 mb-4">
                            {#each courseGrades as cg (cg.course_id)}
                                <li class="text-sm text-gray-600">
                                    <strong>{cg.course_name}:</strong>
                                    {#if cg.average_grade !== null} <span class="font-semibold text-blue-600">{cg.average_grade}</span> (based on {cg.total_weight_graded * 100}% of coursework)
                                    {:else} <span class="text-gray-400">No graded assignments yet</span> {/if}
                                </li>
                            {/each}
                        </ul>
                        {#if overallAverageGrade !== null}
                            <p class="text-md font-semibold text-gray-700">Overall Average: <span class="text-blue-700">{overallAverageGrade}</span></p>
                        {:else} <p class="text-gray-500">Overall average cannot be calculated yet.</p> {/if}
                    {:else} <p class="text-gray-500">No courses with grade information available.</p> {/if}
                </div>
                <div class="bg-white shadow-md rounded-lg p-6">
                    <h2 class="text-xl font-semibold text-gray-700 mb-4">My Upcoming Assignments</h2>
                    {#if upcomingAssignmentsList.length > 0}
                        <ul class="space-y-3">
                            {#each upcomingAssignmentsList as assignment (assignment.assignment_id)}
                                <li class="border-b border-gray-200 pb-2 last:border-b-0">
                                    <p class="font-medium text-gray-700">{assignment.assignment_name}</p>
                                    <p class="text-sm text-blue-600"><a href={`/private/courses/${assignment.course_id}`} class="hover:underline">{assignment.course_name}</a></p>
                                    <p class="text-xs text-gray-500">Due: {new Date(assignment.due_date).toLocaleDateString('de-DE', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
                                </li>
                            {/each}
                        </ul>
                    {:else} <p class="text-gray-500">No upcoming assignments.</p> {/if}
                </div>
            </div>
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
            {:else} <div class="bg-white shadow-md rounded-lg p-6 text-center mt-8"><p class="text-gray-500">You are not enrolled in any courses.</p></div> {/if}

        {:else if role === 'instructor'}
            {@const instructorCourses = data.courses as InstructorCourseSummary[]}
            {@const upcomingAssignmentsForInstructor = data.upcomingInstructorAssignments as InstructorUpcomingAssignment[] | undefined}
            <div class="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
                <div class="bg-white shadow-xl rounded-xl p-6">
                    <div class="mb-4">
                    <StudentsPerCourseChart courses={instructorCourses} title="Students per My Courses" />
                    </div>
                    <div class="mb-4">
                    <GPAPerCourseChart courses={instructorCourses} title="Avg. GPA per My Courses" />
                    </div>
                </div>
                <div class="bg-white shadow-xl rounded-xl p-6">
                    <h2 class="text-xl font-semibold text-gray-700 mb-3">Upcoming Assignments (My Courses)</h2>
                    {#if upcomingAssignmentsForInstructor && upcomingAssignmentsForInstructor.length > 0}
                        <ul class="space-y-3 max-h-80 overflow-y-auto">
                            {#each upcomingAssignmentsForInstructor as assignment (assignment.unique_key)}
                                <li class="border-b border-gray-200 pb-2 last:border-b-0">
                                    <p class="font-medium text-gray-700">{assignment.assignment_name}</p>
                                    <p class="text-sm text-blue-600">{assignment.course_name}</p>
                                    <p class="text-xs text-gray-500">Due: {new Date(assignment.due_date).toLocaleDateString('de-DE', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
                                </li>
                            {/each}
                        </ul>
                    {:else} <p class="text-gray-500">No upcoming assignments in your courses.</p> {/if}
                </div>
            </div>
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
            {:else} <div class="bg-white shadow-md rounded-lg p-6 text-center"><p class="text-gray-500">You are not teaching any courses.</p></div> {/if}

        {:else if role === 'admin'}
            {@const adminCourses = data.courses as AdminCourseSummary[]}
            <div class="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
                <div class="bg-white shadow-xl rounded-xl p-6">
                    <div class="mb-4">
                    <StudentsPerCourseChart courses={adminCourses} title="Students per Course (All)" />
                    </div>
                    <div class="mb-4">
                    <GPAPerCourseChart courses={adminCourses} title="Avg. GPA per Course (All)" />
                    </div>
                </div>
                <div class="bg-white shadow-xl rounded-xl p-6">
                    <h2 class="text-xl font-semibold text-gray-700 mb-3">All Courses in System</h2>
                    {#if adminCourses && adminCourses.length > 0}
                        <ul class="space-y-3 max-h-96 overflow-y-auto">
                            {#each adminCourses as course (course.course_id)}
                                <li class="border border-gray-200 p-3 rounded-md hover:bg-gray-50">
                                    <a href={`/private/courses/${course.course_id}`} class="text-blue-600 hover:text-blue-800 hover:underline font-medium">
                                        {course.course_name}
                                    </a>
                                    <p class="text-xs text-gray-500">
                                        Format: {course.format}, ECTS: {course.ects}, Instructor: {course.instructor_name || 'N/A'}
                                    </p>
                                    <p class="text-xs text-gray-500">
                                        Students: {course.student_count}, Avg. Grade: {course.average_grade !== null ? course.average_grade.toFixed(2) : 'N/A'}
                                    </p>
                                </li>
                            {/each}
                        </ul>
                    {:else}
                        <p class="text-gray-500">No courses found in the system.</p>
                    {/if}
                </div>
            </div>
            {#if adminCourses && adminCourses.length === 0}
                <div class="bg-white shadow-md rounded-lg p-6 text-center">
                    <p class="text-gray-500">No courses available in the system.</p>
                </div>
            {/if}
        {:else}
            {#if profile} <div class="bg-white shadow-md rounded-lg p-6 text-center"><p class="text-gray-500">Role specific view not available for '{role}'.</p></div> {/if}
        {/if}
    {:else if user} <div class="bg-white shadow-md rounded-lg p-6 text-center"><p class="text-gray-500">Loading profile information...</p></div>
    {:else} <div class="bg-white shadow-md rounded-lg p-6 text-center"><p class="text-gray-500">Redirecting to login...</p></div> {/if}
</div>