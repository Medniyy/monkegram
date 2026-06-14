"use client";

import { ButtonHTMLAttributes, forwardRef } from "react";

type Variant = "primary" | "secondary" | "danger" | "ghost";
type Size = "sm" | "md" | "lg";

interface PixelButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
}

const variants: Record<Variant, string> = {
  primary: "bg-banana text-screen border-screen hover:bg-cream",
  secondary: "bg-jungle text-cream border-cream hover:bg-pixelblue",
  danger: "bg-pixelred text-cream border-cream hover:brightness-110",
  ghost: "bg-transparent text-cream border-cream hover:bg-grid",
};

const sizes: Record<Size, string> = {
  sm: "text-[10px] px-3 py-2",
  md: "text-xs px-4 py-3",
  lg: "text-sm px-6 py-4",
};

/**
 * Chunky pixel button. Press translates it 4px down/right so the hard
 * drop-shadow "collapses" — the classic PS1 tactile press.
 */
export const PixelButton = forwardRef<HTMLButtonElement, PixelButtonProps>(
  function PixelButton(
    { variant = "primary", size = "md", className = "", children, ...props },
    ref
  ) {
    return (
      <button
        ref={ref}
        className={`
          font-[family-name:var(--font-display)] uppercase tracking-wide
          border-[3px] select-none
          shadow-[4px_4px_0_0_rgba(0,0,0,0.6)]
          transition-[transform,box-shadow,background-color] duration-75
          active:translate-x-[4px] active:translate-y-[4px] active:shadow-none
          disabled:opacity-40 disabled:pointer-events-none
          ${variants[variant]} ${sizes[size]} ${className}
        `}
        {...props}
      >
        {children}
      </button>
    );
  }
);
