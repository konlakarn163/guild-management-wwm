"use client";

import { useLayoutEffect, useRef } from "react";
import { gsap } from "gsap";

interface CursorBallProps {
  enabled?: boolean;
}

export function CursorBall({ enabled = true }: CursorBallProps) {
  const ballRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    if (!enabled || !ballRef.current) {
      return;
    }

    const ball = ballRef.current;
    const checkIsDesktop = () => window.innerWidth >= 1024;

    const onMouseMove = (e: MouseEvent) => {
      if (!checkIsDesktop()) {
        if (ball) ball.style.opacity = "0";
        return;
      }

      if (ball) {
        ball.style.opacity = "1";
        const xSetter = gsap.quickSetter(ball, "x", "px");
        const ySetter = gsap.quickSetter(ball, "y", "px");
        xSetter(e.clientX);
        ySetter(e.clientY);

        const target = e.target as HTMLElement;
        const isOverImage =
          target.tagName.toLowerCase() === "img" || target.closest("img") || target.closest(".no-blend-zone");
        const isHoverable =
          target.tagName.toLowerCase() === "a" ||
          target.tagName.toLowerCase() === "button" ||
          target.closest("a") ||
          target.closest("button") ||
          target.closest(".hover-scale");

        if (isOverImage) {
          gsap.to(ball, {
            mixBlendMode: "normal",
            backgroundColor: "rgba(255, 255, 255, 0.2)",
            scale: 0.8,
            duration: 0.3,
          });
        } else if (isHoverable) {
          gsap.to(ball, {
            mixBlendMode: "difference",
            backgroundColor: "rgb(255, 255, 255)",
            scale: 2.5,
            duration: 0.3,
          });
        } else {
          gsap.to(ball, {
            mixBlendMode: "difference",
            backgroundColor: "rgb(255, 255, 255)",
            scale: 1,
            duration: 0.3,
          });
        }
      }
    };

    window.addEventListener("mousemove", onMouseMove);

    return () => {
      window.removeEventListener("mousemove", onMouseMove);
    };
  }, [enabled]);

  if (!enabled) {
    return null;
  }

  return (
    <div
      ref={ballRef}
      className="fixed top-0 left-0 w-16 h-16 bg-white rounded-full pointer-events-none z-[9999] mix-blend-difference -translate-x-1/2 -translate-y-1/2 hidden lg:block"
      style={{ opacity: 0 }}
    />
  );
}
