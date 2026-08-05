"use client";

import { motion, useReducedMotion } from "framer-motion";

interface ProgressRingProps {
  /** 0–100 */
  percent:  number;
  size?:    number;
  stroke?:  number;
  color?:   string;
  trackColor?: string;
  /** Rendered centred inside the ring. */
  children?: React.ReactNode;
  className?: string;
}

/**
 * Circular progress indicator. The arc animates from its previous value via
 * strokeDashoffset, which framer-motion can interpolate on an SVG attribute.
 */
export function ProgressRing({
  percent,
  size = 28,
  stroke = 2.5,
  color = "#d61b17",
  trackColor = "rgba(255,255,255,0.12)",
  children,
  className,
}: ProgressRingProps) {
  const reduce = useReducedMotion();
  const r      = (size - stroke) / 2;
  const c      = 2 * Math.PI * r;
  const clamped = Math.max(0, Math.min(100, percent));
  const offset  = c * (1 - clamped / 100);

  return (
    <span
      className={`relative inline-flex shrink-0 items-center justify-center ${className ?? ""}`}
      style={{ width: size, height: size }}
    >
      <svg width={size} height={size} className="absolute inset-0 -rotate-90" aria-hidden>
        <circle
          cx={size / 2} cy={size / 2} r={r}
          fill="none" stroke={trackColor} strokeWidth={stroke}
        />
        <motion.circle
          cx={size / 2} cy={size / 2} r={r}
          fill="none" stroke={color} strokeWidth={stroke} strokeLinecap="round"
          strokeDasharray={c}
          initial={{ strokeDashoffset: c }}
          animate={{ strokeDashoffset: offset }}
          transition={reduce ? { duration: 0 } : { duration: 0.65, ease: [0.22, 1, 0.36, 1] }}
        />
      </svg>
      {children}
    </span>
  );
}
