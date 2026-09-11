import {
  pgTable,
  uuid,
  varchar,
  text,
  timestamp,
  jsonb,
  pgEnum,
  integer,
  boolean,
  index,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

// Enums
export const entityTypeEnum = pgEnum("entity_type", [
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
]);

export const relationTypeEnum = pgEnum("relation_type", [
  "HAS_WARRANTY",
  "HAS_RECEIPT",
  "PAID_BY",
  "PROVIDED_BY",
  "BELONGS_TO",
  "REMINDER_FOR",
  "DEPENDS_ON",
  "EXTENDS",
  "CANCELS",
]);

export const taskStatusEnum = pgEnum("task_status", [
  "pending",
  "in_progress",
  "completed",
  "cancelled",
]);

export const taskPriorityEnum = pgEnum("task_priority", [
  "low",
  "medium",
  "high",
  "urgent",
]);

export const reminderTypeEnum = pgEnum("reminder_type", [
  "deadline",
  "preparation",
  "follow_up",
  "custom",
]);

export const reminderStatusEnum = pgEnum("reminder_status", [
  "scheduled",
  "sent",
  "dismissed",
  "snoozed",
]);

export const memberRoleEnum = pgEnum("member_role", [
  "admin",
  "member",
  "viewer",
]);

// Core tables
export const households = pgTable("households", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  currency: varchar("currency", { length: 3 }).default("USD"),
  locale: varchar("locale", { length: 10 }).default("en-US"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const users = pgTable(
  "users",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    email: varchar("email", { length: 255 }).notNull(),
    name: varchar("name", { length: 255 }),
    passwordHash: text("password_hash"),
    image: text("image"),
    emailVerified: timestamp("email_verified"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => ({
    emailIdx: uniqueIndex("users_email_idx").on(table.email),
  })
);

export const householdMembers = pgTable(
  "household_members",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    householdId: uuid("household_id")
      .references(() => households.id, { onDelete: "cascade" })
      .notNull(),
    userId: uuid("user_id")
      .references(() => users.id, { onDelete: "cascade" })
      .notNull(),
    role: memberRoleEnum("role").default("member").notNull(),
    joinedAt: timestamp("joined_at").defaultNow().notNull(),
  },
  (table) => ({
    householdUserIdx: uniqueIndex("household_members_household_user_idx").on(
      table.householdId,
      table.userId
    ),
  })
);

// Life Admin Graph - Core entity table (polymorphic)
export const entities = pgTable(
  "entities",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    type: entityTypeEnum("type").notNull(),
    householdId: uuid("household_id")
      .references(() => households.id, { onDelete: "cascade" })
      .notNull(),
    name: varchar("name", { length: 500 }).notNull(),
    description: text("description"),
    attributes: jsonb("attributes").default({}).notNull(),
    createdBy: uuid("user_id").references(() => users.id),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
    archivedAt: timestamp("archived_at"),
  },
  (table) => ({
    typeIdx: index("entities_type_idx").on(table.type),
    householdIdx: index("entities_household_idx").on(table.householdId),
  })
);

// Entity relationships (the graph edges)
export const entityRelations = pgTable(
  "entity_relations",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    fromEntityId: uuid("from_entity_id")
      .references(() => entities.id, { onDelete: "cascade" })
      .notNull(),
    toEntityId: uuid("to_entity_id")
      .references(() => entities.id, { onDelete: "cascade" })
      .notNull(),
    relationType: relationTypeEnum("relation_type").notNull(),
    metadata: jsonb("metadata").default({}),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => ({
    fromIdx: index("entity_relations_from_idx").on(table.fromEntityId),
    toIdx: index("entity_relations_to_idx").on(table.toEntityId),
  })
);

// Documents (receipts, invoices, PDFs)
export const documents = pgTable(
  "documents",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    entityId: uuid("entity_id").references(() => entities.id, {
      onDelete: "set null",
    }),
    householdId: uuid("household_id")
      .references(() => households.id, { onDelete: "cascade" })
      .notNull(),
    uploadedBy: uuid("user_id").references(() => users.id),
    fileName: varchar("file_name", { length: 500 }).notNull(),
    fileUrl: text("file_url").notNull(),
    fileType: varchar("file_type", { length: 100 }).notNull(),
    fileSize: integer("file_size"),
    extractedData: jsonb("extracted_data").default({}),
    confidence: jsonb("confidence").default({}),
    status: varchar("status", { length: 50 }).default("pending").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => ({
    entityIdx: index("documents_entity_idx").on(table.entityId),
    householdIdx: index("documents_household_idx").on(table.householdId),
  })
);

// Tasks
export const tasks = pgTable(
  "tasks",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    entityId: uuid("entity_id").references(() => entities.id, {
      onDelete: "set null",
    }),
    householdId: uuid("household_id")
      .references(() => households.id, { onDelete: "cascade" })
      .notNull(),
    title: varchar("title", { length: 500 }).notNull(),
    description: text("description"),
    status: taskStatusEnum("status").default("pending").notNull(),
    priority: taskPriorityEnum("priority").default("medium").notNull(),
    dueDate: timestamp("due_date"),
    completedAt: timestamp("completed_at"),
    assigneeId: uuid("assignee_id").references(() => users.id),
    ownerId: uuid("owner_id").references(() => users.id),
    createdBy: uuid("created_by").references(() => users.id),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => ({
    entityIdx: index("tasks_entity_idx").on(table.entityId),
    householdIdx: index("tasks_household_idx").on(table.householdId),
    assigneeIdx: index("tasks_assignee_idx").on(table.assigneeId),
    statusIdx: index("tasks_status_idx").on(table.status),
  })
);

// Reminders
export const reminders = pgTable(
  "reminders",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    entityId: uuid("entity_id").references(() => entities.id, {
      onDelete: "cascade",
    }),
    taskId: uuid("task_id").references(() => tasks.id, {
      onDelete: "set null",
    }),
    householdId: uuid("household_id")
      .references(() => households.id, { onDelete: "cascade" })
      .notNull(),
    type: reminderTypeEnum("type").notNull(),
    title: varchar("title", { length: 500 }).notNull(),
    message: text("message"),
    triggerAt: timestamp("trigger_at").notNull(),
    status: reminderStatusEnum("status").default("scheduled").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => ({
    entityIdx: index("reminders_entity_idx").on(table.entityId),
    householdIdx: index("reminders_household_idx").on(table.householdId),
    triggerIdx: index("reminders_trigger_idx").on(table.triggerAt),
  })
);

// Audit logs
export const auditLogs = pgTable(
  "audit_logs",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    actor: varchar("actor", { length: 255 }).notNull(),
    action: varchar("action", { length: 255 }).notNull(),
    targetEntity: varchar("target_entity", { length: 255 }),
    targetType: varchar("target_type", { length: 100 }),
    reason: text("reason"),
    source: varchar("source", { length: 255 }),
    confidence: integer("confidence"),
    metadata: jsonb("metadata").default({}),
    householdId: uuid("household_id"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => ({
    actorIdx: index("audit_logs_actor_idx").on(table.actor),
    createdAtIdx: index("audit_logs_created_at_idx").on(table.createdAt),
  })
);

// AI conversations
export const aiConversations = pgTable(
  "ai_conversations",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id").references(() => users.id, {
      onDelete: "cascade",
    }),
    householdId: uuid("household_id")
      .references(() => households.id, { onDelete: "cascade" })
      .notNull(),
    title: varchar("title", { length: 255 }),
    messages: jsonb("messages").default([]).notNull(),
    context: jsonb("context").default({}),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => ({
    userIdx: index("ai_conversations_user_idx").on(table.userId),
    householdIdx: index("ai_conversations_household_idx").on(
      table.householdId
    ),
  })
);

// Relations
export const householdsRelations = relations(households, ({ many }) => ({
  members: many(householdMembers),
  entities: many(entities),
  documents: many(documents),
  tasks: many(tasks),
  reminders: many(reminders),
}));

export const usersRelations = relations(users, ({ many }) => ({
  householdMembers: many(householdMembers),
}));

export const householdMembersRelations = relations(
  householdMembers,
  ({ one }) => ({
    household: one(households, {
      fields: [householdMembers.householdId],
      references: [households.id],
    }),
    user: one(users, {
      fields: [householdMembers.userId],
      references: [users.id],
    }),
  })
);

export const entitiesRelations = relations(entities, ({ many }) => ({
  outgoingRelations: many(entityRelations, {
    relationName: "fromEntity",
  }),
  incomingRelations: many(entityRelations, {
    relationName: "toEntity",
  }),
  documents: many(documents),
  tasks: many(tasks),
  reminders: many(reminders),
}));

export const entityRelationsRelations = relations(
  entityRelations,
  ({ one }) => ({
    fromEntity: one(entities, {
      fields: [entityRelations.fromEntityId],
      references: [entities.id],
      relationName: "fromEntity",
    }),
    toEntity: one(entities, {
      fields: [entityRelations.toEntityId],
      references: [entities.id],
      relationName: "toEntity",
    }),
  })
);

export const documentsRelations = relations(documents, ({ one }) => ({
  entity: one(entities, {
    fields: [documents.entityId],
    references: [entities.id],
  }),
  household: one(households, {
    fields: [documents.householdId],
    references: [households.id],
  }),
}));

export const tasksRelations = relations(tasks, ({ one }) => ({
  entity: one(entities, {
    fields: [tasks.entityId],
    references: [entities.id],
  }),
  assignee: one(users, {
    fields: [tasks.assigneeId],
    references: [users.id],
  }),
  owner: one(users, {
    fields: [tasks.ownerId],
    references: [users.id],
  }),
}));

export const remindersRelations = relations(reminders, ({ one }) => ({
  entity: one(entities, {
    fields: [reminders.entityId],
    references: [entities.id],
  }),
  task: one(tasks, {
    fields: [reminders.taskId],
    references: [tasks.id],
  }),
}));

// Type exports
export type Household = typeof households.$inferSelect;
export type NewHousehold = typeof households.$inferInsert;
export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type HouseholdMember = typeof householdMembers.$inferSelect;
export type Entity = typeof entities.$inferSelect;
export type NewEntity = typeof entities.$inferInsert;
export type EntityRelation = typeof entityRelations.$inferSelect;
export type Document = typeof documents.$inferSelect;
export type NewDocument = typeof documents.$inferInsert;
export type Task = typeof tasks.$inferSelect;
export type NewTask = typeof tasks.$inferInsert;
export type Reminder = typeof reminders.$inferSelect;
export type NewReminder = typeof reminders.$inferInsert;
export type AuditLog = typeof auditLogs.$inferSelect;
export type AIConversation = typeof aiConversations.$inferSelect;
