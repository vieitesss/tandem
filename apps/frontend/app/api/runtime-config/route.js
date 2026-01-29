const handler = () => {
  const baseUrl =
    process.env.NEXT_PUBLIC_SSE_BASE_URL || process.env.NEXT_PUBLIC_API_BASE_URL || "";

  return new Response(JSON.stringify({ sse_base_url: baseUrl }), {
    status: 200,
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "no-store",
    },
  });
};

export const GET = handler;
export const dynamic = "force-dynamic";
