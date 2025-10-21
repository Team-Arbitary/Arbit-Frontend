import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface StatusBadgeProps {
  status:
    | "Not started"
    | "Not Started"
    | "in-progress"
    | "pending"
    | "completed"
    | "Completed";
  className?: string;
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const statusConfig = {
    "Not started": {
      label: "Not Started",
      className: "bg-gray-100 text-gray-800 border-gray-300 dark:bg-gray-500/20 dark:text-gray-300 dark:border-gray-500/30",
    },
    "Not Started": {
      label: "Not Started",
      className: "bg-gray-100 text-gray-800 border-gray-300 dark:bg-gray-500/20 dark:text-gray-300 dark:border-gray-500/30",
    },
    "in-progress": {
      label: "In Progress",
      className: "bg-blue-100 text-blue-800 border-blue-300 dark:bg-blue-500/20 dark:text-blue-300 dark:border-blue-500/30",
    },
    pending: {
      label: "Pending",
      className: "bg-yellow-100 text-yellow-800 border-yellow-300 dark:bg-yellow-500/20 dark:text-yellow-300 dark:border-yellow-500/30",
    },
    completed: {
      label: "Completed",
      className: "bg-green-100 text-green-800 border-green-300 dark:bg-green-500/20 dark:text-green-300 dark:border-green-500/30",
    },
    Completed: {
      label: "Completed",
      className: "bg-green-100 text-green-800 border-green-300 dark:bg-green-500/20 dark:text-green-300 dark:border-green-500/30",
    },
  };

  const config = statusConfig[status];

  // Fallback if status is not found in config
  if (!config) {
    return (
      <Badge
        className={cn(
          "bg-gray-100 text-gray-800 border-gray-300 dark:bg-gray-500/20 dark:text-gray-300 dark:border-gray-500/30",
          className
        )}
      >
        {status}
      </Badge>
    );
  }

  return (
    <Badge className={cn(config.className, className)}>{config.label}</Badge>
  );
}
