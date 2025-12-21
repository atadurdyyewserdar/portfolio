/* eslint-disable react-hooks/purity */
import { useMemo } from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface SparklesTextProps {
  children: React.ReactNode;
  className?: string;
  sparklesCount?: number;
}

export function SparklesText({
  children,
  className,
  sparklesCount = 10,
}: SparklesTextProps) {
  const sparkles = useMemo(
    () =>
      Array.from({ length: sparklesCount }).map((_, i) => ({
        id: i,
        initialX: Math.random() * 100 - 50,
        initialY: Math.random() * 100 - 50,
        animateX: Math.random() * 100 - 50,
        animateY: Math.random() * 100 - 50,
        duration: Math.random() * 2 + 1,
        delay: Math.random() * 2,
        left: Math.random() * 100,
        top: Math.random() * 100,
      })),
    [sparklesCount]
  );

  return (
    <div className={cn("relative inline-block", className)}>
      <span className="relative z-10">{children}</span>
      {sparkles.map((sparkle) => (
        <motion.span
          key={sparkle.id}
          className="absolute pointer-events-none"
          initial={{
            opacity: 0,
            scale: 0,
            x: sparkle.initialX,
            y: sparkle.initialY,
          }}
          animate={{
            opacity: [0, 1, 0],
            scale: [0, 1, 0],
            x: sparkle.animateX,
            y: sparkle.animateY,
          }}
          transition={{
            duration: sparkle.duration,
            repeat: Infinity,
            delay: sparkle.delay,
            ease: "easeInOut",
          }}
          style={{
            left: `${sparkle.left}%`,
            top: `${sparkle.top}%`,
          }}
        >
          <svg
            className="w-2 h-2 text-yellow-400"
            fill="currentColor"
            viewBox="0 0 24 24"
          >
            <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z" />
          </svg>
        </motion.span>
      ))}
    </div>
  );
}
