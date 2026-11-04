import { cn } from "@/lib/utils";

interface DecorProps {
  className?: string;
}

export function PawPrint({ className }: DecorProps) {
  return (
    <svg viewBox="0 0 64 64" fill="currentColor" aria-hidden="true" className={className}>
      <path d="M32 30c-8.5 0-16 8.2-16 15.4 0 5.1 4 7.6 8.6 7.6 3 0 4.8-1.4 7.4-1.4s4.4 1.4 7.4 1.4c4.6 0 8.6-2.5 8.6-7.6C48 38.2 40.5 30 32 30z" />
      <ellipse cx="12" cy="28" rx="5.5" ry="7.5" transform="rotate(-25 12 28)" />
      <ellipse cx="23.5" cy="15.5" rx="5.5" ry="7.5" transform="rotate(-8 23.5 15.5)" />
      <ellipse cx="40.5" cy="15.5" rx="5.5" ry="7.5" transform="rotate(8 40.5 15.5)" />
      <ellipse cx="52" cy="28" rx="5.5" ry="7.5" transform="rotate(25 52 28)" />
    </svg>
  );
}

/** A single ear drawn to sit on top of a dark card: same fill as the card, outlined like its border. */
export function CatEar({ className }: DecorProps) {
  return (
    <svg viewBox="0 0 60 50" aria-hidden="true" className={className}>
      <path d="M2 50 L22 9 Q30 -6 38 9 L58 50 Z" fill="#040a13" />
      <path d="M2 50 L22 9 Q30 -6 38 9 L58 50" fill="none" stroke="rgba(254, 243, 199, 0.14)" strokeWidth="2" />
      <path d="M16 50 L27 25 Q30 18 33 25 L44 50 Z" fill="#f5c548" opacity="0.4" />
    </svg>
  );
}

/** Two ears perched on a card's top edge — the parent must be `relative`. */
export function CatEars({ className }: DecorProps) {
  return (
    <div aria-hidden="true" className={cn("pointer-events-none absolute -top-[1.95rem] left-7 flex gap-12", className)}>
      <CatEar className="h-8 w-10 -rotate-6" />
      <CatEar className="h-8 w-10 rotate-6" />
    </div>
  );
}

/** An orange tabby peeking over an edge, paws resting on it. */
export function PeekingCat({ className }: DecorProps) {
  return (
    <svg viewBox="0 0 120 86" aria-hidden="true" className={className}>
      <path d="M22 86 V42 Q22 22 40 17 L34 0 L54 12 Q60 11 66 12 L86 0 L80 17 Q98 22 98 42 V86 Z" fill="#f28b3c" />
      <path d="M39 15 L36 5 L48 11 Z M81 15 L84 5 L72 11 Z" fill="#ffb8c8" />
      <path d="M60 19 V28 M51 21 L53.5 29 M69 21 L66.5 29" stroke="#d96a1d" strokeWidth="3" strokeLinecap="round" />
      <g className="origin-center [transform-box:fill-box] motion-safe:animate-[cat-blink_4.5s_ease-in-out_infinite]">
        <ellipse cx="46" cy="44" rx="5" ry="6.5" fill="#1b1108" />
        <ellipse cx="74" cy="44" rx="5" ry="6.5" fill="#1b1108" />
      </g>
      <circle cx="47.8" cy="41.5" r="1.7" fill="#fff" />
      <circle cx="75.8" cy="41.5" r="1.7" fill="#fff" />
      <circle cx="38" cy="54" r="4.5" fill="#ffb8c8" opacity="0.7" />
      <circle cx="82" cy="54" r="4.5" fill="#ffb8c8" opacity="0.7" />
      <path d="M56.5 52 h7 l-3.5 4 z" fill="#ffb8c8" />
      <path
        d="M60 56 q-3 5 -7 2.5 M60 56 q3 5 7 2.5 M30 50 h-14 M30 55 l-13 3 M90 50 h14 M90 55 l13 3"
        fill="none"
        stroke="#1b1108"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
      <ellipse cx="38" cy="80" rx="13" ry="8" fill="#ffc79a" />
      <ellipse cx="82" cy="80" rx="13" ry="8" fill="#ffc79a" />
      <path d="M34 75 v5 M42 75 v5 M78 75 v5 M86 75 v5" stroke="#d96a1d" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

export function YarnBall({ className }: DecorProps) {
  return (
    <svg viewBox="0 0 48 40" aria-hidden="true" className={className}>
      <path d="M22 30 C30 38 38 30 46 36" fill="none" stroke="#fb7185" strokeWidth="1.6" strokeLinecap="round" opacity="0.8" />
      <circle cx="16" cy="20" r="14" fill="#fb7185" />
      <path
        d="M4 16 Q16 10 28 18 M3.5 23 Q16 16 29.5 24 M8 31 Q18 24 27 29 M10 8 Q8 20 14 33 M18 6 Q24 18 22 34"
        fill="none"
        stroke="#be3a55"
        strokeWidth="1.4"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function PawTrail({ className, count = 6 }: DecorProps & { count?: number }) {
  return (
    <div aria-hidden="true" className={cn("pointer-events-none flex items-end gap-5", className)}>
      {Array.from({ length: count }, (_, index) => (
        <PawPrint
          key={index}
          className={cn("h-4 w-4 rotate-90", index % 2 === 0 ? "-translate-y-2" : "translate-y-0")}
        />
      ))}
    </div>
  );
}

type CatMood ="success" | "error" | "warning" | "info" | "default";

const catMoodColors: Record<CatMood, { fur: string; stripe: string }> = {
  success: { fur: "#f28b3c", stripe: "#d96a1d" },
  error: { fur: "#8b95a7", stripe: "#5f6878" },
  warning: { fur: "#f5c548", stripe: "#c99a1f" },
  info: { fur: "#e8d9c4", stripe: "#b8a184" },
  default: { fur: "#f28b3c", stripe: "#d96a1d" },
};

export function CatFace({ mood = "default", className }: DecorProps & { mood?: CatMood }) {
  const { fur, stripe } = catMoodColors[mood];

  return (
    <svg viewBox="0 0 40 36" aria-hidden="true" className={className}>
      <path d="M4 34 V16 Q4 9 10 7 L8 0 L16 5 Q20 4.4 24 5 L32 0 L30 7 Q36 9 36 16 V34 Z" fill={fur} />
      <path d="M10.5 6 L9.5 2.5 L14 5 Z M29.5 6 L30.5 2.5 L26 5 Z" fill="#ffb8c8" />
      <path d="M20 7 V11 M16.5 8 L17.5 11.5 M23.5 8 L22.5 11.5" stroke={stripe} strokeWidth="1.4" strokeLinecap="round" />
      {mood === "error" ? (
        <path d="M11.5 15.5 l4 2.5 l-4 2.5 M28.5 15.5 l-4 2.5 l4 2.5" fill="none" stroke="#1b1108" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
      ) : mood === "success" ? (
        <path d="M11.5 19 q2.5 -3 5 0 M23.5 19 q2.5 -3 5 0" fill="none" stroke="#1b1108" strokeWidth="1.6" strokeLinecap="round" />
      ) : (
        <>
          <ellipse cx="14" cy="18" rx="2.2" ry={mood === "warning" ? 3.2 : 2.8} fill="#1b1108" />
          <ellipse cx="26" cy="18" rx="2.2" ry={mood === "warning" ? 3.2 : 2.8} fill="#1b1108" />
          <circle cx="14.8" cy="17" r="0.8" fill="#fff" />
          <circle cx="26.8" cy="17" r="0.8" fill="#fff" />
        </>
      )}
      <circle cx="9.5" cy="23" r="2" fill="#ffb8c8" opacity="0.7" />
      <circle cx="30.5" cy="23" r="2" fill="#ffb8c8" opacity="0.7" />
      <path d="M18.5 22 h3 l-1.5 1.8 z" fill="#ffb8c8" />
      {mood === "error" ? (
        <path d="M17 27.5 q3 -2.5 6 0" fill="none" stroke="#1b1108" strokeWidth="1.3" strokeLinecap="round" />
      ) : mood === "warning" ? (
        <ellipse cx="20" cy="27" rx="1.6" ry="1.9" fill="#1b1108" />
      ) : (
        <path d="M20 23.8 q-1.5 2.4 -3.3 1.2 M20 23.8 q1.5 2.4 3.3 1.2" fill="none" stroke="#1b1108" strokeWidth="1.2" strokeLinecap="round" />
      )}
    </svg>
  );
}

/** A curled-up sleeping cat for empty states. */
export function SleepingCat({ className }: DecorProps) {
  return (
    <svg viewBox="0 0 64 40" aria-hidden="true" className={className}>
      <path d="M8 34 Q6 18 22 14 Q34 11 44 16 Q56 20 56 32 Q56 36 50 36 H12 Q8 36 8 34 Z" fill="currentColor" opacity="0.55" />
      <path d="M14 20 L12 10 L20 15 Z M26 14 L28 5 L32 13 Z" fill="currentColor" opacity="0.55" />
      <path d="M15 24 q3 2 6 0 M25 22 q3 2 6 0" fill="none" stroke="#040a13" strokeWidth="1.6" strokeLinecap="round" />
      <path d="M50 34 Q62 30 58 22" fill="none" stroke="currentColor" strokeOpacity="0.55" strokeWidth="4" strokeLinecap="round" />
      <text x="40" y="9" fontSize="8" fontWeight="700" fill="currentColor" opacity="0.7">z</text>
      <text x="47" y="5" fontSize="6" fontWeight="700" fill="currentColor" opacity="0.5">z</text>
    </svg>
  );
}
