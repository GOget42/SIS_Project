<script lang="ts">
  import type { ActionData } from './$types';

  export let form: ActionData;

  let email = form?.email || '';
  let password = ''; // Passwort wird aus Sicherheitsgründen nicht zurückgegeben/vorausgefüllt
</script>

<div class="min-h-screen flex flex-col items-center justify-start pt-10 bg-gray-50 dark:bg-gray-900 px-4">
  <div class="w-full max-w-md">
    <h2 class="text-2xl font-semibold text-center text-gray-800 dark:text-white mb-6">
      Login
    </h2>
    <form
      class="bg-white dark:bg-gray-800 shadow-md rounded-lg p-6 border border-gray-200 dark:border-gray-700 space-y-6"
      method="POST"
    >
      <div>
        <label for="email" class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Email</label>
        <input
          type="email"
          name="email"
          id="email"
          placeholder="you@example.com"
          bind:value={email}
          class="input w-full"
          required
        />
      </div>
      <div>
        <label for="password" class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Passwort</label>
        <input
          type="password"
          name="password"
          id="password"
          placeholder="Passwort"
          bind:value={password}
          class="input w-full"
          required
        />
      </div>

      {#if form?.error}
        <div class="bg-red-100 dark:bg-red-800/30 border-l-4 border-red-500 dark:border-red-600 text-red-700 dark:text-red-300 p-4 rounded-md" role="alert">
          <p class="font-medium">Fehler beim Login</p>
          <p class="text-sm">{form.error}</p>
        </div>
      {/if}

      <button class="btn w-full" type="submit">Login</button>
    </form>
  </div>
</div>