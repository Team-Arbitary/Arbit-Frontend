import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface StatusBadgeProps {
  status: "in-progress" | "pending" | "completed";
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
      className: "bg-success text-success-foreground",
    },
    pending: {
      label: "Pending",
      className: "bg-pending text-pending-foreground",
    },
    completed: {
      label: "Completed",
      className: "bg-primary text-primary-foreground",
    },
  };

  const config = statusConfig[status];

  return (
    <Badge className={cn(config.className, className)}>
      {config.label}
    </Badge>
  );
}