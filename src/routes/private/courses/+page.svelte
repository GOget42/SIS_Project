<script lang="ts">
	import { enhance } from '$app/forms';
	import { invalidateAll, goto } from '$app/navigation';
	import { page } from '$app/stores';
	import type { PageData, ActionData } from './$types';

	export let data: PageData;
	export let form: ActionData;

	const user = data.user;
	const studentProfile = data.studentProfile;
	const role = user?.user_metadata?.role;

	let creatingCourse = false;
	let newCourse = {
		course_name: '',
		ects: '' as number | string,
		hours: '' as number | string,
		format: '',
		instructor_id: ''
	};

	// Aktuelle Sortierparameter aus data übernehmen
	let currentSortBy: string;
	let currentSortOrder: 'asc' | 'desc';

	$: {
		currentSortBy = data.sortBy;
		currentSortOrder = data.sortOrder;
	}

	$: if (form?.message && form.action === '?/createCourse') {
		if (form.success) {
			creatingCourse = false;
			newCourse = { course_name: '', ects: '', hours: '', format: '', instructor_id: '' };
		}
	}

	function applySort(column: string) {
		let newSortOrder: 'asc' | 'desc' = 'asc';
		if (column === currentSortBy) {
			newSortOrder = currentSortOrder === 'asc' ? 'desc' : 'asc';
		}
		const newSearchParams = new URLSearchParams($page.url.searchParams);
		newSearchParams.set('sort_by', column);
		newSearchParams.set('sort_order', newSortOrder);
		goto(`${$page.url.pathname}?${newSearchParams.toString()}`, {
			keepFocus: true,
			invalidateAll: true
		});
	}

	function getSortIndicator(column: string): string {
		if (column === currentSortBy) {
			return currentSortOrder === 'asc' ? '↑' : '↓';
		}
		return '';
	}

	function getSortLink(column: string): string {
		const newSearchParams = new URLSearchParams($page.url.searchParams);
		let newSortOrder: 'asc' | 'desc' = 'asc';
		if (column === currentSortBy) {
			newSortOrder = currentSortOrder === 'asc' ? 'desc' : 'asc';
		}
		newSearchParams.set('sort_by', column);
		newSearchParams.set('sort_order', newSortOrder);
		return `${$page.url.pathname}?${newSearchParams.toString()}`;
	}
</script>

<div class="container mx-auto p-4 sm:p-6 lg:p-8">
	<div class="mb-8 flex items-center justify-between">
		<h1 class="text-3xl font-bold text-gray-800">Courses</h1>
		{#if role === 'admin'}
			<button
				on:click={() => (creatingCourse = true)}
				class="flex items-center space-x-2 rounded-md bg-blue-600 px-4 py-2 font-bold text-white shadow-md transition duration-150 ease-in-out hover:bg-blue-700"
			>
				<svg
					xmlns="http://www.w3.org/2000/svg"
					viewBox="0 0 20 20"
					fill="currentColor"
					class="h-5 w-5"
					><path
						d="M10.75 4.75a.75.75 0 00-1.5 0v4.5h-4.5a.75.75 0 000 1.5h4.5v4.5a.75.75 0 001.5 0v-4.5h4.5a.75.75 0 000-1.5h-4.5v-4.5z"
					/></svg
				>
				<span>Add Course</span>
			</button>
		{/if}
	</div>

	{#if creatingCourse && role === 'admin'}
		<div class="mb-8 rounded-xl bg-white p-6 shadow-xl">
			<h2 class="mb-6 text-2xl font-semibold text-gray-700">Create New Course</h2>
			<form
				method="POST"
				action="?/createCourse"
				use:enhance={() => {
					return async ({ result }) => {
						await invalidateAll();
						if (result.type === 'success' && result.data?.success) {
							creatingCourse = false;
							newCourse = { course_name: '', ects: '', hours: '', format: '', instructor_id: '' };
						}
					};
				}}
				class="space-y-6"
			>
				<div>
					<label for="course_name" class="mb-1 block text-sm font-medium text-gray-700"
						>Course Name</label
					>
					<input
						id="course_name"
						name="course_name"
						bind:value={newCourse.course_name}
						placeholder="e.g., Introduction to Programming"
						required
						class="mt-1 block w-full rounded-md border border-gray-300 px-4 py-2 shadow-sm focus:border-blue-500 focus:ring-blue-500 focus:outline-none sm:text-sm"
					/>
				</div>
				<div class="grid grid-cols-1 gap-6 md:grid-cols-2">
					<div>
						<label for="ects" class="mb-1 block text-sm font-medium text-gray-700"
							>ECTS Credits</label
						>
						<input
							id="ects"
							name="ects"
							type="number"
							bind:value={newCourse.ects}
							placeholder="e.g., 5"
							required
							class="mt-1 block w-full rounded-md border border-gray-300 px-4 py-2 shadow-sm focus:border-blue-500 focus:ring-blue-500 focus:outline-none sm:text-sm"
						/>
					</div>
					<div>
						<label for="hours" class="mb-1 block text-sm font-medium text-gray-700"
							>Contact Hours</label
						>
						<input
							id="hours"
							name="hours"
							type="number"
							bind:value={newCourse.hours}
							placeholder="e.g., 45"
							required
							class="mt-1 block w-full rounded-md border border-gray-300 px-4 py-2 shadow-sm focus:border-blue-500 focus:ring-blue-500 focus:outline-none sm:text-sm"
						/>
					</div>
				</div>
				<div>
					<label for="format" class="mb-1 block text-sm font-medium text-gray-700">Format</label>
					<input
						id="format"
						name="format"
						bind:value={newCourse.format}
						placeholder="e.g., Lecture, Seminar"
						required
						class="mt-1 block w-full rounded-md border border-gray-300 px-4 py-2 shadow-sm focus:border-blue-500 focus:ring-blue-500 focus:outline-none sm:text-sm"
					/>
				</div>
				<div>
					<label for="instructor_id" class="mb-1 block text-sm font-medium text-gray-700"
						>Instructor</label
					>
					<select
						id="instructor_id"
						name="instructor_id"
						bind:value={newCourse.instructor_id}
						required
						class="mt-1 block w-full rounded-md border-gray-300 py-2 pr-10 pl-3 text-base focus:border-blue-500 focus:ring-blue-500 focus:outline-none sm:text-sm"
					>
						<option value="" disabled>Select an instructor</option>
						{#if data.instructors && data.instructors.length > 0}
							{#each data.instructors as instructor (instructor.instructor_id)}
								<option value={instructor.instructor_id}
									>{instructor.first_name} {instructor.last_name}</option
								>
							{/each}
						{:else}
							<option value="" disabled>No instructors available</option>
						{/if}
					</select>
				</div>
				{#if form?.message && form.action === '?/createCourse'}
					<p
						class:text-red-600={form.error || !form.success}
						class:text-green-600={form.success}
						class="mt-2 text-sm"
					>
						{form.message}
					</p>
				{/if}
				<div class="flex justify-end space-x-3 pt-2">
					<button
						type="button"
						on:click={() => {
							creatingCourse = false;
							newCourse = { course_name: '', ects: '', hours: '', format: '', instructor_id: '' };
						}}
						class="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:outline-none"
					>
						Cancel
					</button>
					<button
						type="submit"
						class="rounded-md border border-transparent bg-green-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-green-700 focus:ring-2 focus:ring-green-500 focus:ring-offset-2 focus:outline-none"
					>
						Save Course
					</button>
				</div>
			</form>
		</div>
	{/if}

	<!-- Sortierleiste -->
	<div class="mb-6 rounded-md bg-gray-100 p-3 shadow">
		<strong class="mr-2 text-gray-700">Sort by:</strong>
		<a
			href={getSortLink('course_name')}
			on:click|preventDefault={() => applySort('course_name')}
			class="rounded-md px-2 py-1 text-blue-600 hover:text-blue-800 hover:underline {currentSortBy ===
			'course_name'
				? 'bg-blue-100 font-semibold'
				: ''}">Name {getSortIndicator('course_name')}</a
		>
		<span class="mx-1 text-gray-400">|</span>
		<a
			href={getSortLink('ects')}
			on:click|preventDefault={() => applySort('ects')}
			class="rounded-md px-2 py-1 text-blue-600 hover:text-blue-800 hover:underline {currentSortBy ===
			'ects'
				? 'bg-blue-100 font-semibold'
				: ''}">ECTS {getSortIndicator('ects')}</a
		>
		<span class="mx-1 text-gray-400">|</span>
		<a
			href={getSortLink('format')}
			on:click|preventDefault={() => applySort('format')}
			class="rounded-md px-2 py-1 text-blue-600 hover:text-blue-800 hover:underline {currentSortBy ===
			'format'
				? 'bg-blue-100 font-semibold'
				: ''}">Format {getSortIndicator('format')}</a
		>
		<span class="mx-1 text-gray-400">|</span>
		<a
			href={getSortLink('instructor')}
			on:click|preventDefault={() => applySort('instructor')}
			class="rounded-md px-2 py-1 text-blue-600 hover:text-blue-800 hover:underline {currentSortBy ===
			'instructor'
				? 'bg-blue-100 font-semibold'
				: ''}">Instructor {getSortIndicator('instructor')}</a
		>
	</div>

	{#if data.courses && data.courses.length > 0}
		<ul class="space-y-4">
			{#each data.courses as course (course.course_id)}
				{@const isEnrolled = data.enrolledCourseIds?.includes(course.course_id)}
				<li
					class="rounded-xl bg-white p-6 shadow-lg transition-shadow duration-200 ease-in-out hover:shadow-2xl"
				>
					<div class="flex flex-col justify-between md:flex-row md:items-center">
						<div class="mb-4 md:mb-0">
							<a
								href={`/private/courses/${course.course_id}`}
								class="text-xl font-semibold text-blue-700 hover:text-blue-800 hover:underline"
							>
								{course.course_name}
							</a>
							<p class="text-sm text-gray-600">
								{course.ects} ECTS | Format: {course.format}
								{#if course.instructors}
									| Instructor: {course.instructors.first_name} {course.instructors.last_name}
								{/if}
								| Status: {course.active === false
									? 'Inactive'
									: course.active === true
										? 'Active'
										: 'Unknown'}
							</p>
						</div>

						<div
							class="flex flex-col items-end space-y-2 md:flex-row md:items-center md:space-y-0 md:space-x-3"
						>
							{#if role === 'student' && studentProfile}
								<form
									method="POST"
									action={isEnrolled ? `?/unenrollStudent` : `?/enrollStudent`}
									use:enhance={(submission) => {
										if (isEnrolled && course.active !== false) {
											const confirmed = window.confirm(
												'Are you sure you want to unenroll? This action will permanently delete all your grades for this course.'
											);
											if (!confirmed) {
												submission.cancel();
											}
										}
										return async ({ result }) => {
											if (result.type === 'success' || result.type === 'redirect') {
												await invalidateAll();
											}
										};
									}}
									class="inline-block"
								>
									<input type="hidden" name="course_id" value={course.course_id} />
									<input type="hidden" name="student_id" value={studentProfile.student_id} />
									<button
										type="submit"
										disabled={isEnrolled && course.active === false}
										class:bg-red-500={isEnrolled}
										class:hover:bg-red-700={isEnrolled}
										class:bg-green-500={!isEnrolled}
										class:hover:bg-green-700={!isEnrolled}
										class:cursor-not-allowed={isEnrolled && course.active === false}
										class:opacity-50={isEnrolled && course.active === false}
										class="rounded-md px-4 py-2 text-sm font-semibold text-white shadow-md transition duration-150 ease-in-out"
									>
										{isEnrolled ? 'Unenroll' : 'Enroll'}
									</button>
								</form>
								{#if isEnrolled && course.active === false}
									<p class="mt-1 text-right text-xs text-gray-500 md:mt-0 md:text-left">
										Cannot unenroll from inactive course.
									</p>
								{/if}
							{/if}
							<a
								href={`/private/courses/${course.course_id}`}
								class="w-full rounded-md bg-gray-200 px-4 py-2 text-center text-sm font-semibold text-gray-700 transition duration-150 ease-in-out hover:bg-gray-300 md:w-auto"
							>
								View Details
							</a>
							{#if role === 'admin'}
								<!-- Admin-specific actions like Edit/Delete could go here -->
							{/if}
						</div>
					</div>
					{#if form?.message && form.relatedCourseId == course.course_id && (form.action === '?/enrollStudent' || form.action === '?/unenrollStudent')}
						<p
							class:text-red-600={form.error || !form.success}
							class:text-green-600={form.success}
							class="mt-2 text-sm"
						>
							{form.message}
						</p>
					{/if}
				</li>
			{/each}
		</ul>
	{:else}
		<div class="mt-8 rounded-lg bg-white p-6 text-center shadow-md">
			<svg
				xmlns="http://www.w3.org/2000/svg"
				fill="none"
				viewBox="0 0 24 24"
				stroke-width="1.5"
				stroke="currentColor"
				class="mx-auto mb-3 h-12 w-12 text-gray-400"
			>
				<path
					stroke-linecap="round"
					stroke-linejoin="round"
					d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z"
				/>
			</svg>
			<p class="text-lg text-gray-500">No courses available at the moment.</p>
			{#if role === 'admin' && !creatingCourse}
				<p class="mt-2 text-sm text-gray-400">
					You can add new courses using the "Add Course" button above.
				</p>
			{/if}
		</div>
	{/if}
</div>
