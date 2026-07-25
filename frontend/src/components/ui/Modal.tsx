"use client";

import { useEffect, useRef, useCallback } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";
import clsx from "clsx";

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
}

const FOCUSABLE =
  'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

export default function Modal({ isOpen, onClose, title, children }: ModalProps) {
  const overlayRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);

  const trapFocus = useCallback((e: KeyboardEvent) => {
    if (e.key !== "Tab" || !contentRef.current) return;
    const focusable = contentRef.current.querySelectorAll<HTMLElement>(FOCUSABLE);
    if (focusable.length === 0) return;

    const first = focusable[0];
    const last = focusable[focusable.length - 1];

    if (e.shiftKey) {
      if (document.activeElement === first) {
        e.preventDefault();
        last.focus();
      }
    } else {
      if (document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }
  }, []);

  useEffect(() => {
    if (!isOpen) return;

    previousFocusRef.current = document.activeElement as HTMLElement;

    const timer = requestAnimationFrame(() => {
      if (contentRef.current) {
        const firstFocusable = contentRef.current.querySelector<HTMLElement>(FOCUSABLE);
        firstFocusable?.focus();
      }
    });

    document.addEventListener("keydown", trapFocus);

    return () => {
      cancelAnimationFrame(timer);
      document.removeEventListener("keydown", trapFocus);
      previousFocusRef.current?.focus();
    };
  }, [isOpen, trapFocus]);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };

    if (isOpen) {
      document.addEventListener("keydown", handleEscape);
      document.body.style.overflow = "hidden";
    }

    return () => {
      document.removeEventListener("keydown", handleEscape);
      document.body.style.overflow = "";
    };
  }, [isOpen, onClose]);

  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === overlayRef.current) onClose();
  };

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <motion.div
          ref={overlayRef}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          onClick={handleOverlayClick}
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
        >
          <motion.div
            ref={contentRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby={title ? "modal-title" : undefined}
            initial={{ opacity: 0, scale: 0.95, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 8 }}
            transition={{ duration: 0.2 }}
            className={clsx(
              "relative w-full max-w-lg rounded-2xl border border-liner bg-card p-6 shadow-2xl",
              "max-h-[85vh] overflow-y-auto"
            )}
          >
            {title && (
              <div className="flex items-center justify-between mb-4">
                <h2 id="modal-title" className="font-display text-lg font-bold text-text">
                  {title}
                </h2>
                <button
                  onClick={onClose}
                  className="rounded-lg p-1.5 text-muted hover:text-text hover:bg-card-2 transition-colors"
                  aria-label="Close modal"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            )}

            {!title && (
              <button
                onClick={onClose}
                className="absolute right-4 top-4 rounded-lg p-1.5 text-muted hover:text-text hover:bg-card-2 transition-colors"
                aria-label="Close modal"
              >
                <X className="h-4 w-4" />
              </button>
            )}

            {children}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  );
}
