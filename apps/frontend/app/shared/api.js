export const API_BASE_PATH = "/api";

const toApiUrl = (path) => {
  if (typeof path !== "string") {
    return API_BASE_PATH;
  }

  if (path.startsWith("http://") || path.startsWith("https://")) {
    return path;
  }

  if (path.startsWith(API_BASE_PATH)) {
    return path;
  }

  return path.startsWith("/") ? `${API_BASE_PATH}${path}` : `${API_BASE_PATH}/${path}`;
};

const parseResponseJson = async (response) => {
  try {
    return await response.json();
  } catch {
    return null;
  }
};

const getErrorMessage = (data, fallbackMessage) => {
  if (data && typeof data.error === "string" && data.error.length > 0) {
    return data.error;
  }

  return fallbackMessage;
};

export const fetchJson = async (url, options) => {
  const response = await fetch(url, options);
  const data = await parseResponseJson(response);
  return { response, data };
};

export const apiRequest = async (
  path,
  { method = "GET", body, headers, ...options } = {},
  fallbackMessage = "Request failed."
) => {
  const requestHeaders = new Headers(headers || {});
  const shouldSerializeBody = body !== undefined && !(body instanceof FormData);

  if (shouldSerializeBody && !requestHeaders.has("Content-Type")) {
    requestHeaders.set("Content-Type", "application/json");
  }

  const response = await fetch(toApiUrl(path), {
    method,
    headers: requestHeaders,
    body: body === undefined ? undefined : shouldSerializeBody ? JSON.stringify(body) : body,
    ...options,
  });

  const data = await parseResponseJson(response);

  if (!response.ok) {
    throw new Error(getErrorMessage(data, fallbackMessage));
  }

  return data;
};

export const apiGet = (path, fallbackMessage) => {
  return apiRequest(path, { method: "GET" }, fallbackMessage || "Request failed.");
};

export const apiPost = (path, body, fallbackMessage) => {
  return apiRequest(path, { method: "POST", body }, fallbackMessage || "Request failed.");
};

export const apiPatch = (path, body, fallbackMessage) => {
  return apiRequest(path, { method: "PATCH", body }, fallbackMessage || "Request failed.");
};

export const apiDelete = (path, fallbackMessage) => {
  return apiRequest(path, { method: "DELETE" }, fallbackMessage || "Request failed.");
};
