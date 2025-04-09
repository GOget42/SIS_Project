<!-- src/routes/private/home/+page.svelte -->
<script>
    import { onMount } from 'svelte';
    export let data;
    import { supabase } from '$lib/supabaseClient';
    import { goto } from '$app/navigation';

    let user = data.user;
    let profile = null;
    let role = '';
    let courses = [];

    onMount(async () => {
        if (!user) {
            console.error('User not found!');
            goto('/login');
            return;
        }

        const userRole = user.user_metadata?.role;

        if (userRole === 'student') {
            let { data: student } = await supabase
              .from('students')
              .select('*')
              .eq('user_id', user.id)
              .single();

            if (student) {
                profile = student;
                role = 'student';

                const { data: enrolled } = await supabase
                  .from('enrollments')
                  .select('courses(course_name, course_id)')
                  .eq('student_id', student.id);

                courses = enrolled.map(e => e.courses);
            }
        } else if (userRole === 'instructor') {
            let { data: instructor } = await supabase
              .from('instructors')
              .select('*')
              .eq('user_id', user.id)
              .single();

            if (instructor) {
                profile = instructor;
                role = 'instructor';

                const { data: owned } = await supabase
                  .from('courses')
                  .select('*')
                  .eq('instructor_id', instructor.id);

                courses = owned;
            }
        } else if (userRole === 'admin') {
            profile = {
                name: user.email.split('@')[0],
                email: user.email
            };
            role = 'admin';
        }
    });
</script>

{#if profile}
    <h1>Welcome, {role === 'student' ? 'Student' : role === 'instructor' ? 'Instructor' : 'Admin'} {profile.name || profile.first_name}!</h1>
    <p><strong>Email:</strong> {profile.email}</p>
    <p><strong>Role:</strong> {role}</p>

    {#if role !== 'admin'}
        <h2>{role === 'student' ? 'Enrolled Courses' : 'Teaching Courses'}</h2>
        <ul>
            {#each courses as course}
                <li>
                    {#if role === 'instructor'}
                        <a href={`/courses/${course.course_id}`}>{course.course_name}</a>
                    {:else}
                        {course.course_name}
                    {/if}
                </li>
            {/each}
        </ul>
    {/if}
{/if}
