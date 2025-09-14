import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface StatusBadgeProps {
  status: "Not started" | "in-progress" | "pending" | "completed" | "Completed";
  className?: string;
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const statusConfig = {
    "Not started": {
      label: "Not Started",
      className: "bg-muted text-muted-foreground",
    },
    "in-progress": {
      label: "In Progress",
      className: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300",
    },
    pending: {
      label: "Pending",
      className: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300",
    },
    completed: {
      label: "Completed",
      className: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300",
    },
    "Completed": {
      label: "Completed",
      className: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300",
    },
  };

  const config = statusConfig[status];

  // Fallback if status is not found in config
  if (!config) {
    return (
      <Badge className={cn("bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300", className)}>
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