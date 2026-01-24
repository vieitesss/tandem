const buildConfigResponse = (payload, status = 200) =>
  new Response(JSON.stringify(payload), {
    status,
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "no-store",
    },
  });

export const GET = () => {
  const supabaseUrl =
    process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey =
    process.env.SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    return buildConfigResponse(
      { error: "Supabase env vars are not set." },
      500
    );
  }

  return buildConfigResponse({
    supabase_url: supabaseUrl,
    supabase_anon_key: supabaseAnonKey,
  });
};

export const dynamic = "force-dynamic";
