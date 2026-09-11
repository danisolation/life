"use client";

import { useState } from "react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { ENTITY_TYPE_CONFIG, type EntityType } from "@/types";
import { Network, List, Grid } from "lucide-react";

const entityTypes: EntityType[] = [
  "asset",
  "subscription",
  "warranty",
  "purchase",
  "receipt",
  "bill",
  "contract",
  "deadline",
  "task",
  "provider",
  "person",
  "document",
];

export function EntityTabs() {
  return (
    <Tabs defaultValue="all" className="w-full">
      <TabsList className="flex-wrap h-auto">
        <TabsTrigger value="all">All</TabsTrigger>
        {entityTypes.map((type) => {
          const config = ENTITY_TYPE_CONFIG[type];
          return (
            <TabsTrigger key={type} value={type} className="gap-1">
              <span>{config.icon}</span>
              <span className="hidden sm:inline">{config.label}</span>
            </TabsTrigger>
          );
        })}
      </TabsList>
    </Tabs>
  );
}
