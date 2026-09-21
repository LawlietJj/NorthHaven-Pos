import { useEffect, useRef } from "react";

// Shared modal keyboard behavior: Escape closes the modal, and the first
// input/select/textarea inside it (falling back to the first button) is
// focused automatically when it opens. Attach the returned ref to the
// modal's visible content box (not the full-screen overlay).
//
// `enabled` lets a modal that's rendered inline and conditionally shown
// (rather than mounted/unmounted as its own component) opt in only while
// it's actually visible — the hook itself must still be called
// unconditionally, per the rules of hooks.
export function useModalKeyboard(onClose, enabled = true) {
  const containerRef = useRef(null);
  const onCloseRef = useRef(onClose);

  // Keep the ref in sync after every render — never mutate a ref during
  // render itself, only in an effect.
  useEffect(() => {
    onCloseRef.current = onClose;
  });

  useEffect(() => {
    if (!enabled) return;

    const focusable =
      containerRef.current?.querySelector("input, select, textarea") ||
      containerRef.current?.querySelector("button:not([disabled])");
    focusable?.focus();

    function handleKeyDown(e) {
      if (e.key === "Escape") onCloseRef.current();
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [enabled]);

  return containerRef;
}
