/* eslint-disable react-refresh/only-export-components */
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { ArrowLeft, ArrowRight, X } from "lucide-react";

const PAD = 8; // spotlight padding around the target
const GAP = 14; // gap between spotlight and card
const CARD_W = 360;
const clamp = (n, lo, hi) => Math.max(lo, Math.min(n, hi));

const KEY = (k) => `cbx_tour_${k}`;
export const tourSeen = (k) => {
  try { return localStorage.getItem(KEY(k)) === "1"; } catch { return true; }
};
export const markTourSeen = (k) => {
  try { localStorage.setItem(KEY(k), "1"); } catch { /* ignore */ }
};

// Re-measures the target every frame so it follows animations, panel slides and resizes.
function useTargetRect(selector, resetKey) {
  const [rect, setRect] = useState(null);
  useEffect(() => {
    if (!selector) {
      const id = requestAnimationFrame(() => setRect(null));
      return () => cancelAnimationFrame(id);
    }
    let raf;
    let last = "";
    let scrolled = false;
    const measure = () => {
      const el = document.querySelector(selector);
      if (el) {
        if (!scrolled) { el.scrollIntoView?.({ block: "nearest", inline: "nearest" }); scrolled = true; }
        const r = el.getBoundingClientRect();
        const key = `${r.left}|${r.top}|${r.width}|${r.height}`;
        if (key !== last) { last = key; setRect({ x: r.left, y: r.top, w: r.width, h: r.height }); }
      } else if (last !== "none") {
        last = "none";
        setRect(null); // target not on screen: fall back to a centered card
      }
      raf = requestAnimationFrame(measure);
    };
    measure();
    return () => cancelAnimationFrame(raf);
  }, [selector, resetKey]);
  return rect;
}

function TourInner({ steps, onClose }) {
  const [i, setI] = useState(0);
  const [, force] = useState(0);
  const nextRef = useRef(null);
  const step = steps[i];
  const last = i === steps.length - 1;
  const rect = useTargetRect(step.target, i);

  useEffect(() => {
    step.onEnter?.();
    nextRef.current?.focus();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [i]);

  useEffect(() => {
    const onResize = () => force((n) => n + 1);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Escape") onClose();
      else if (e.key === "ArrowRight") last ? onClose() : setI((n) => n + 1);
      else if (e.key === "ArrowLeft") setI((n) => Math.max(0, n - 1));
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [last, onClose]);

  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const cw = Math.min(CARD_W, vw - 24);
  let pos = { left: "50%", top: "50%", transform: "translate(-50%, -50%)" };
  if (rect) {
    const place = step.placement ?? "bottom";
    const cx = rect.x + rect.w / 2;
    const cy = rect.y + rect.h / 2;
    if (place === "left") pos = { left: clamp(rect.x - PAD - GAP - cw, 12, vw - cw - 12), top: clamp(cy, 170, vh - 170), transform: "translateY(-50%)" };
    else if (place === "right") pos = { left: clamp(rect.x + rect.w + PAD + GAP, 12, vw - cw - 12), top: clamp(cy, 170, vh - 170), transform: "translateY(-50%)" };
    else if (place === "top") pos = { left: clamp(cx - cw / 2, 12, vw - cw - 12), bottom: Math.max(12, vh - rect.y + PAD + GAP) };
    else pos = { left: clamp(cx - cw / 2, 12, vw - cw - 12), top: Math.min(rect.y + rect.h + PAD + GAP, vh - 240) };
  }

  return (
    <>
      {/* Blocks every click on the app underneath */}
      <div className="fixed inset-0 z-[1000]" aria-hidden="true" />

      {rect ? (
        <div
          aria-hidden="true"
          className="pointer-events-none fixed z-[1001] rounded-xl border-2 border-cyan-400/80 transition-all duration-200 motion-reduce:transition-none"
          style={{
            left: rect.x - PAD,
            top: rect.y - PAD,
            width: rect.w + PAD * 2,
            height: rect.h + PAD * 2,
            boxShadow: "0 0 0 9999px rgba(2, 6, 23, 0.78), 0 0 24px rgba(34, 211, 238, 0.35)",
          }}
        />
      ) : (
        <div aria-hidden="true" className="pointer-events-none fixed inset-0 z-[1001] bg-slate-950/80" />
      )}

      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="tour-title"
        className="fixed z-[1002] rounded-2xl border border-zinc-700 bg-slate-900 p-4 shadow-2xl"
        style={{ width: cw, ...pos }}
      >
        <div className="mb-2 flex items-start justify-between gap-3">
          <h3 id="tour-title" className="text-base font-semibold text-zinc-100">{step.title}</h3>
          <button
            onClick={onClose}
            aria-label="Skip tour"
            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-zinc-400 transition-colors hover:text-red-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>

        <div className="space-y-2.5 text-sm leading-relaxed text-zinc-300">
          {step.body && <p>{step.body}</p>}
          {step.content}
        </div>

        <div className="mt-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex gap-1" aria-hidden="true">
              {steps.map((_, n) => (
                <span key={n} className={`h-1.5 rounded-full transition-all ${n === i ? "w-4 bg-cyan-400" : "w-1.5 bg-zinc-700"}`} />
              ))}
            </div>
            <span className="text-[11px] text-zinc-500">{i + 1}/{steps.length}</span>
          </div>
          <div className="flex flex-col items-end gap-1.5">
            <div className="flex items-center gap-1.5">
            {i > 0 && (
              <button
                onClick={() => setI((n) => n - 1)}
                className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs text-zinc-400 transition-colors hover:text-zinc-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400"
              >
                <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" /> Back
              </button>
            )}
            <button
              ref={nextRef}
              onClick={() => (last ? onClose() : setI((n) => n + 1))}
              className="inline-flex items-center gap-1 rounded-xl border border-cyan-500/50 px-3 py-1.5 text-xs text-cyan-300 transition-colors hover:bg-cyan-500/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400"
            >
              {last ? "Done" : "Next"} {!last && <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />}
            </button>
            </div>
            <button
              onClick={onClose}
              className="rounded-lg border border-zinc-700 px-3 py-1 text-[11px] font-medium text-zinc-400 transition-colors hover:border-red-400/60 hover:bg-red-400/10 hover:text-red-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400"
            >
              Skip tutorial
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

// Mounting fresh on every open resets the step index to 0.
export default function Tour({ steps, open, onClose }) {
  if (!open || !steps?.length) return null;
  return createPortal(<TourInner steps={steps} onClose={onClose} />, document.body);
}