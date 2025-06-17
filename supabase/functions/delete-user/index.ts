// supabase/functions/delete-user/index.ts
import { serve } from 'https://deno.land/std@0.170.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js';

// 🧩 Environment Variables
const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

const corsHeaders = {
	'Access-Control-Allow-Origin': '*',
	'Access-Control-Allow-Methods': 'POST, OPTIONS', // POST is common for deletions when the body contains user_id
	'Access-Control-Allow-Headers': 'Content-Type, Authorization'
};

const jsonResponseHeaders = {
	...corsHeaders,
	'Content-Type': 'application/json'
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
		// User ID should be provided in the POST body
		if (req.method !== 'POST') {
			return new Response(
				JSON.stringify({ error: 'Method not allowed, please use POST with user_id in body' }),
				{
					status: 405,
					headers: jsonResponseHeaders
				}
			);
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
			// Possible errors: user not found (may be considered a success if idempotency is desired)
			// or other server-side issues.
			if (deleteAuthUserError.message.includes('User not found')) {
				return new Response(JSON.stringify({ message: 'User not found or already deleted' }), {
					status: 200, // Or 404 depending on the desired semantics
					headers: jsonResponseHeaders
				});
			}
			return new Response(
				JSON.stringify({ error: `Failed to delete user: ${deleteAuthUserError.message}` }),
				{
					status: 500, // Or a more specific status code based on the error
					headers: jsonResponseHeaders
				}
			);
		}

		// Note: Related profile entries (students, instructors, admins) are not explicitly deleted here.
		// This should be handled via DB triggers (ON DELETE CASCADE) or separate logic.

		return new Response(
			JSON.stringify({ message: 'User deleted successfully from authentication system' }),
			{
				status: 200,
				headers: jsonResponseHeaders
			}
		);
	} catch (err) {
		// Catch JSON parsing errors or other unexpected issues
		if (err instanceof SyntaxError) {
			console.error('JSON Parsing Error:', err.message);
			return new Response(JSON.stringify({ error: 'Invalid JSON in request body' }), {
				status: 400,
				headers: jsonResponseHeaders
			});
		}
		console.error('Unexpected Error in delete-user:', err.message, err.stack);
		return new Response(JSON.stringify({ error: 'Unexpected error occurred' }), {
			status: 500,
			headers: jsonResponseHeaders
		});
	}
});
