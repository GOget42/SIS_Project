<script lang="ts">
  import { enhance } from '$app/forms';
  import { invalidateAll } from '$app/navigation';
  import type { PageData, ActionData } from './$types';

  export let data: PageData;
  export let form: ActionData; // Für Rückmeldungen von Aktionen

  const user = data.user;
  const studentProfile = data.studentProfile; // Kann { student_id: string } oder null sein
  // enrolledCourseIds wird direkt aus data.enrolledCourseIds im Template verwendet

  let creatingCourse = false;
  let newCourse = { course_name: '', ects: '', hours: '', format: '', instructor_id: '' };

  // $: console.log(form); // Zum Debuggen
  // Reaktivität für Formularantworten, um UI zu aktualisieren oder Nachrichten anzuzeigen
  // $: if (form?.success) {
  //   if (form.message) alert(form.message);
  //   if (creatingCourse && form.action === '?/createCourse') {
  //       creatingCourse = false;
  //       newCourse = { course_name: '', ects: '', hours: '', format: '', instructor_id: '' };
  //   }
  //   invalidateAll(); // Daten neu laden, um Änderungen anzuzeigen
  // } else if (form?.error) {
  //   alert(`Error: ${form.error}`);
  // }

</script>

<h1>Courses</h1>

{#if user?.user_metadata?.role === 'admin' || user?.user_metadata?.role === 'instructor'}
  <button on:click={() => creatingCourse = true}>➕ Add Course</button>
{/if}

{#if creatingCourse}
  <form
    method="POST"
    action="?/createCourse"
    use:enhance={() => {
      return async ({ result }) => {
        await invalidateAll(); // Wichtig, um die Kursliste zu aktualisieren
        if (result.type === 'success' && result.data?.message) {
          alert(result.data.message);
          creatingCourse = false;
          newCourse = { course_name: '', ects: '', hours: '', format: '', instructor_id: '' };
        } else if (result.type === 'failure' && result.data?.error) {
          alert(`Error: ${result.data.error}`);
        }
      };
    }}
  >
    <div>
      <input name="course_name" bind:value={newCourse.course_name} placeholder="Course Name" required />
      <input name="ects" type="number" bind:value={newCourse.ects} placeholder="ECTS" required />
      <input name="hours" type="number" bind:value={newCourse.hours} placeholder="Hours" required />
      <input name="format" bind:value={newCourse.format} placeholder="Format" required />
      <select name="instructor_id" bind:value={newCourse.instructor_id} required>
        <option value="" disabled>Select Instructor</option>
        {#each data.instructors as instructor (instructor.instructor_id)}
          <option value={instructor.instructor_id}>{instructor.first_name} {instructor.last_name}</option>
        {/each}
      </select>
      <button type="submit">💾 Save Course</button>
      <button type="button" on:click={() => creatingCourse = false}>✖️ Cancel</button>
    </div>
  </form>
{/if}

{#if data.courses && data.courses.length > 0}
  <ul>
    {#each data.courses as course (course.course_id)}
      <li>
        <a href={`/private/courses/${course.course_id}`}>
          {course.course_name} - {course.format} ({course.ects} ECTS)
          {#if course.instructors}- taught by {course.instructors.first_name} {course.instructors.last_name}{/if}
        </a>
        {#if user?.user_metadata?.role === 'student' && studentProfile}
          {#if data.enrolledCourseIds.includes(course.course_id)}
            <form
              method="POST"
              action="?/disenrollStudent"
              use:enhance={() => {
                return async ({ result }) => {
                  await invalidateAll(); // Kursliste und Einschreibestatus aktualisieren
                  if (result.type === 'success' && result.data?.message) alert(result.data.message);
                  else if (result.type === 'failure' && result.data?.error) alert(`Error: ${result.data.error}`);
                };
              }}
              style="display: inline;"
            >
              <input type="hidden" name="course_id" value={course.course_id} />
              <input type="hidden" name="student_id" value={studentProfile.student_id} />
              <button type="submit">Disenroll</button>
              <span>✅ Enrolled</span>
            </form>
          {:else}
            <form
              method="POST"
              action="?/enrollStudent"
              use:enhance={() => {
                return async ({ result }) => {
                  await invalidateAll();
                  if (result.type === 'success' && result.data?.message) alert(result.data.message);
                  else if (result.type === 'failure' && result.data?.error) alert(`Error: ${result.data.error}`);
                };
              }}
              style="display: inline;"
            >
              <input type="hidden" name="course_id" value={course.course_id} />
              <input type="hidden" name="student_id" value={studentProfile.student_id} />
              <button type="submit">Enroll</button>
            </form>
          {/if}
        {/if}
      </li>
    {/each}
  </ul>
{:else}
  <p>No courses available at the moment.</p>
{/if}