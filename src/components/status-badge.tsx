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

export function insightTone(severity: string): StatusTone {
  if (severity === "critical") return "danger";
  if (severity === "warning") return "warning";
  return "info";
}

export function budgetTone(tone: string): StatusTone {
  if (tone === "over") return "danger";
  if (tone === "warn") return "warning";
  return "success";
}
