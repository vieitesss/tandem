const buildTargetUrl = (requestUrl, pathSegments, apiBaseUrl) => {
  const targetPath = pathSegments.length ? `/${pathSegments.join("/")}` : "/";
  const url = new URL(requestUrl);
  const targetUrl = new URL(targetPath, apiBaseUrl);
  targetUrl.search = url.search;
  return targetUrl;
};

const buildForwardHeaders = (requestHeaders) => {
  const headers = new Headers(requestHeaders);
  headers.delete("host");
  headers.delete("content-length");
  return headers;
};

const handler = async (request, context) => {
  const apiBaseUrl = process.env.API_BASE_URL;

  if (!apiBaseUrl) {
    return new Response(
      JSON.stringify({ error: "API_BASE_URL is not set." }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }

  const params = context?.params ? await context.params : null;
  const pathSegments = Array.isArray(params?.path) ? params.path : [];
  const targetUrl = buildTargetUrl(request.url, pathSegments, apiBaseUrl);
  const headers = buildForwardHeaders(request.headers);
  const method = request.method;
  const body = ["GET", "HEAD"].includes(method) ? undefined : request.body;

  const response = await fetch(targetUrl, {
    method,
    headers,
    body,
    redirect: "manual",
  });

  return new Response(response.body, {
    status: response.status,
    headers: response.headers,
  });
};

export const GET = handler;
export const POST = handler;
export const PUT = handler;
export const PATCH = handler;
export const DELETE = handler;
export const OPTIONS = handler;
export const dynamic = "force-dynamic";
