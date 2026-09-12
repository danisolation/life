"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CreditCard, Shield, Clock, AlertCircle } from "lucide-react";

interface QuickStatsProps {
  subscriptionsCount: number;
  warrantiesCount: number;
  upcomingCount: number;
  tasksCount: number;
}

export function QuickStats({
  subscriptionsCount,
  warrantiesCount,
  upcomingCount,
  tasksCount,
}: QuickStatsProps) {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Subscriptions</CardTitle>
          <CreditCard aria-hidden className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold tabular-nums">{subscriptionsCount}</div>
          <p className="text-xs text-muted-foreground">Active subscriptions</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Warranties</CardTitle>
          <Shield aria-hidden className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold tabular-nums">{warrantiesCount}</div>
          <p className="text-xs text-muted-foreground">Tracked warranties</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Upcoming</CardTitle>
          <Clock aria-hidden className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold tabular-nums">{upcomingCount}</div>
          <p className="text-xs text-muted-foreground">Deadlines this month</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Tasks</CardTitle>
          <AlertCircle aria-hidden className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold tabular-nums">{tasksCount}</div>
          <p className="text-xs text-muted-foreground">Pending tasks</p>
        </CardContent>
      </Card>
    </div>
  );
}
