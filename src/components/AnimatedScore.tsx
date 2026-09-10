/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';

interface AnimatedScoreProps {
  value: number;
  className?: string;
  showDeltaBadge?: boolean;
  badgeClassName?: string;
}

export default function AnimatedScore({
  value,
  className = '',
  showDeltaBadge = false,
  badgeClassName = ''
}: AnimatedScoreProps) {
  const [displayValue, setDisplayValue] = useState(value);
  const [delta, setDelta] = useState<number | null>(null);
  const prevValueRef = useRef(value);
  const isFirstRender = useRef(true);

  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      prevValueRef.current = value;
      setDisplayValue(value);
      return;
    }

    const diff = value - prevValueRef.current;
    if (diff !== 0) {
      setDelta(diff);
      const timer = setTimeout(() => {
        setDelta(null);
      }, 1200);

      // Smooth step counter transition
      const startValue = prevValueRef.current;
      const endValue = value;
      const duration = 400; // ms
      const startTime = performance.now();

      const animateCount = (currentTime: number) => {
        const elapsed = currentTime - startTime;
        const progress = Math.min(elapsed / duration, 1);
        // easeOutQuad
        const easeProgress = 1 - (1 - progress) * (1 - progress);
        const currentCount = Math.round(startValue + (endValue - startValue) * easeProgress);
        setDisplayValue(currentCount);

        if (progress < 1) {
          requestAnimationFrame(animateCount);
        } else {
          setDisplayValue(endValue);
        }
      };

      requestAnimationFrame(animateCount);
      prevValueRef.current = value;

      return () => clearTimeout(timer);
    } else {
      setDisplayValue(value);
    }
  }, [value]);

  const isPositiveDelta = delta !== null && delta > 0;
  const isNegativeDelta = delta !== null && delta < 0;

  return (
    <div className="relative inline-flex items-center justify-center">
      <motion.span
        key={value}
        initial={{ scale: delta !== null ? 1.22 : 1, y: delta !== null ? (isPositiveDelta ? -3 : 3) : 0 }}
        animate={{ scale: 1, y: 0 }}
        transition={{ type: 'spring', stiffness: 450, damping: 20 }}
        className={`inline-block ${className} ${
          isPositiveDelta 
            ? 'filter drop-shadow-[0_0_15px_rgba(74,222,128,0.7)]' 
            : isNegativeDelta 
            ? 'filter drop-shadow-[0_0_15px_rgba(248,113,113,0.7)]' 
            : ''
        }`}
      >
        {displayValue}
      </motion.span>

      {/* Floating Delta Indicator Badge (+1, +2, +3, -1, -2, etc.) */}
      <AnimatePresence>
        {showDeltaBadge && delta !== null && (
          <motion.span
            initial={{ opacity: 0, y: isPositiveDelta ? 6 : -6, scale: 0.7 }}
            animate={{ opacity: 1, y: isPositiveDelta ? -18 : 18, scale: 1 }}
            exit={{ opacity: 0, scale: 0.6 }}
            transition={{ duration: 0.7, ease: 'easeOut' }}
            className={`absolute pointer-events-none font-mono font-black text-xs md:text-sm px-1.5 py-0.5 rounded-full shadow-lg border z-20 ${
              isPositiveDelta
                ? 'bg-emerald-500 text-slate-950 border-emerald-300 shadow-emerald-500/40'
                : 'bg-rose-600 text-white border-rose-400 shadow-rose-600/40'
            } ${badgeClassName}`}
          >
            {isPositiveDelta ? `+${delta}` : `${delta}`}
          </motion.span>
        )}
      </AnimatePresence>
    </div>
  );
}
