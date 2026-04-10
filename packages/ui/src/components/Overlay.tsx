import React, { useEffect, useId, useRef, useState } from 'react';
import '../styles/base.css';

export interface OverlayProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
}

export function Overlay({ open, onClose, title, children }: OverlayProps) {
  const titleId = useId();
  const [visible, setVisible] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const previousFocusRef = useRef<Element | null>(null);

  // Entry animation: set visible on next frame after open
  useEffect(() => {
    if (!open) {
      setVisible(false);
      return;
    }
    const rafId = requestAnimationFrame(() => {
      setVisible(true);
      panelRef.current?.focus();
    });
    return () => cancelAnimationFrame(rafId);
  }, [open]);

  // Escape key handler and focus trap
  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
        return;
      }
      if (e.key === 'Tab') {
        const panel = panelRef.current;
        if (!panel) return;
        const focusableSelector =
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])';
        const focusableEls = Array.from(
          panel.querySelectorAll<HTMLElement>(focusableSelector),
        );
        // Include the panel itself if it has a non-negative tabIndex
        if (panel.tabIndex >= 0) {
          focusableEls.unshift(panel);
        }
        if (focusableEls.length === 0) return;
        const firstEl = focusableEls[0];
        const lastEl = focusableEls[focusableEls.length - 1];
        if (e.shiftKey) {
          if (document.activeElement === firstEl) {
            e.preventDefault();
            lastEl.focus();
          }
        } else {
          if (document.activeElement === lastEl) {
            e.preventDefault();
            firstEl.focus();
          }
        }
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [open, onClose]);

  // Scroll lock (StrictMode-safe)
  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [open]);

  // Focus management: capture on open, restore on close/unmount
  useEffect(() => {
    if (!open) return;
    previousFocusRef.current = document.activeElement;
    return () => {
      const el = previousFocusRef.current;
      if (el && el instanceof HTMLElement) {
        el.focus();
      }
    };
  }, [open]);

  if (!open) return null;

  const backdropClass = `fs-overlay-backdrop${visible ? ' fs-overlay-visible' : ''}`;

  return (
    <div className={backdropClass} onClick={onClose}>
      <div
        ref={panelRef}
        className="fs-overlay-panel"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? titleId : undefined}
        tabIndex={-1}
      >
        <div className="fs-overlay-header">
          {title && (
            <h2 id={titleId} className="fs-overlay-title">
              {title}
            </h2>
          )}
          <button
            className="fs-overlay-close"
            onClick={onClose}
            aria-label="Close"
          >
            {'\u00D7'}
          </button>
        </div>
        <div className="fs-overlay-body">{children}</div>
      </div>
    </div>
  );
}
