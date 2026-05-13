import type { LucideIcon } from "lucide-react";

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  action?: React.ReactNode;
}

export function EmptyState({ icon: Icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-gray-300 bg-white px-6 py-12 text-center">
      <Icon className="mb-4 h-10 w-10 text-gray-400" />
      <h3 className="mb-1 text-sm font-semibold text-gray-900">{title}</h3>
      <p className="mb-4 max-w-sm text-sm text-gray-500">{description}</p>
      {action}
    </div>
  );
}
