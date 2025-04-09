// delete-user
import { serve } from "https://deno.land/std@0.170.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js';

// 🧩 Environment Variables
const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

serve(async (req: Request) => {
	// ✅ Handle CORS Preflight
	if (req.method === 'OPTIONS') {
		return new Response('ok', {
			headers: {
				'Access-Control-Allow-Origin': '*',
				'Access-Control-Allow-Methods': 'POST, OPTIONS',
				'Access-Control-Allow-Headers': 'Content-Type, Authorization',
			},
		});
	}

	// ✅ Check Authorization header
	const authHeader = req.headers.get('Authorization');
	if (!authHeader) {
		return new Response('Missing Authorization header', {
			status: 401,
			headers: { 'Access-Control-Allow-Origin': '*' }
		});
	}

	const jwt = authHeader.replace('Bearer ', '');
	const { data: userInfo, error: userError } = await supabase.auth.getUser(jwt);

	if (userError || !userInfo.user) {
		console.error('JWT Validation Error:', userError?.message);
		return new Response('Invalid or expired token', {
			status: 401,
			headers: { 'Access-Control-Allow-Origin': '*' }
		});
	}

	// ✅ Only allow admins
	if (userInfo.user.user_metadata?.role !== 'admin') {
		return new Response('Forbidden: Only admins can delete users', {
			status: 403,
			headers: { 'Access-Control-Allow-Origin': '*' }
		});
	}

	try {
		const { user_id } = await req.json();

		if (!user_id) {
			return new Response('Missing user_id in request', {
				status: 400,
				headers: { 'Access-Control-Allow-Origin': '*' }
			});
		}

		console.log('Deleting user:', user_id);

		// ✅ Delete user from Auth system
		const { error } = await supabase.auth.admin.deleteUser(user_id);

		if (error) {
			console.error('Failed to delete auth user:', error.message);
			return new Response(JSON.stringify({ error: error.message }), {
				status: 400,
				headers: {
					'Content-Type': 'application/json',
					'Access-Control-Allow-Origin': '*',
				},
			});
		}

		return new Response(JSON.stringify({ message: 'User deleted successfully' }), {
			status: 200,
			headers: {
				'Content-Type': 'application/json',
				'Access-Control-Allow-Origin': '*',
			},
		});

	} catch (err) {
		console.error('Unexpected Error:', err);
		return new Response(JSON.stringify({ error: 'Unexpected error occurred' }), {
			status: 500,
			headers: {
				'Content-Type': 'application/json',
				'Access-Control-Allow-Origin': '*',
			},
		});
	}
});
