import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export const BentoGrid = ({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) => {
  return (
    <div
      className={cn(
        "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 max-w-7xl mx-auto",
        className
      )}
    >
      {children}
    </div>
  );
};

export const BentoCard = ({
  children,
  className,
  onClick,
}: {
  children: ReactNode;
  className?: string;
  onClick?: () => void;
}) => {
  const cardClass = cn(
    "bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 transition-all duration-300 transform-gpu hover:scale-[1.02]",
    onClick && "cursor-pointer",
    className
  );

  const boxShadowStyle = {
    boxShadow: "rgba(0, 0, 0, 0.04) 0px 6px 18px 0px",
  };

  return (
    <div className={cardClass} style={boxShadowStyle} onClick={onClick}>
      {children}
    </div>
  );
};
