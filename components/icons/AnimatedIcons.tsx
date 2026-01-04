
import React, { forwardRef, useCallback, useImperativeHandle, useRef } from 'react';
import { motion, useAnimation } from 'framer-motion';

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

    const handleMouseEnter = useCallback(
      (e: React.MouseEvent<HTMLDivElement>) => {
        if (!isControlledRef.current) {
          controls.start("animate");
        }
        onMouseEnter?.(e);
      },
      [controls, onMouseEnter]
    );

    const handleMouseLeave = useCallback(
      (e: React.MouseEvent<HTMLDivElement>) => {
        if (!isControlledRef.current) {
          controls.start("normal");
        }
        onMouseLeave?.(e);
      },
      [controls, onMouseLeave]
    );

    return (
      <div className={cn("select-none", className)} onMouseEnter={handleMouseEnter} onMouseLeave={handleMouseLeave} {...props}>
        <svg fill="none" height={size} stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" width={size}>
          <motion.rect width="18" height="18" x="3" y="4" rx="2" ry="2" />
          <motion.line x1="16" x2="16" y1="2" y2="6" />
          <motion.line x1="8" x2="8" y1="2" y2="6" />
          <motion.line x1="3" x2="21" y1="10" y2="10" />
          {/* Animated Dots */}
          {[8, 12, 16].map((x, i) => (
             <motion.path 
                key={`row1-${i}`} d={`M${x} 14h.01`} 
                variants={{
                    normal: { opacity: 1, scale: 1 },
                    animate: { opacity: [1, 0.5, 1], scale: [1, 1.2, 1], transition: { delay: i * 0.1, duration: 0.4 } }
                }}
                animate={controls}
             />
          ))}
          {[8, 12, 16].map((x, i) => (
             <motion.path 
                key={`row2-${i}`} d={`M${x} 18h.01`} 
                variants={{
                    normal: { opacity: 1, scale: 1 },
                    animate: { opacity: [1, 0.5, 1], scale: [1, 1.2, 1], transition: { delay: (i + 3) * 0.1, duration: 0.4 } }
                }}
                animate={controls}
             />
          ))}
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

    return (
      <div className={cn("select-none", className)} {...props}>
        <svg fill="none" height={size} stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" width={size}>
          <circle cx="12" cy="12" r="10" />
          <motion.polygon 
            points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76" 
            variants={{
                normal: { rotate: 0 },
                animate: { rotate: [0, 45, -15, 0], transition: { duration: 0.8, ease: "easeInOut" } }
            }}
            animate={controls}
            style={{ originX: "50%", originY: "50%" }}
          />
        </svg>
      </div>
    );
  }
);
CompassIcon.displayName = "CompassIcon";

// --- GALLERY (Library) ---
export const GalleryHorizontalEndIcon = forwardRef<IconHandle, IconProps>(
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

    return (
      <div className={cn("select-none", className)} {...props}>
        <svg fill="none" height={size} stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" width={size}>
          <motion.path 
            d="M2 7v10" 
            variants={{
                normal: { opacity: 1, x: 0 },
                animate: { x: [0, 2, 0], opacity: [1, 0.5, 1], transition: { duration: 0.5 } }
            }}
            animate={controls}
          />
          <motion.path 
            d="M6 5v14" 
            variants={{
                normal: { opacity: 1, x: 0 },
                animate: { x: [0, 2, 0], opacity: [1, 0.5, 1], transition: { delay: 0.1, duration: 0.5 } }
            }}
            animate={controls}
          />
          <rect width="12" height="18" x="10" y="3" rx="2" />
        </svg>
      </div>
    );
  }
);
GalleryHorizontalEndIcon.displayName = "GalleryHorizontalEndIcon";

// --- EARTH ---
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

    return (
      <div className={cn("select-none", className)} {...props}>
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
            transition={{ duration: 0.3, delay: 0.1, opacity: { delay: 0.15 } }}
            variants={{
              normal: { pathLength: 1, opacity: 1 },
              animate: { pathLength: [0, 1], opacity: [0, 1] },
            }}
            animate={controls}
          />
        </svg>
      </div>
    );
  }
);
EarthIcon.displayName = "EarthIcon";
