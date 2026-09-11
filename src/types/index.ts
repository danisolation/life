// Shared TypeScript types for Life Admin OS

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
  { label: string; icon: string; color: string }
> = {
  asset: { label: "Asset", icon: "📦", color: "blue" },
  subscription: { label: "Subscription", icon: "🔄", color: "purple" },
  warranty: { label: "Warranty", icon: "🛡️", color: "green" },
  purchase: { label: "Purchase", icon: "🛒", color: "orange" },
  receipt: { label: "Receipt", icon: "🧾", color: "yellow" },
  bill: { label: "Bill", icon: "💰", color: "red" },
  contract: { label: "Contract", icon: "📄", color: "indigo" },
  deadline: { label: "Deadline", icon: "⏰", color: "pink" },
  task: { label: "Task", icon: "✅", color: "teal" },
  provider: { label: "Provider", icon: "🏢", color: "gray" },
  person: { label: "Person", icon: "👤", color: "cyan" },
  document: { label: "Document", icon: "📎", color: "slate" },
};
