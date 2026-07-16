"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

const ToastContext = createContext(null);

const defaultDuration = {
  success: 2500,
  error: 4000,
};

export function ToastProvider({ children }) {
  const [toast, setToast] = useState(null);

  const showToast = useCallback((message, options = {}) => {
    if (!message) {
      return;
    }

    const tone = options.tone === "error" ? "error" : "success";
    const duration =
      typeof options.duration === "number"
        ? options.duration
        : defaultDuration[tone];

    setToast({
      id: Date.now(),
      message,
      tone,
      duration,
      action: options.action,
    });
  }, []);

  useEffect(() => {
    if (!toast) {
      return undefined;
    }

    const timeout = setTimeout(() => setToast(null), toast.duration);
    return () => clearTimeout(timeout);
  }, [toast]);

  const value = useMemo(() => ({ showToast }), [showToast]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      {toast ? (
        <div
          className="fixed top-6 left-1/2 z-50 w-[min(100%-2rem,420px)] -translate-x-1/2"
          aria-live="polite"
        >
          <div
            className={`animate-fade-in rounded-2xl border px-4 py-3 text-sm font-semibold text-white shadow-card ${
              toast.tone === "error"
                ? "border-coral-200 bg-coral-300"
                : "border-sage-100 bg-sage-200"
            }`}
            role="status"
          >
            <div className="flex items-center justify-between gap-3">
              <span>{toast.message}</span>
              {toast.action ? (
                <a className="shrink-0 underline underline-offset-4" href={toast.action.href}>
                  {toast.action.label}
                </a>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);

  if (!context) {
    throw new Error("useToast must be used within ToastProvider");
  }

  return context;
}
