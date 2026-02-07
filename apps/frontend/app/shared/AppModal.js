"use client";

import { createPortal } from "react-dom";
import { useEffect, useId, useRef, useState } from "react";

export default function AppModal({
  open,
  onClose,
  title,
  subtitle,
  children,
  maxWidth = "max-w-lg",
}) {
  const [mounted, setMounted] = useState(false);
  const dialogRef = useRef(null);
  const previousFocusRef = useRef(null);
  const onCloseRef = useRef(onClose);
  const titleId = useId();
  const subtitleId = useId();

  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    if (!open) {
      return;
    }

    previousFocusRef.current = document.activeElement;

    const focusDialog = () => {
      dialogRef.current?.focus();
    };

    window.setTimeout(focusDialog, 0);

    const getFocusableElements = () => {
      if (!dialogRef.current) {
        return [];
      }

      return Array.from(
        dialogRef.current.querySelectorAll(
          'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])'
        )
      );
    };

    const handleEscape = (event) => {
      if (event.key === "Escape") {
        onCloseRef.current?.();
        return;
      }

      if (event.key !== "Tab") {
        return;
      }

      const focusableElements = getFocusableElements();
      if (focusableElements.length === 0) {
        event.preventDefault();
        dialogRef.current?.focus();
        return;
      }

      const firstElement = focusableElements[0];
      const lastElement = focusableElements[focusableElements.length - 1];
      const activeElement = document.activeElement;

      if (event.shiftKey && activeElement === firstElement) {
        event.preventDefault();
        lastElement.focus();
      } else if (!event.shiftKey && activeElement === lastElement) {
        event.preventDefault();
        firstElement.focus();
      }
    };

    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", handleEscape);

    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", handleEscape);
      if (previousFocusRef.current && typeof previousFocusRef.current.focus === "function") {
        previousFocusRef.current.focus();
      }
    };
  }, [open]);

  if (!mounted || !open) {
    return null;
  }

  return createPortal(
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-cream-50/50 p-4 animate-fade-in" onClick={onClose}>
      <div
        ref={dialogRef}
        className={`animate-scale-in w-full ${maxWidth} rounded-3xl border border-obsidian-600/90 bg-obsidian-800 p-6 text-cream-50`}
        onClick={(event) => event.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? titleId : undefined}
        aria-describedby={subtitle ? subtitleId : undefined}
        aria-label={title ? undefined : "Dialog"}
        tabIndex={-1}
      >
        {title ? (
          <div className="mb-4 space-y-1">
            <h3 id={titleId} className="text-xl font-display font-semibold tracking-tight">{title}</h3>
            {subtitle ? <p id={subtitleId} className="text-xs font-medium text-cream-100/60">{subtitle}</p> : null}
          </div>
        ) : null}
        {children}
      </div>
    </div>,
    document.body
  );
}
