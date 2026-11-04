"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

const SCROLL_START = 100;
const SCROLL_RANGE = 400;
const MOUSE_IDLE_MS = 1200;
const MAX_LEAN = 30;

const clamp = (value: number) => Math.min(1, Math.max(0, value));

const getScrollTop = () =>
  window.scrollY || window.pageYOffset || document.documentElement.scrollTop || document.body.scrollTop || 0;

export function ClimbingCat({ className }: { className?: string }) {
  const [progress, setProgress] = useState(0);
  const progressRef = useRef(0);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const swingRef = useRef<SVGGElement>(null);

  useEffect(() => {
    let frame = 0;

    const update = () => {
      frame = 0;
      setProgress(clamp((getScrollTop() - SCROLL_START) / SCROLL_RANGE));
    };

    const onScroll = () => {
      if (!frame) {
        frame = window.requestAnimationFrame(update);
      }
    };

    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    document.addEventListener("scroll", onScroll, { passive: true, capture: true });

    return () => {
      window.removeEventListener("scroll", onScroll);
      document.removeEventListener("scroll", onScroll, true);
      if (frame) {
        window.cancelAnimationFrame(frame);
      }
    };
  }, []);

  useEffect(() => {
    progressRef.current = progress;
  }, [progress]);

  useEffect(() => {
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let mouseX = 0;
    let lastMouseMove = -Infinity;
    let angle = 0;
    let frame = 0;

    const onMouseMove = (event: MouseEvent) => {
      mouseX = event.clientX;
      lastMouseMove = performance.now();
    };

    const tick = (now: number) => {
      const rect = wrapperRef.current?.getBoundingClientRect();
      let target = 0;

      if (rect && now - lastMouseMove < MOUSE_IDLE_MS) {
        const dx = mouseX - (rect.left + rect.width / 2);
        target = -Math.max(-MAX_LEAN, Math.min(MAX_LEAN, dx / 12));
      } else if (!reduceMotion) {
        target = Math.sin(now / 650) * (2 + progressRef.current * 10);
      }

      angle += (target - angle) * 0.08;
      swingRef.current?.setAttribute("transform", `rotate(${angle.toFixed(2)} 40 6)`);
      frame = window.requestAnimationFrame(tick);
    };

    window.addEventListener("mousemove", onMouseMove, { passive: true });
    frame = window.requestAnimationFrame(tick);

    return () => {
      window.removeEventListener("mousemove", onMouseMove);
      window.cancelAnimationFrame(frame);
    };
  }, []);

  const drop = 4 + progress * 24;
  const kick = Math.sin(progress * 70) * (1.5 + progress * 4);
  const panicking = progress > 0.75;
  const worried = progress > 0.35;

  return (
    <div
      ref={wrapperRef}
      aria-hidden="true"
      className={cn("pointer-events-none absolute top-[calc(100%-5px)] -z-10 h-[120px] w-20", className)}
    >
      <svg viewBox="0 0 80 120" className="h-full w-full overflow-visible">
        <g ref={swingRef}>
          <g transform={`translate(0 ${drop})`}>
            <path
              d={`M50 64 C64 ${66 + kick} 68 ${54 - kick} 60 48`}
              fill="none"
              stroke="#f28b3c"
              strokeWidth="5"
              strokeLinecap="round"
            />
            <ellipse cx="40" cy="56" rx="14" ry="18" fill="#f28b3c" />
            <ellipse cx="40" cy="60" rx="8" ry="11" fill="#ffc79a" />
            <path d="M28 50 l5 1.5 M27 57 l5 1 M52 50 l-5 1.5 M53 57 l-5 1" stroke="#d96a1d" strokeWidth="2" strokeLinecap="round" />
            <ellipse cx={33 + kick} cy="74" rx="5" ry="6" fill="#ffc79a" />
            <ellipse cx={47 - kick} cy="74" rx="5" ry="6" fill="#ffc79a" />
          </g>

          <path
            d={`M27 6 L29 ${drop + 30} M53 6 L51 ${drop + 30}`}
            stroke="#f28b3c"
            strokeWidth="7"
            strokeLinecap="round"
          />

          <g transform={`translate(0 ${drop})`}>
            <path
              d="M24 32 V22 Q24 12 32 10 L29 1 L38 7 Q40 6.6 42 7 L51 1 L48 10 Q56 12 56 22 V32 Q56 39 40 39 Q24 39 24 32 Z"
              fill="#f28b3c"
            />
            <path d="M31.5 9 L30.5 4 L35.5 7.5 Z M48.5 9 L49.5 4 L44.5 7.5 Z" fill="#ffb8c8" />
            <path d="M40 9 V13 M36.5 10 L37.5 13.5 M43.5 10 L42.5 13.5" stroke="#d96a1d" strokeWidth="1.4" strokeLinecap="round" />

            {panicking ? (
              <path
                d="M31 18.5 l4 2.5 l-4 2.5 M49 18.5 l-4 2.5 l4 2.5"
                fill="none"
                stroke="#1b1108"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            ) : (
              <>
                <ellipse cx="34" cy="21" rx="2.4" ry={worried ? 3.6 : 2.8} fill="#1b1108" />
                <ellipse cx="46" cy="21" rx="2.4" ry={worried ? 3.6 : 2.8} fill="#1b1108" />
                <circle cx="34.9" cy="19.8" r="0.9" fill="#fff" />
                <circle cx="46.9" cy="19.8" r="0.9" fill="#fff" />
              </>
            )}

            <circle cx="29" cy="27" r="2.2" fill="#ffb8c8" opacity="0.7" />
            <circle cx="51" cy="27" r="2.2" fill="#ffb8c8" opacity="0.7" />
            <path d="M38.5 26 h3 l-1.5 1.8 z" fill="#ffb8c8" />

            {worried ? (
              <ellipse cx="40" cy="31" rx="1.8" ry={panicking ? 2.6 : 2} fill="#1b1108" />
            ) : (
              <path d="M40 27.8 q-1.5 2.4 -3.3 1.2 M40 27.8 q1.5 2.4 3.3 1.2" fill="none" stroke="#1b1108" strokeWidth="1.2" strokeLinecap="round" />
            )}

            {worried ? (
              <text x="58" y="12" fontSize="11" fontWeight="900" fill="#f5c548">
                {panicking ? "!!" : "!"}
              </text>
            ) : null}
          </g>

          <g fill="#ffc79a" stroke="#d96a1d" strokeWidth="1">
            <ellipse cx="27" cy="7" rx="5.5" ry="4.5" />
            <ellipse cx="53" cy="7" rx="5.5" ry="4.5" />
          </g>
        </g>
      </svg>
    </div>
  );
}
