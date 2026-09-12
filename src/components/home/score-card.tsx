"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { StatusBadge, type StatusTone } from "@/components/status-badge";
import { Heart } from "lucide-react";

interface LifeAdminScoreCardProps {
  score: number;
}

function scoreTone(score: number): { label: string; tone: StatusTone } {
  if (score >= 80) return { label: "Excellent", tone: "success" };
  if (score >= 60) return { label: "Good", tone: "info" };
  if (score >= 40) return { label: "Needs Attention", tone: "warning" };
  return { label: "Critical", tone: "danger" };
}

export function LifeAdminScoreCard({ score }: LifeAdminScoreCardProps) {
  const { label, tone } = scoreTone(score);

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Heart aria-hidden className="h-5 w-5" />
          Life Admin Health
        </CardTitle>
        <CardDescription>Your overall administrative wellness</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex items-end gap-2">
          <span className="text-5xl font-bold tabular-nums">{score}</span>
          <span className="text-xl text-muted-foreground">/100</span>
        </div>
        <Progress
          value={score}
          className="mt-3"
          aria-label={`Life admin health score: ${score} out of 100`}
        />
        <div className="mt-3">
          <StatusBadge tone={tone}>{label}</StatusBadge>
        </div>
      </CardContent>
    </Card>
  );
}
