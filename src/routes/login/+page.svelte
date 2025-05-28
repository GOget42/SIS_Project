<script lang="ts">
  import type { ActionData } from './$types';
  // import { goto } from '$app/navigation'; // Nicht mehr benötigt für die Umleitung nach dem Login
  // import { user } from '$lib/stores/auth'; // Nicht direkt für das Formular benötigt
  // import { supabase } from '$lib/supabaseClient'; // Nicht mehr für den Login-Vorgang hier benötigt

  export let form: ActionData;

  // Die Werte für Email und Passwort werden direkt im Formular gebunden.
  // SvelteKit füllt die Werte bei einem Fehler automatisch wieder aus, wenn sie im fail-Objekt zurückgegeben werden.
  let email = form?.email || ''; // Initialwert aus form.email, falls vorhanden (z.B. bei Fehler)
  let password = ''; // Passwort wird aus Sicherheitsgründen nicht zurückgegeben/vorausgefüllt
</script>

<form class="max-w-md mx-auto mt-10 p-4 border rounded space-y-4" method="POST">
  <input type="email" name="email" placeholder="Email" bind:value={email} class="input w-full" required />
  <input type="password" name="password" placeholder="Password" bind:value={password} class="input w-full" required />
  {#if form?.error}
    <p class="text-red-500">{form.error}</p>
  {/if}
  <button class="btn w-full" type="submit">Login</button>
</form>