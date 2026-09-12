import type { ReactNode } from "react";
import { Badge } from "@/components/ui/badge";

export type StatusTone = "neutral" | "info" | "success" | "warning" | "danger";

const toneClasses: Record<StatusTone, string> = {
  neutral: "",
  info: "border-transparent bg-info-muted text-info-muted-foreground",
  success: "border-transparent bg-success-muted text-success-muted-foreground",
  warning: "border-transparent bg-warning-muted text-warning-muted-foreground",
  danger: "",
};

const toneVariants: Record<StatusTone, "secondary" | "destructive"> = {
  neutral: "secondary",
  info: "secondary",
  success: "secondary",
  warning: "secondary",
  danger: "destructive",
};

export function StatusBadge({
  tone,
  children,
  className,
}: {
  tone: StatusTone;
  children: ReactNode;
  className?: string;
}) {
  return (
    <Badge
      variant={toneVariants[tone]}
      className={`${toneClasses[tone]} ${className ?? ""}`.trim()}
    >
      {children}
    </Badge>
  );
}

export function urgencyTone(days: number): StatusTone {
  if (days < 0) return "danger";
  if (days <= 3) return "warning";
  if (days <= 7) return "info";
  return "neutral";
}

export function priorityTone(priority: string): StatusTone {
  switch (priority) {
    case "urgent":
      return "danger";
    case "high":
      return "warning";
    case "medium":
      return "info";
    case "low":
      return "neutral";
    default:
      return "neutral";
  }
}

export function documentTone(status: string): StatusTone {
  switch (status) {
    case "completed":
      return "success";
    case "failed":
      return "danger";
    case "processing":
      return "info";
    default:
      return "neutral";
  }
}

export function documentLabel(status: string): string {
  switch (status) {
    case "completed":
      return "Processed";
    case "failed":
      return "Failed";
    case "processing":
      return "Processing";
    case "attached":
      return "Attached";
    default:
      return "Pending";
  }
}

export function taskStatusTone(status: string): StatusTone {
  switch (status) {
    case "completed":
      return "success";
    case "cancelled":
      return "neutral";
    case "in_progress":
      return "info";
    default:
      return "neutral";
  }
}
