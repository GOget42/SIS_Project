<script lang="ts">
    import type { PageData } from './$types';
    // onMount und supabase-Importe für Datenabruf sind nicht mehr nötig hier
    // import { goto } from '$app/navigation'; // goto kann entfernt werden, wenn nicht anderweitig genutzt

    export let data: PageData;

    // Die Daten kommen jetzt direkt von der PageData
    const user = data.user;
    const profile = data.profile;
    const role = data.role;
    const courses = data.courses;

    // Die onMount-Logik wird entfernt, da die Daten vom Server geladen werden.
    // Falls der Benutzer nicht authentifiziert ist oder Daten fehlen,
    // sollte dies idealerweise schon in der load-Funktion des Servers
    // oder durch Layout-Guards behandelt werden.
    // Ein einfacher Check kann hier bleiben, falls gewünscht:
    // if (!user) {
    //     goto('/login');
    // }
</script>

{#if user && profile}
    <h1>
        Welcome,
        {role === 'student' ? 'Student' : role === 'instructor' ? 'Instructor' : 'Admin'}
        {profile.first_name || user.email?.split('@')[0]}!
    </h1>
    <p><strong>Email:</strong> {profile.email || user.email}</p>
    <p><strong>Role:</strong> {role}</p>

    {#if role !== 'admin' && courses && courses.length > 0}
        <h2>{role === 'student' ? 'Enrolled Courses' : 'Teaching Courses'}</h2>
        <ul>
            {#each courses as course (course.course_id)}
                <li>
                    <a href={`/private/courses/${course.course_id}`}>
                        {course.course_name}
                        {#if course.format}- {course.format}{/if}
                        {#if course.ects}({course.ects} ECTS){/if}
                    </a>
                </li>
            {/each}
        </ul>
    {:else if role !== 'admin'}
        <p>No courses to display.</p>
    {/if}
{:else if user}
    <p>Loading profile information...</p>
    <!-- Hier könnte eine spezifischere Meldung stehen, falls profile null ist, aber user existiert -->
{:else}
    <!-- Dieser Fall sollte durch die serverseitige Weiterleitung eigentlich nicht eintreten,
         aber als Fallback oder während des Ladens der Initialdaten. -->
    <p>Redirecting to login...</p>
{/if}