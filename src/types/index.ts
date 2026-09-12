// Shared TypeScript types for Life Admin OS

import type { LucideIcon } from "lucide-react";
import {
  AlarmClock,
  Building2,
  CircleCheck,
  FileText,
  Package,
  Paperclip,
  ReceiptText,
  RefreshCw,
  ShieldCheck,
  ShoppingCart,
  User,
  Wallet,
} from "lucide-react";

export type EntityType =
  | "asset"
  | "subscription"
  | "warranty"
  | "purchase"
  | "receipt"
  | "bill"
  | "contract"
  | "deadline"
  | "task"
  | "provider"
  | "person"
  | "document";

export type RelationType =
  | "HAS_WARRANTY"
  | "HAS_RECEIPT"
  | "PAID_BY"
  | "PROVIDED_BY"
  | "BELONGS_TO"
  | "REMINDER_FOR"
  | "DEPENDS_ON"
  | "EXTENDS"
  | "CANCELS";

export interface HouseholdSettings {
  autoCreateRecords?: boolean;
  proactiveReminders?: boolean;
  externalActions?: boolean;
  weeklyBrief?: boolean;
  deadlineAlerts?: boolean;
}

export const DEFAULT_HOUSEHOLD_SETTINGS: Required<HouseholdSettings> = {
  autoCreateRecords: true,
  proactiveReminders: true,
  externalActions: false,
  weeklyBrief: true,
  deadlineAlerts: true,
};

export interface EntityAttributes {
  // Common optional attributes across entity types
  amount?: number;
  currency?: string;
  startDate?: string;
  endDate?: string;
  expiryDate?: string;
  purchaseDate?: string;
  merchant?: string;
  provider?: string;
  description?: string;
  notes?: string;
  url?: string;
  [key: string]: unknown;
}

export interface LifeAdminScore {
  overall: number;
  financialHygiene: number;
  deadlineHealth: number;
  warrantyCoverage: number;
  subscriptionHealth: number;
  documentOrganization: number;
  householdTasks: number;
}

export interface WeeklyBrief {
  recurringPaymentsTotal: number;
  deadlinesCount: number;
  warrantiesExpiring: number;
  lowUsageSubscriptions: number;
  potentialMonthlySavings: number;
  topPriority: string | null;
}

export interface SearchResult {
  entityId: string;
  entityType: EntityType;
  name: string;
  relevance: number;
  matchedOn: string[];
}

// Entity type display configuration
export const ENTITY_TYPE_CONFIG: Record<
  EntityType,
  { label: string; icon: LucideIcon; color: string }
> = {
  asset: { label: "Asset", icon: Package, color: "blue" },
  subscription: { label: "Subscription", icon: RefreshCw, color: "purple" },
  warranty: { label: "Warranty", icon: ShieldCheck, color: "green" },
  purchase: { label: "Purchase", icon: ShoppingCart, color: "orange" },
  receipt: { label: "Receipt", icon: ReceiptText, color: "yellow" },
  bill: { label: "Bill", icon: Wallet, color: "red" },
  contract: { label: "Contract", icon: FileText, color: "indigo" },
  deadline: { label: "Deadline", icon: AlarmClock, color: "pink" },
  task: { label: "Task", icon: CircleCheck, color: "teal" },
  provider: { label: "Provider", icon: Building2, color: "gray" },
  person: { label: "Person", icon: User, color: "cyan" },
  document: { label: "Document", icon: Paperclip, color: "slate" },
};
