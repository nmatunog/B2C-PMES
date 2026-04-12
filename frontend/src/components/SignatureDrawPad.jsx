import { useCallback, useEffect, useRef, useState } from "react";
import { Eraser, PenLine } from "lucide-react";
import { canvasHasInk, compressCanvasToJpegDataUrl } from "../lib/signatureImage.js";

/**
 * @param {{ onApply: (dataUrl: string) => void; disabled?: boolean; resetVersion?: number }} props
 */
export function SignatureDrawPad({ onApply, disabled = false, resetVersion = 0 }) {
  const wrapRef = useRef(/** @type {HTMLDivElement | null} */ (null));
  const canvasRef = useRef(/** @type {HTMLCanvasElement | null} */ (null));
  const drawing = useRef(false);
  const last = useRef({ x: 0, y: 0 });
  const [applyError, setApplyError] = useState(/** @type {string | null} */ (null));

  const paintWhite = useCallback((ctx, cssW, cssH) => {
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, cssW, cssH);
  }, []);

  const setupCanvas = useCallback(() => {
    const wrap = wrapRef.current;
    const canvas = canvasRef.current;
    if (!wrap || !canvas) return;
    const rect = wrap.getBoundingClientRect();
    const cssW = Math.max(280, Math.floor(rect.width));
    const cssH = 140;
    const ratio = Math.min(Math.max(window.devicePixelRatio || 1, 1), 2.5);
    canvas.width = Math.floor(cssW * ratio);
    canvas.height = Math.floor(cssH * ratio);
    canvas.style.width = `${cssW}px`;
    canvas.style.height = `${cssH}px`;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.scale(ratio, ratio);
    paintWhite(ctx, cssW, cssH);
    ctx.strokeStyle = "#0f172a";
    ctx.lineWidth = 2.25;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
  }, [paintWhite]);

  useEffect(() => {
    const wrap = wrapRef.current;
    if (!wrap) return;
    setupCanvas();
    const ro = new ResizeObserver(() => {
      setupCanvas();
    });
    ro.observe(wrap);
    return () => ro.disconnect();
  }, [setupCanvas]);

  useEffect(() => {
    setupCanvas();
  }, [resetVersion, setupCanvas]);

  const getPos = (e) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const r = canvas.getBoundingClientRect();
    const x = e.clientX - r.left;
    const y = e.clientY - r.top;
    return { x, y };
  };

  const onPointerDown = (e) => {
    if (disabled) return;
    e.preventDefault();
    setApplyError(null);
    const canvas = canvasRef.current;
    if (!canvas) return;
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {
      /* ignore */
    }
    drawing.current = true;
    const { x, y } = getPos(e);
    last.current = { x, y };
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const onPointerMove = (e) => {
    if (!drawing.current || disabled) return;
    e.preventDefault();
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const { x, y } = getPos(e);
    ctx.beginPath();
    ctx.moveTo(last.current.x, last.current.y);
    ctx.lineTo(x, y);
    ctx.stroke();
    last.current = { x, y };
  };

  const endStroke = (e) => {
    if (!drawing.current) return;
    drawing.current = false;
    try {
      if (e?.currentTarget?.hasPointerCapture?.(e.pointerId)) {
        e.currentTarget.releasePointerCapture(e.pointerId);
      }
    } catch {
      /* ignore */
    }
  };

  const handleClear = () => {
    setApplyError(null);
    setupCanvas();
  };

  const handleApply = () => {
    setApplyError(null);
    const canvas = canvasRef.current;
    if (!canvas || disabled) return;
    const ratioCanvas = document.createElement("canvas");
    ratioCanvas.width = canvas.width;
    ratioCanvas.height = canvas.height;
    const rctx = ratioCanvas.getContext("2d");
    if (!rctx) {
      setApplyError("Could not read the drawing.");
      return;
    }
    rctx.drawImage(canvas, 0, 0);
    if (!canvasHasInk(ratioCanvas)) {
      setApplyError("Draw your signature in the box first.");
      return;
    }
    try {
      const dataUrl = compressCanvasToJpegDataUrl(ratioCanvas);
      onApply(dataUrl);
      setupCanvas();
    } catch (err) {
      setApplyError(err instanceof Error ? err.message : "Could not save the drawing.");
    }
  };

  return (
    <div className="space-y-2">
      <p className="text-[10px] font-bold uppercase tracking-wider text-slate-600">Draw your signature here</p>
      <div
        ref={wrapRef}
        className={`w-full rounded-lg border-2 border-dashed border-slate-300 bg-white ${
          disabled ? "pointer-events-none opacity-50" : "touch-none"
        }`}
      >
        <canvas
          ref={canvasRef}
          role="img"
          aria-label="Draw your signature"
          className="block max-w-full cursor-crosshair rounded-md"
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={endStroke}
          onPointerCancel={endStroke}
          onPointerLeave={(e) => {
            if (drawing.current) endStroke(e);
          }}
        />
      </div>
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          className="inline-flex items-center gap-1.5 rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-bold uppercase tracking-wide text-slate-700 hover:bg-slate-50 disabled:opacity-50"
          onClick={handleClear}
          disabled={disabled}
        >
          <Eraser className="h-3.5 w-3.5" aria-hidden />
          Clear
        </button>
        <button
          type="button"
          className="inline-flex items-center gap-1.5 rounded-xl border border-[#004aad]/50 bg-[#004aad] px-3 py-2 text-xs font-bold uppercase tracking-wide text-white shadow-sm hover:bg-[#003d8a] disabled:opacity-50"
          onClick={handleApply}
          disabled={disabled}
        >
          <PenLine className="h-3.5 w-3.5" aria-hidden />
          Use this signature
        </button>
      </div>
      {applyError ? (
        <p className="text-xs font-semibold text-red-600" role="alert">
          {applyError}
        </p>
      ) : (
        <p className="text-[10px] font-medium text-slate-500">
          Use mouse, finger, or stylus, then tap &quot;Use this signature&quot; to attach it to your form.
        </p>
      )}
    </div>
  );
}
