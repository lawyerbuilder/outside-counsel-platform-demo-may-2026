import { cn } from "@/lib/utils";

type BadgeVariant = "default" | "teal" | "amber" | "red" | "gray" | "blue" | "green";

const variantClasses: Record<BadgeVariant, string> = {
  default: "bg-gray-100 text-gray-700",
  teal: "bg-teal-50 text-teal-700",
  amber: "bg-amber-50 text-amber-700",
  red: "bg-red-50 text-red-700",
  gray: "bg-gray-100 text-gray-600",
  blue: "bg-blue-50 text-blue-700",
  green: "bg-green-50 text-green-700",
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
