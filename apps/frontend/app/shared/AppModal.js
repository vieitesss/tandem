"use client";

import { createPortal } from "react-dom";
import { useEffect, useState } from "react";

export default function AppModal({
  open,
  onClose,
  title,
  subtitle,
  children,
  maxWidth = "max-w-lg",
}) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  useEffect(() => {
    if (!open) {
      return;
    }

    const handleEscape = (event) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", handleEscape);

    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", handleEscape);
    };
  }, [open, onClose]);

  if (!mounted || !open) {
    return null;
  }

  return createPortal(
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-cream-50/50 p-4 animate-fade-in" onClick={onClose}>
      <div
        className={`animate-scale-in w-full ${maxWidth} rounded-3xl border border-obsidian-600/90 bg-obsidian-800 p-6 text-cream-50`}
        onClick={(event) => event.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label={title}
      >
        {title ? (
          <div className="mb-4 space-y-1">
            <h3 className="text-xl font-display font-semibold tracking-tight">{title}</h3>
            {subtitle ? <p className="text-xs font-medium text-cream-100/60">{subtitle}</p> : null}
          </div>
        ) : null}
        {children}
      </div>
    </div>,
    document.body
  );
}
