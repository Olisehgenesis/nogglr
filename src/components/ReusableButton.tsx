"use client";

import React from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type ReusableButtonProps = {
  children: React.ReactNode;
  isLoading?: boolean;
  disabled?: boolean;
  fullWidth?: boolean;
  onClick?: React.MouseEventHandler<HTMLButtonElement>;
  className?: string;
  variant?: "default" | "destructive" | "outline" | "secondary" | "ghost" | "link";
  size?: "default" | "sm" | "lg" | "icon";
  [key: string]: any; // Allow additional props for compatibility
};

export function ReusableButton({
  children,
  isLoading = false,
  disabled = false,
  fullWidth = false,
  onClick,
  className = "",
  variant = "default",
  size = "default",
  ...props
}: ReusableButtonProps) {
  // Check if this is a small button based on className
  const isSmall = className.includes('px-2') || className.includes('py-1') || className.includes('text-xs');
  const isExtraSmall = className.includes('px-1.5') || className.includes('py-0.5');
  const isFooterButton = className.includes('font-bold') && !className.includes('px-') && !className.includes('py-');
  
  // Determine size based on className patterns
  let buttonSize = size;
  if (isExtraSmall) buttonSize = "sm";
  else if (isSmall) buttonSize = "sm";
  else if (isFooterButton) buttonSize = "lg";
  
  // Custom styling for the Nouns-inspired design
  const customStyles = cn(
    // Base styles for all buttons
    "border-2 transition-all duration-200 font-medium shadow-lg hover:shadow-xl active:shadow-md active:translate-y-0.5",
    // Size-specific styles
    isExtraSmall && "gap-0.5 px-1.5 py-1",
    isSmall && "gap-1 px-2 py-2",
    isFooterButton && "gap-2 px-7 py-3",
    !isExtraSmall && !isSmall && !isFooterButton && "gap-2 px-6 py-6",
    // Color and shadow styles
    !disabled && !isLoading && [
      "text-black border-[#1E73ED] bg-[#FFB700] hover:bg-[#FFB700]",
      isExtraSmall && "shadow-[0_1px_0_0_rgba(0,0,0,0.2)] hover:shadow-[0_2px_0_0_rgba(0,0,0,0.2)] active:shadow-[0_0px_0_0_rgba(0,0,0,0.2)] active:translate-y-[0.5px]",
      isSmall && "shadow-[0_2px_0_0_rgba(0,0,0,0.2)] hover:shadow-[0_3px_0_0_rgba(0,0,0,0.2)] active:shadow-[0_1px_0_0_rgba(0,0,0,0.2)] active:translate-y-[1px]",
      isFooterButton && "shadow-[0_3px_0_0_rgba(0,0,0,0.2)] hover:shadow-[0_4px_0_0_rgba(0,0,0,0.2)] active:shadow-[0_1px_0_0_rgba(0,0,0,0.2)] active:translate-y-[1.5px]",
      !isExtraSmall && !isSmall && !isFooterButton && "shadow-[0_4px_0_0_rgba(0,0,0,0.2)] hover:shadow-[0_6px_0_0_rgba(0,0,0,0.2)] active:shadow-[0_2px_0_0_rgba(0,0,0,0.2)] active:translate-y-[2px]"
    ],
    // Disabled styles
    (disabled || isLoading) && "text-black/60 border-[#1E73ED]/40 bg-[#FFB700]/40 cursor-not-allowed",
    // Full width
    fullWidth && "w-full",
    className
  );

  return (
    <Button
      type="button"
      onClick={onClick}
      disabled={disabled || isLoading}
      variant={variant}
      size={buttonSize}
      className={customStyles}
      {...props}
    >
      {children}
    </Button>
  );
}
