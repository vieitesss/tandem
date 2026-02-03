const STORAGE_KEY = "transactions:last_updated";
const STORAGE_MONTH_KEY = "transactions:last_updated_month";
const CHANNEL_KEY = "transactions:updates";

let cachedPayload = null;
let channel = null;

const tabId =
  typeof window !== "undefined"
    ? window.crypto?.randomUUID?.() || String(Math.random())
    : "server";

const normalizeTimestamp = (value) => {
  const parsed = Number(value);
  return Number.isNaN(parsed) ? 0 : parsed;
};

const getChannel = () => {
  if (typeof BroadcastChannel === "undefined") {
    return null;
  }

  if (!channel) {
    channel = new BroadcastChannel(CHANNEL_KEY);
  }

  return channel;
};

const setLastUpdatedAt = (timestamp, month) => {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(STORAGE_KEY, String(timestamp));
  if (typeof month === "string") {
    window.localStorage.setItem(STORAGE_MONTH_KEY, month);
  }
  const activeChannel = getChannel();
  if (activeChannel) {
    activeChannel.postMessage({
      type: "transactions-updated",
      timestamp,
      source_id: tabId,
      month: typeof month === "string" ? month : undefined,
    });
  }
};

export const getCache = () => cachedPayload;

export const getLastUpdatedAt = () => {
  if (typeof window === "undefined") {
    return 0;
  }

  return normalizeTimestamp(window.localStorage.getItem(STORAGE_KEY));
};

export const getLastUpdatedMonth = () => {
  if (typeof window === "undefined") {
    return "";
  }

  return window.localStorage.getItem(STORAGE_MONTH_KEY) || "";
};

export const setCache = (payload) => {
  cachedPayload = payload ? { ...payload } : null;
};

export const notifyTransactionsUpdated = ({ month = "" } = {}) => {
  setLastUpdatedAt(Date.now(), month);
};

export const subscribeToTransactionsUpdates = (handler) => {
  if (typeof window === "undefined") {
    return () => {};
  }

  const activeChannel = getChannel();
  if (activeChannel) {
    const listener = (event) => {
      const data = event?.data;
      if (data?.source_id && data.source_id === tabId) {
        return;
      }
      handler(data);
    };
    activeChannel.addEventListener("message", listener);
    return () => activeChannel.removeEventListener("message", listener);
  }

  const storageListener = (event) => {
    if (event.key !== STORAGE_KEY) {
      return;
    }

    handler({
      type: "transactions-updated",
      timestamp: normalizeTimestamp(event.newValue),
      month:
        typeof window !== "undefined"
          ? window.localStorage.getItem(STORAGE_MONTH_KEY) || ""
          : "",
    });
  };

  window.addEventListener("storage", storageListener);
  return () => window.removeEventListener("storage", storageListener);
};

export const clearCache = () => {
  cachedPayload = null;
};
