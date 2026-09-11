// Policy Engine - enforces permission boundaries for AI actions
// This is deterministic code, never relying on LLM for permission decisions

export enum AutonomyLevel {
  READ = 0,           // Inspect data, search, analyze, summarize
  INTERNAL_MUTATION = 1,  // Create/update records, create reminders
  PREP_ACTION = 2,    // Draft emails, prepare claims
  EXTERNAL_ACTION = 3, // Send emails, cancel subscriptions
  HIGH_IMPACT = 4,    // Financial transfers, purchases, legal actions
}

export interface ActionContext {
  userId: string;
  householdId: string;
  userRole: "admin" | "member" | "viewer";
  actionLevel: AutonomyLevel;
  isExternal: boolean;
  isReversible: boolean;
  requiresConfirmation: boolean;
}

export interface PolicyResult {
  allowed: boolean;
  reason: string;
  requiresUserConfirmation: boolean;
}

const ROLE_MAX_LEVEL: Record<string, AutonomyLevel> = {
  admin: AutonomyLevel.EXTERNAL_ACTION,
  member: AutonomyLevel.PREP_ACTION,
  viewer: AutonomyLevel.READ,
};

export function canExecuteAction(context: ActionContext): PolicyResult {
  // Check role-based maximum autonomy level
  const maxLevel = ROLE_MAX_LEVEL[context.userRole] ?? AutonomyLevel.READ;

  if (context.actionLevel > maxLevel) {
    return {
      allowed: false,
      reason: `Role '${context.userRole}' cannot perform actions at level ${context.actionLevel}`,
      requiresUserConfirmation: false,
    };
  }

  // High-impact actions always require explicit confirmation
  if (context.actionLevel === AutonomyLevel.HIGH_IMPACT) {
    return {
      allowed: true,
      reason: "High-impact action requires explicit user confirmation",
      requiresUserConfirmation: true,
    };
  }

  // External actions require confirmation unless explicitly authorized
  if (context.isExternal && context.requiresConfirmation) {
    return {
      allowed: true,
      reason: "External action requires user confirmation",
      requiresUserConfirmation: true,
    };
  }

  // Irreversible actions require confirmation
  if (!context.isReversible && context.actionLevel >= AutonomyLevel.EXTERNAL_ACTION) {
    return {
      allowed: true,
      reason: "Irreversible action requires confirmation",
      requiresUserConfirmation: true,
    };
  }

  return {
    allowed: true,
    reason: "Action permitted",
    requiresUserConfirmation: false,
  };
}

export function canAccessEntity(
  userHouseholdId: string,
  entityHouseholdId: string
): boolean {
  return userHouseholdId === entityHouseholdId;
}
