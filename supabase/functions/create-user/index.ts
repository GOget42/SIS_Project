// supabase/functions/create-user/index.ts
import { serve } from "https://deno.land/std@0.170.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js';

// 🧩 Environment Variables
const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
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
    return new Response(JSON.stringify({ error: 'Forbidden: Only admins can create users' }), {
      status: 403,
      headers: jsonResponseHeaders
    });
  }

  try {
    const { email, password, role, first_name = '', last_name = '' } = await req.json();

    if (!email || !password || !role) {
      return new Response(JSON.stringify({ error: 'Missing required fields: email, password, or role' }), {
        status: 400,
        headers: jsonResponseHeaders
      });
    }

    const validRoles = ['student', 'instructor', 'admin'];
    if (!validRoles.includes(role)) {
      return new Response(JSON.stringify({ error: `Invalid role: ${role}. Must be one of ${validRoles.join(', ')}` }), {
        status: 400,
        headers: jsonResponseHeaders
      });
    }

    const { data: createdAuthUser, error: createAuthUserError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true, // oder false, je nach gewünschtem Flow
      user_metadata: { role },
    });

    if (createAuthUserError) {
      console.error('Auth User Creation Error:', createAuthUserError.message);
      return new Response(JSON.stringify({ error: createAuthUserError.message }), {
        status: 400, // Supabase oft 400 für Duplikate etc.
        headers: jsonResponseHeaders,
      });
    }

    const authUserId = createdAuthUser.user.id;
    console.log('Auth user created:', authUserId);

    let profileInsertError;
    const profileData = { first_name, last_name, email, user_id: authUserId };

    if (role === 'student') {
      ({ error: profileInsertError } = await supabase.from('students').insert(profileData));
    } else if (role === 'instructor') {
      ({ error: profileInsertError } = await supabase.from('instructors').insert(profileData));
    } else if (role === 'admin') {
      ({ error: profileInsertError } = await supabase.from('admins').insert(profileData));
    }

    if (profileInsertError) {
      console.error(`Failed to insert into ${role}s table:`, profileInsertError.message);
      console.log(`Attempting to delete orphaned auth user: ${authUserId}`);
      const { error: deleteOrphanError } = await supabase.auth.admin.deleteUser(authUserId);
      if (deleteOrphanError) {
        console.error('CRITICAL: Failed to delete orphaned auth user:', deleteOrphanError.message);
      }
      return new Response(JSON.stringify({ error: `Failed to create ${role} profile: ${profileInsertError.message}` }), {
        status: 500, // Internal server error, as part of the operation failed
        headers: jsonResponseHeaders,
      });
    }

    console.log(`User profile created in ${role}s table for user:`, authUserId);

    // E-Mail-Versand wurde entfernt

    return new Response(JSON.stringify({ user: createdAuthUser.user }), { // Nur das user-Objekt zurückgeben
      status: 200,
      headers: jsonResponseHeaders,
    });

  } catch (err) {
    console.error('Unexpected Error in create-user:', err.message, err.stack);
    return new Response(JSON.stringify({ error: 'Unexpected error occurred' }), {
      status: 500,
      headers: jsonResponseHeaders,
    });
  }
});