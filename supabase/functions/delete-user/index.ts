// supabase/functions/delete-user/index.ts
import { serve } from "https://deno.land/std@0.170.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js';

// 🧩 Environment Variables
const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

const corsHeaders = {
	'Access-Control-Allow-Origin': '*',
	'Access-Control-Allow-Methods': 'POST, OPTIONS', // POST für Löschen ist üblich, wenn body user_id enthält
	'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

const jsonResponseHeaders = {
	...corsHeaders,
	'Content-Type': 'application/json',
};

serve(async (req: Request) => {
	if (req.method === 'OPTIONS') {
		return new Response('ok', { headers: corsHeaders });
	}

	const authHeader = req.headers.get('Authorization');
	if (!authHeader) {
		return new Response(JSON.stringify({ error: 'Missing Authorization header' }), {
			status: 401,
			headers: jsonResponseHeaders
		});
	}

	const jwt = authHeader.replace('Bearer ', '');
	const { data: userInfo, error: userError } = await supabase.auth.getUser(jwt);

	if (userError || !userInfo.user) {
		console.error('JWT Validation Error:', userError?.message);
		return new Response(JSON.stringify({ error: 'Invalid or expired token' }), {
			status: 401,
			headers: jsonResponseHeaders
		});
	}

	if (userInfo.user.user_metadata?.role !== 'admin') {
		return new Response(JSON.stringify({ error: 'Forbidden: Only admins can delete users' }), {
			status: 403,
			headers: jsonResponseHeaders
		});
	}

	try {
		// User ID sollte im Body der POST-Anfrage sein
		if (req.method !== 'POST') {
			return new Response(JSON.stringify({ error: 'Method not allowed, please use POST with user_id in body' }), {
				status: 405,
				headers: jsonResponseHeaders
			});
		}

		const { user_id } = await req.json();

		if (!user_id) {
			return new Response(JSON.stringify({ error: 'Missing user_id in request body' }), {
				status: 400,
				headers: jsonResponseHeaders
			});
		}

		console.log('Attempting to delete auth user:', user_id);

		const { error: deleteAuthUserError } = await supabase.auth.admin.deleteUser(user_id);

		if (deleteAuthUserError) {
			console.error('Failed to delete auth user:', deleteAuthUserError.message);
			// Mögliche Fehler: Benutzer nicht gefunden (kann als Erfolg gewertet werden, wenn idempotent gewünscht)
			// oder andere serverseitige Probleme.
			if (deleteAuthUserError.message.includes('User not found')) {
				return new Response(JSON.stringify({ message: 'User not found or already deleted' }), {
					status: 200, // Oder 404, je nach gewünschter Semantik
					headers: jsonResponseHeaders,
				});
			}
			return new Response(JSON.stringify({ error: `Failed to delete user: ${deleteAuthUserError.message}` }), {
				status: 500, // Oder spezifischerer Statuscode basierend auf dem Fehler
				headers: jsonResponseHeaders,
			});
		}

		// Hinweis: Zugehörige Profileinträge (students, instructors, admins) werden hier nicht explizit gelöscht.
		// Dies sollte über DB-Trigger (ON DELETE CASCADE) oder separate Logik erfolgen.

		return new Response(JSON.stringify({ message: 'User deleted successfully from authentication system' }), {
			status: 200,
			headers: jsonResponseHeaders,
		});

	} catch (err) {
		// Catchen von JSON-Parsing-Fehlern oder anderen unerwarteten Fehlern
		if (err instanceof SyntaxError) {
			console.error('JSON Parsing Error:', err.message);
			return new Response(JSON.stringify({ error: 'Invalid JSON in request body' }), {
				status: 400,
				headers: jsonResponseHeaders,
			});
		}
		console.error('Unexpected Error in delete-user:', err.message, err.stack);
		return new Response(JSON.stringify({ error: 'Unexpected error occurred' }), {
			status: 500,
			headers: jsonResponseHeaders,
		});
	}
});