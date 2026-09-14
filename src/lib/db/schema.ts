import {
  bigint,
  date,
  index,
  integer,
  pgEnum,
  pgTable,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";

export const categoryKindEnum = pgEnum("category_kind", ["income", "expense"]);

export const recurringFrequencyEnum = pgEnum("recurring_frequency", ["monthly", "weekly"]);

export const users = pgTable(
  "users",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    email: varchar("email", { length: 255 }).notNull(),
    name: varchar("name", { length: 100 }).notNull(),
    passwordHash: varchar("password_hash", { length: 255 }).notNull(),
    currency: varchar("currency", { length: 3 }).notNull().default("VND"),
    locale: varchar("locale", { length: 10 }).notNull().default("vi-VN"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [uniqueIndex("users_email_idx").on(table.email)]
);

export const categories = pgTable(
  "categories",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .references(() => users.id, { onDelete: "cascade" })
      .notNull(),
    name: varchar("name", { length: 50 }).notNull(),
    kind: categoryKindEnum("kind").notNull(),
    color: varchar("color", { length: 7 }).notNull().default("#64748b"),
    sortOrder: integer("sort_order").notNull().default(0),
    archivedAt: timestamp("archived_at"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [
    index("categories_user_idx").on(table.userId, table.kind),
    uniqueIndex("categories_user_kind_name_idx").on(table.userId, table.kind, table.name),
  ]
);

export const transactions = pgTable(
  "transactions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .references(() => users.id, { onDelete: "cascade" })
      .notNull(),
    kind: categoryKindEnum("kind").notNull(),
    categoryId: uuid("category_id").references(() => categories.id, { onDelete: "set null" }),
    recurringId: uuid("recurring_id").references(() => recurringRules.id, { onDelete: "set null" }),
    amountMinor: bigint("amount_minor", { mode: "number" }).notNull(),
    currency: varchar("currency", { length: 3 }).notNull(),
    occurredOn: date("occurred_on", { mode: "string" }).notNull(),
    note: varchar("note", { length: 500 }),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [
    index("transactions_user_date_idx").on(table.userId, table.occurredOn),
    index("transactions_user_category_idx").on(table.userId, table.categoryId),
    uniqueIndex("transactions_recurring_occurrence_idx").on(
      table.userId,
      table.recurringId,
      table.occurredOn
    ),
  ]
);

export const recurringRules = pgTable(
  "recurring_rules",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .references(() => users.id, { onDelete: "cascade" })
      .notNull(),
    name: varchar("name", { length: 100 }).notNull(),
    kind: categoryKindEnum("kind").notNull(),
    categoryId: uuid("category_id").references(() => categories.id, { onDelete: "set null" }),
    amountMinor: bigint("amount_minor", { mode: "number" }).notNull(),
    currency: varchar("currency", { length: 3 }).notNull(),
    frequency: recurringFrequencyEnum("frequency").notNull(),
    dayOfMonth: integer("day_of_month"),
    weekday: integer("weekday"),
    startsOn: date("starts_on", { mode: "string" }).notNull(),
    lastGeneratedOn: date("last_generated_on", { mode: "string" }),
    archivedAt: timestamp("archived_at"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [index("recurring_rules_user_idx").on(table.userId, table.archivedAt)]
);

export const budgets = pgTable(
  "budgets",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .references(() => users.id, { onDelete: "cascade" })
      .notNull(),
    categoryId: uuid("category_id")
      .references(() => categories.id, { onDelete: "cascade" })
      .notNull(),
    month: date("month", { mode: "string" }).notNull(),
    amountMinor: bigint("amount_minor", { mode: "number" }).notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [uniqueIndex("budgets_user_category_month_idx").on(table.userId, table.categoryId, table.month)]
);

export type User = typeof users.$inferSelect;
export type Category = typeof categories.$inferSelect;
export type Transaction = typeof transactions.$inferSelect;
export type Budget = typeof budgets.$inferSelect;
export type RecurringRule = typeof recurringRules.$inferSelect;
export type CategoryKind = Category["kind"];
