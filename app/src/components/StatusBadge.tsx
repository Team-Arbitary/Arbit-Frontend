import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface StatusBadgeProps {
  status: "Not started" | "Not Started" | "in-progress" | "pending" | "completed" | "Completed";
  className?: string;
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const statusConfig = {
    "Not started": {
      label: "Not Started",
      className: "bg-gray-500/20 text-gray-300 border border-gray-500/30",
    },
    "Not Started": {
      label: "Not Started",
      className: "bg-gray-500/20 text-gray-300 border border-gray-500/30",
    },
    "in-progress": {
      label: "In Progress",
      className: "bg-blue-500/20 text-blue-300 border border-blue-500/30",
    },
    pending: {
      label: "Pending",
      className: "bg-yellow-500/20 text-yellow-300 border border-yellow-500/30",
    },
    completed: {
      label: "Completed",
      className: "bg-green-500/20 text-green-300 border border-green-500/30",
    },
    "Completed": {
      label: "Completed",
      className: "bg-green-500/20 text-green-300 border border-green-500/30",
    },
  };

  const config = statusConfig[status];

  // Fallback if status is not found in config
  if (!config) {
    return (
      <Badge className={cn("bg-gray-500/20 text-gray-300 border border-gray-500/30", className)}>
        {status}
      </Badge>
    );
  }

  return (
    <Badge className={cn(config.className, className)}>
      {config.label}
    </Badge>
  );
}