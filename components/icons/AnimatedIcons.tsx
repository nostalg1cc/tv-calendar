
import React, { forwardRef, useCallback, useImperativeHandle, useRef } from 'react';
import { motion, useAnimation, AnimatePresence, Variants, Transition } from 'framer-motion';

// Simple utility to merge classes
const cn = (...classes: (string | undefined)[]) => classes.filter(Boolean).join(' ');

export interface IconHandle {
  startAnimation: () => void;
  stopAnimation: () => void;
}

interface IconProps extends React.HTMLAttributes<HTMLDivElement> {
  size?: number;
  className?: string;
}

// --- CALENDAR DAYS ---
const CALENDAR_DOTS = [
  { cx: 8, cy: 14 },
  { cx: 12, cy: 14 },
  { cx: 16, cy: 14 },
  { cx: 8, cy: 18 },
  { cx: 12, cy: 18 },
  { cx: 16, cy: 18 },
];

const CALENDAR_VARIANTS: Variants = {
  normal: { opacity: 1, transition: { duration: 0.2 } },
  animate: (i: number) => ({
    opacity: [1, 0.3, 1],
    transition: { delay: i * 0.1, duration: 0.4, times: [0, 0.5, 1] },
  }),
};

export const CalendarDaysIcon = forwardRef<IconHandle, IconProps>(
  ({ onMouseEnter, onMouseLeave, className, size = 24, ...props }, ref) => {
    const controls = useAnimation();
    const isControlledRef = useRef(false);

    useImperativeHandle(ref, () => {
      isControlledRef.current = true;
      return {
        startAnimation: () => controls.start("animate"),
        stopAnimation: () => controls.start("normal"),
      };
    });

    const handleMouseEnter = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
        if (!isControlledRef.current) controls.start("animate");
        onMouseEnter?.(e);
      }, [controls, onMouseEnter]);

    const handleMouseLeave = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
        if (!isControlledRef.current) controls.start("normal");
        onMouseLeave?.(e);
      }, [controls, onMouseLeave]);

    return (
      <div className={cn("select-none", className)} onMouseEnter={handleMouseEnter} onMouseLeave={handleMouseLeave} {...props}>
        <svg fill="none" height={size} stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" width={size}>
          <path d="M8 2v4" />
          <path d="M16 2v4" />
          <rect height="18" rx="2" width="18" x="3" y="4" />
          <path d="M3 10h18" />
          <AnimatePresence>
            {CALENDAR_DOTS.map((dot, index) => (
              <motion.circle
                animate={controls}
                custom={index}
                cx={dot.cx}
                cy={dot.cy}
                fill="currentColor"
                initial="normal"
                key={`${dot.cx}-${dot.cy}`}
                r="1"
                stroke="none"
                variants={CALENDAR_VARIANTS}
              />
            ))}
          </AnimatePresence>
        </svg>
      </div>
    );
  }
);
CalendarDaysIcon.displayName = "CalendarDaysIcon";

// --- COMPASS ---
export const CompassIcon = forwardRef<IconHandle, IconProps>(
  ({ onMouseEnter, onMouseLeave, className, size = 24, ...props }, ref) => {
    const controls = useAnimation();
    const isControlledRef = useRef(false);

    useImperativeHandle(ref, () => {
      isControlledRef.current = true;
      return {
        startAnimation: () => controls.start("animate"),
        stopAnimation: () => controls.start("normal"),
      };
    });

    const handleMouseEnter = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
      if (!isControlledRef.current) controls.start("animate");
      onMouseEnter?.(e);
    }, [controls, onMouseEnter]);

    const handleMouseLeave = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
      if (!isControlledRef.current) controls.start("normal");
      onMouseLeave?.(e);
    }, [controls, onMouseLeave]);

    return (
      <div className={cn("select-none", className)} onMouseEnter={handleMouseEnter} onMouseLeave={handleMouseLeave} {...props}>
        <svg fill="none" height={size} stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" width={size}>
          <circle cx="12" cy="12" r="10" />
          <motion.polygon
            animate={controls}
            points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76"
            transition={{ type: "spring", stiffness: 120, damping: 15 }}
            variants={{
              normal: { rotate: 0 },
              animate: { rotate: 360 },
            }}
            style={{ originX: "50%", originY: "50%" }}
          />
        </svg>
      </div>
    );
  }
);
CompassIcon.displayName = "CompassIcon";

// --- GALLERY VERTICAL END (Library) ---
const GALLERY_PATH_VARIANTS: Variants = {
  normal: {
    translateY: 0,
    opacity: 1,
    transition: { type: "tween", stiffness: 200, damping: 13 },
  },
  animate: (i: number) => ({
    translateY: [2 * i, 0],
    opacity: [0, 1],
    transition: { delay: 0.25 * (2 - i), type: "tween", stiffness: 200, damping: 13 },
  }),
};

export const GalleryVerticalEndIcon = forwardRef<IconHandle, IconProps>(
  ({ onMouseEnter, onMouseLeave, className, size = 24, ...props }, ref) => {
    const controls = useAnimation();
    const isControlledRef = useRef(false);

    useImperativeHandle(ref, () => {
      isControlledRef.current = true;
      return {
        startAnimation: () => controls.start("animate"),
        stopAnimation: () => controls.start("normal"),
      };
    });

    const handleMouseEnter = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
      if (!isControlledRef.current) controls.start("animate");
      onMouseEnter?.(e);
    }, [controls, onMouseEnter]);

    const handleMouseLeave = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
      if (!isControlledRef.current) controls.start("normal");
      onMouseLeave?.(e);
    }, [controls, onMouseLeave]);

    return (
      <div className={cn("select-none", className)} onMouseEnter={handleMouseEnter} onMouseLeave={handleMouseLeave} {...props}>
        <svg fill="none" height={size} stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" width={size}>
          <motion.path animate={controls} custom={1} d="M7 2h10" variants={GALLERY_PATH_VARIANTS} />
          <motion.path animate={controls} custom={2} d="M5 6h14" variants={GALLERY_PATH_VARIANTS} />
          <rect height="12" rx="2" width="18" x="3" y="10" />
        </svg>
      </div>
    );
  }
);
GalleryVerticalEndIcon.displayName = "GalleryVerticalEndIcon";

// --- EARTH (IPoint) ---
const EARTH_CIRCLE_TRANSITION: Transition = { duration: 0.3, delay: 0.1, opacity: { delay: 0.15 } };
const EARTH_CIRCLE_VARIANTS: Variants = {
  normal: { pathLength: 1, opacity: 1 },
  animate: { pathLength: [0, 1], opacity: [0, 1] },
};

export const EarthIcon = forwardRef<IconHandle, IconProps>(
  ({ onMouseEnter, onMouseLeave, className, size = 24, ...props }, ref) => {
    const controls = useAnimation();
    const isControlledRef = useRef(false);

    useImperativeHandle(ref, () => {
      isControlledRef.current = true;
      return {
        startAnimation: () => controls.start("animate"),
        stopAnimation: () => controls.start("normal"),
      };
    });

    const handleMouseEnter = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
      if (!isControlledRef.current) controls.start("animate");
      onMouseEnter?.(e);
    }, [controls, onMouseEnter]);

    const handleMouseLeave = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
      if (!isControlledRef.current) controls.start("normal");
      onMouseLeave?.(e);
    }, [controls, onMouseLeave]);

    return (
      <div className={cn("select-none", className)} onMouseEnter={handleMouseEnter} onMouseLeave={handleMouseLeave} {...props}>
        <svg fill="none" height={size} stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" width={size}>
          <motion.path
            d="M21.54 15H17a2 2 0 0 0-2 2v4.54"
            transition={{ duration: 0.7, delay: 0.5, opacity: { delay: 0.5 } }}
            variants={{
              normal: { pathLength: 1, opacity: 1, pathOffset: 0 },
              animate: { pathLength: [0, 1], opacity: [0, 1], pathOffset: [1, 0] },
            }}
            animate={controls}
          />
          <motion.path
            d="M7 3.34V5a3 3 0 0 0 3 3a2 2 0 0 1 2 2c0 1.1.9 2 2 2a2 2 0 0 0 2-2c0-1.1.9-2 2-2h3.17"
            transition={{ duration: 0.7, delay: 0.5, opacity: { delay: 0.5 } }}
            variants={{
              normal: { pathLength: 1, opacity: 1, pathOffset: 0 },
              animate: { pathLength: [0, 1], opacity: [0, 1], pathOffset: [1, 0] },
            }}
            animate={controls}
          />
          <motion.path
            d="M11 21.95V18a2 2 0 0 0-2-2a2 2 0 0 1-2-2v-1a2 2 0 0 0-2-2H2.05"
            transition={{ duration: 0.7, delay: 0.5, opacity: { delay: 0.5 } }}
            variants={{
              normal: { pathLength: 1, opacity: 1, pathOffset: 0 },
              animate: { pathLength: [0, 1], opacity: [0, 1], pathOffset: [1, 0] },
            }}
            animate={controls}
          />
          <motion.circle
            cx="12" cy="12" r="10"
            transition={EARTH_CIRCLE_TRANSITION}
            variants={EARTH_CIRCLE_VARIANTS}
            animate={controls}
          />
        </svg>
      </div>
    );
  }
);
EarthIcon.displayName = "EarthIcon";

// --- SEARCH ---
export const SearchIcon = forwardRef<IconHandle, IconProps>(
  ({ onMouseEnter, onMouseLeave, className, size = 24, ...props }, ref) => {
    const controls = useAnimation();
    const isControlledRef = useRef(false);

    useImperativeHandle(ref, () => {
      isControlledRef.current = true;
      return {
        startAnimation: () => controls.start("animate"),
        stopAnimation: () => controls.start("normal"),
      };
    });

    const handleMouseEnter = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
      if (!isControlledRef.current) controls.start("animate");
      onMouseEnter?.(e);
    }, [controls, onMouseEnter]);

    const handleMouseLeave = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
      if (!isControlledRef.current) controls.start("normal");
      onMouseLeave?.(e);
    }, [controls, onMouseLeave]);

    return (
      <div className={cn("select-none", className)} onMouseEnter={handleMouseEnter} onMouseLeave={handleMouseLeave} {...props}>
        <motion.svg
          animate={controls}
          fill="none"
          height={size}
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="2"
          transition={{ duration: 1, bounce: 0.3 }}
          variants={{
            normal: { x: 0, y: 0 },
            animate: { x: [0, 0, -3, 0], y: [0, -4, 0, 0] },
          }}
          viewBox="0 0 24 24"
          width={size}
        >
          <circle cx="11" cy="11" r="8" />
          <path d="m21 21-4.3-4.3" />
        </motion.svg>
      </div>
    );
  }
);
SearchIcon.displayName = "SearchIcon";
