"use client";

import {
  motion,
  useReducedMotion,
  type HTMLMotionProps,
  type Variants,
} from "framer-motion";
import type { ReactNode } from "react";

type StageProfile = "intro" | "guided" | "reveal" | "secure" | "welcome";
type SequenceProfile = "default" | "hero" | "reveal" | "secure" | "welcome";

function getStageVariants(profile: StageProfile, reduced: boolean): Variants {
  if (reduced) {
    return {
      enter: { opacity: 0 },
      center: { opacity: 1 },
      exit: { opacity: 0 },
    };
  }

  const profileMap: Record<StageProfile, { enterY: number; exitY: number; scale: number; blur: number }> = {
    intro: { enterY: 26, exitY: -18, scale: 1.015, blur: 16 },
    guided: { enterY: 22, exitY: -16, scale: 1.008, blur: 12 },
    reveal: { enterY: 30, exitY: -14, scale: 1.018, blur: 14 },
    secure: { enterY: 14, exitY: -10, scale: 1.004, blur: 8 },
    welcome: { enterY: 18, exitY: -12, scale: 1.01, blur: 10 },
  };

  const config = profileMap[profile];

  return {
    enter: (direction: number) => ({
      opacity: 0,
      y: direction >= 0 ? config.enterY : -config.enterY * 0.45,
      scale: config.scale,
      filter: `blur(${config.blur}px)`,
      clipPath: "inset(0 0 8% 0 round 2rem)",
    }),
    center: {
      opacity: 1,
      y: 0,
      scale: 1,
      filter: "blur(0px)",
      clipPath: "inset(0 0 0% 0 round 2rem)",
      transition: {
        duration: profile === "secure" ? 0.48 : 0.68,
        ease: [0.22, 1, 0.36, 1],
      },
    },
    exit: (direction: number) => ({
      opacity: 0,
      y: direction >= 0 ? config.exitY : 16,
      scale: 0.992,
      filter: "blur(10px)",
      transition: {
        duration: profile === "secure" ? 0.32 : 0.42,
        ease: [0.4, 0, 0.2, 1],
      },
    }),
  };
}

function getContainerVariants(profile: SequenceProfile, reduced: boolean): Variants {
  if (reduced) {
    return {
      hidden: { opacity: 1 },
      show: { opacity: 1 },
    };
  }

  const staggerMap: Record<SequenceProfile, { stagger: number; delay: number }> = {
    default: { stagger: 0.08, delay: 0.04 },
    hero: { stagger: 0.12, delay: 0.08 },
    reveal: { stagger: 0.1, delay: 0.1 },
    secure: { stagger: 0.05, delay: 0.02 },
    welcome: { stagger: 0.07, delay: 0.08 },
  };

  const config = staggerMap[profile];

  return {
    hidden: {},
    show: {
      transition: {
        staggerChildren: config.stagger,
        delayChildren: config.delay,
      },
    },
  };
}

function getItemVariants(profile: SequenceProfile, reduced: boolean): Variants {
  if (reduced) {
    return {
      hidden: { opacity: 0 },
      show: { opacity: 1 },
    };
  }

  const profileMap: Record<SequenceProfile, { y: number; scale: number; blur: number }> = {
    default: { y: 20, scale: 0.994, blur: 10 },
    hero: { y: 26, scale: 0.99, blur: 14 },
    reveal: { y: 24, scale: 1.008, blur: 12 },
    secure: { y: 12, scale: 0.998, blur: 7 },
    welcome: { y: 16, scale: 1.002, blur: 9 },
  };

  const config = profileMap[profile];

  return {
    hidden: {
      opacity: 0,
      y: config.y,
      scale: config.scale,
      filter: `blur(${config.blur}px)`,
    },
    show: {
      opacity: 1,
      y: 0,
      scale: 1,
      filter: "blur(0px)",
      transition: {
        duration: profile === "secure" ? 0.44 : 0.6,
        ease: [0.22, 1, 0.36, 1],
      },
    },
  };
}

export function StageTransition({
  children,
  direction,
  profile,
}: {
  children: ReactNode;
  direction: number;
  profile: StageProfile;
}) {
  const reduced = useReducedMotion();

  return (
    <motion.div
      custom={direction}
      variants={getStageVariants(profile, !!reduced)}
      initial="enter"
      animate="center"
      exit="exit"
      className="will-change-transform"
    >
      {children}
    </motion.div>
  );
}

export function MotionSequence({
  children,
  className,
  profile = "default",
}: {
  children: ReactNode;
  className?: string;
  profile?: SequenceProfile;
}) {
  const reduced = useReducedMotion();

  return (
    <motion.div
      variants={getContainerVariants(profile, !!reduced)}
      initial="hidden"
      animate="show"
      className={className}
    >
      {children}
    </motion.div>
  );
}

export function MotionItem({
  children,
  className,
  profile = "default",
  ...props
}: HTMLMotionProps<"div"> & {
  children: ReactNode;
  profile?: SequenceProfile;
}) {
  const reduced = useReducedMotion();

  return (
    <motion.div
      variants={getItemVariants(profile, !!reduced)}
      className={className}
      {...props}
    >
      {children}
    </motion.div>
  );
}
