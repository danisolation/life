"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Heart } from "lucide-react";

interface LifeAdminScoreCardProps {
  score: number;
}

export function LifeAdminScoreCard({ score }: LifeAdminScoreCardProps) {
  const getScoreColor = (score: number) => {
    if (score >= 80) return "text-green-500";
    if (score >= 60) return "text-yellow-500";
    return "text-red-500";
  };

  const getScoreLabel = (score: number) => {
    if (score >= 80) return "Excellent";
    if (score >= 60) return "Good";
    if (score >= 40) return "Needs Attention";
    return "Critical";
  };

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Heart className="h-5 w-5" />
          Life Admin Health
        </CardTitle>
        <CardDescription>Your overall administrative wellness</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex items-end gap-2">
          <span className={`text-5xl font-bold ${getScoreColor(score)}`}>
            {score}
          </span>
          <span className="text-xl text-muted-foreground">/100</span>
        </div>
        <Progress value={score} className="mt-3" />
        <p className="mt-2 text-sm text-muted-foreground">
          Status: {getScoreLabel(score)}
        </p>
      </CardContent>
    </Card>
  );
}
