import { cn } from "@/lib/utils";

export type BadgeVariant = "default" | "scg" | "amber" | "red" | "gray" | "blue" | "green" | "outline";

const variantClasses: Record<BadgeVariant, string> = {
  default: "bg-gray-100 text-gray-700",
  scg: "bg-scg-50 text-scg-700",
  amber: "bg-amber-50 text-amber-700",
  red: "bg-red-50 text-red-700",
  gray: "bg-gray-100 text-gray-600",
  blue: "bg-blue-50 text-blue-700",
  green: "bg-green-50 text-green-700",
  outline: "border border-gray-300 bg-white text-gray-700",
};

interface BadgeProps {
  children: React.ReactNode;
  variant?: BadgeVariant;
  className?: string;
}

export function Badge({ children, variant = "default", className }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
        variantClasses[variant],
        className
      )}
    >
      {children}
    </span>
  );
}
