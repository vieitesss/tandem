import { createClient } from "@supabase/supabase-js";

const buildTimeConfig = {
  url: process.env.NEXT_PUBLIC_SUPABASE_URL,
  anonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
};

let supabaseClient = null;
let supabasePromise = null;

const fetchRuntimeConfig = async () => {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    const response = await fetch("/api/config", { cache: "no-store" });

    if (!response.ok) {
      return null;
    }

    const data = await response.json();
    const supabaseUrl = data?.supabase_url;
    const supabaseAnonKey = data?.supabase_anon_key;

    if (!supabaseUrl || !supabaseAnonKey) {
      return null;
    }

    return { url: supabaseUrl, anonKey: supabaseAnonKey };
  } catch (error) {
    return null;
  }
};

const resolveConfig = async () => {
  if (buildTimeConfig.url && buildTimeConfig.anonKey) {
    return buildTimeConfig;
  }

  return fetchRuntimeConfig();
};

export const getSupabaseClient = async () => {
  if (supabasePromise) {
    return supabasePromise;
  }

  supabasePromise = resolveConfig().then((config) => {
    if (!config) {
      supabaseClient = null;
      return null;
    }

    supabaseClient = createClient(config.url, config.anonKey);
    return supabaseClient;
  });

  return supabasePromise;
};
