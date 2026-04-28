import * as React from "react";

import { cn } from "@/lib/utils";

export type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "default" | "secondary" | "outline" | "ghost" | "destructive";
  size?: "default" | "sm" | "lg";
  asChild?: boolean;
};

const variantClasses: Record<NonNullable<ButtonProps["variant"]>, string> = {
  default: "bronze-edge bg-primary text-primary-foreground shadow-[0_16px_42px_rgba(223,164,83,0.24)] hover:bg-primary/90",
  secondary: "border border-secondary/50 bg-secondary text-secondary-foreground shadow-[0_14px_38px_rgba(0,0,0,0.22)] hover:bg-secondary/90",
  outline: "border border-primary/35 bg-background/35 text-foreground shadow-[inset_0_1px_0_rgba(255,255,255,0.05)] hover:border-primary/70 hover:bg-primary/10",
  ghost: "hover:bg-primary/10 hover:text-primary",
  destructive: "bg-destructive text-destructive-foreground hover:opacity-90",
};

const sizeClasses: Record<NonNullable<ButtonProps["size"]>, string> = {
  default: "min-h-11 px-4 py-2",
  sm: "min-h-10 px-3",
  lg: "min-h-12 px-6",
};

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ asChild = false, className, variant = "default", size = "default", ...props }, ref) => {
    const classes = cn(
      "inline-flex cursor-pointer items-center justify-center rounded-md text-sm font-medium transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50",
      variantClasses[variant],
      sizeClasses[size],
      className
    );

    if (asChild && React.isValidElement(props.children)) {
      return React.cloneElement(props.children, {
        className: cn(classes, props.children.props.className),
      });
    }

    return <button ref={ref} className={classes} {...props} />;
  }
);
Button.displayName = "Button";
