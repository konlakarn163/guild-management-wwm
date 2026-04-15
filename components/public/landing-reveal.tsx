"use client";

import gsap from "gsap";
import { useEffect, useRef, type ReactNode } from "react";

interface LandingRevealProps {
  children: ReactNode;
}

export function LandingReveal({ children }: LandingRevealProps) {
  const scopeRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!scopeRef.current) {
      return;
    }

    const ctx = gsap.context(() => {
      gsap.from("[data-reveal]", {
        y: 28,
        opacity: 0,
        duration: 0.65,
        stagger: 0.08,
        ease: "power2.out",
      });
    }, scopeRef);

    return () => ctx.revert();
  }, []);

  return <div ref={scopeRef}>{children}</div>;
}