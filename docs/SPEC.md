# Life Admin OS — MVP Implementation Plan

## Overview

Build a web-first personal life operations system with a graph-based data model, AI-powered document extraction, and proactive deadline intelligence. Next.js + TypeScript full-stack with PostgreSQL.

**Core principle:** Zero-friction capture → AI understanding → Structured tracking → Proactive recommendations.

---

## Architecture

### Tech Stack

| Layer | Technology | Rationale |
|-------|-----------|-----------|
| Framework | Next.js 14 (App Router) | Full-stack React, API routes, server components |
| Language | TypeScript | Type safety across stack |
| Database | PostgreSQL + JSONB | Relational core + flexible entity attributes |
| ORM | Drizzle ORM | Type-safe SQL, migrations, JSONB support |
| Auth | NextAuth.js (v5) | Multi-tenant auth, session management |
| Styling | Tailwind CSS + shadcn/ui | Rapid UI development, accessible components |
| AI | Abstraction layer | Provider-agnostic, implement with Claude/OpenAI later |
| File Storage | Local (MVP) → S3 | Document/receipt uploads |
| Search | PostgreSQL full-text + pgvector | Semantic search ready |

### Project Structure

```
life-admin-os/
├── src/
│   ├── app/                      # Next.js App Router
│   │   ├── (auth)/              # Auth routes (login, register)
│   │   ├── (dashboard)/         # Protected app routes
│   │   │   ├── page.tsx         # Home — "What matters now"
│   │   │   ├── inbox/           # Life Admin Inbox
│   │   │   ├── life/            # Life Admin Graph browser
│   │   │   ├── tasks/           # Tasks & workflows
│   │   │   ├── ai/              # Natural language interface
│   │   │   └── settings/        # Permissions, household, integrations
│   │   ├── api/                 # API routes
│   │   │   ├── auth/[...nextauth]/
│   │   │   ├── inbox/           # Inbox upload & processing
│   │   │   ├── entities/        # CRUD for graph entities
│   │   │   ├── ai/              # AI agent endpoints
│   │   │   └── search/          # Semantic + structured search
│   │   └── layout.tsx
│   ├── lib/
│   │   ├── db/                  # Database
│   │   │   ├── schema.ts        # Drizzle schema (Life Admin Graph)
│   │   │   ├── index.ts         # DB client
│   │   │   └── migrations/
│   │   ├── ai/                  # AI abstraction layer
│   │   │   ├── provider.ts      # Provider interface
│   │   │   ├── capture-agent.ts # Document/receipt extraction
│   │   │   ├── understanding-agent.ts
│   │   │   ├── recommendation-agent.ts
│   │   │   └── orchestrator.ts
│   │   ├── auth.ts              # NextAuth config
│   │   ├── policy-engine.ts     # Permission enforcement
│   │   └── audit.ts             # Audit logging
│   ├── components/
│   │   ├── ui/                  # shadcn/ui components
│   │   ├── inbox/               # Inbox-specific components
│   │   ├── entities/            # Entity cards, forms, graphs
│   │   ├── ai/                  # Chat interface
│   │   └── layout/              # Navigation, sidebar
│   └── types/                   # Shared TypeScript types
├── drizzle/                     # Generated migrations
├── public/
└── tests/
```

---

## Database Schema (Life Admin Graph)

### Core Entity: Polymorphic Graph Nodes

The graph uses a unified `entities` table with typed relationships:

```typescript
// Core tables
entities          — id, type, household_id, attributes(JSONB), created_at, updated_at
entity_relations  — id, from_entity_id, to_entity_id, relation_type, metadata(JSONB)

// Supporting tables
households        — id, name, currency, locale
users             — id, email, name, household_id(memberships table for many-to-many)
household_members — id, household_id, user_id, role

// Domain tables (all reference entities)
documents         — id, entity_id, file_url, file_type, extracted_data(JSONB), confidence(JSONB)
tasks             — id, entity_id, title, status, priority, due_date, assignee_id, owner_id
reminders         — id, entity_id, trigger_at, type, message, status
audit_logs        — id, actor, action, target_entity_id, reason, source, confidence, metadata

// AI/Search
ai_conversations  — id, user_id, household_id, messages(JSONB), context
search_index      — entity_id, embedding(vector), text_search_vector
```

### Entity Types (MVP)

```
asset, subscription, warranty, purchase, receipt, bill,
contract, deadline, task, provider, person, document
```

### Relation Types (MVP)

```
HAS_WARRANTY, HAS_RECEIPT, PAID_BY, PROVIDED_BY, BELONGS_TO,
REMINDER_FOR, DEPENDS_ON, EXTENDS, CANCELS
```

---

## MVP Feature Implementation

### Phase 1: Foundation (Week 1-2)

**Goal:** Working app with auth, database, and basic navigation.

1. Initialize Next.js project with TypeScript, Tailwind, shadcn/ui
2. Set up Drizzle ORM + PostgreSQL schema
3. Implement NextAuth authentication (email + OAuth)
4. Create household/multi-tenant infrastructure
5. Build navigation shell: Home, Inbox, Life, Tasks, AI, Settings

### Phase 2: Life Admin Inbox (Week 2-3)

**Goal:** Upload documents and extract structured data.

1. File upload component (drag-drop, photo, PDF)
2. AI Capture Agent abstraction:
   - Provider interface for document extraction
   - Mock provider for development (returns fixture data)
   - Real provider wired later
3. Extraction result UI: show detected entities with confidence
4. User confirmation flow: confirm/edit before saving
5. Auto-create connected graph entities from confirmed extraction

### Phase 3: Life Admin Graph Browser (Week 3-4)

**Goal:** Browse and manage all life admin entities.

1. Entity list views by type (assets, subscriptions, warranties, etc.)
2. Entity detail pages showing:
   - Core attributes
   - Related entities (graph traversal)
   - Attached documents
   - Upcoming deadlines
3. Manual entity creation forms
4. Entity relationship visualization (simple tree/graph view)

### Phase 4: Deadline Engine (Week 4-5)

**Goal:** Proactive deadline tracking with preparation workflows.

1. Deadline computation from entity attributes
2. Auto-generated preparation tasks (e.g., "30 days before warranty expires → inspect product")
3. Reminder scheduling system
4. "What happens if I do nothing?" consequence explanations
5. Deadline calendar view

### Phase 5: AI Interface & Search (Week 5-6)

**Goal:** Natural language interaction with the Life Admin Graph.

1. Chat UI for AI conversations
2. Intent parser: natural language → structured queries
3. Graph query executor (search entities, filter, traverse relations)
4. Weekly Life Brief generator
5. Life Admin Health score computation

### Phase 6: Tasks & Workflows (Week 6-7)

**Goal:** Action-oriented task management.

1. Task creation, assignment, completion
2. Workflow templates (warranty claim, cancellation, renewal review)
3. Household responsibility assignment
4. Task prioritization (Impact × Urgency × Risk × Confidence)

---

## Key Technical Decisions

### 1. AI Provider Abstraction

```typescript
// lib/ai/provider.ts
interface AIProvider {
  extract(document: DocumentInput): Promise<ExtractionResult>;
  chat(messages: Message[]): Promise<ChatResponse>;
  embed(text: string): Promise<number[]>;
}
```

- `MockProvider` for development (fixture-based)
- `ClaudeProvider` or `OpenAIProvider` implementations
- Provider selected via environment variable

### 2. Policy Engine

```typescript
// lib/policy-engine.ts
enum AutonomyLevel { READ, INTERNAL_MUTATION, PREP_ACTION, EXTERNAL_ACTION, HIGH_IMPACT }

function canExecute(action: Action, context: Context): boolean {
  // Deterministic permission enforcement
  // Never trust LLM output for permissions
}
```

### 3. Confidence System

Every AI-extracted field stores:
```typescript
{
  value: unknown;
  confidence: number;  // 0-1
  source: string;      // "receipt.pdf", "user_confirmed"
}
```

Low-confidence fields trigger user confirmation UI.

### 4. Audit Trail

Every AI action writes to `audit_logs`:
- timestamp, actor, action, target, reason, source, confidence, result

### 5. Multi-tenancy

- Row-level security via `household_id` on all tables
- All queries scoped to user's household(s)
- Household membership with roles (admin, member, viewer)

---

## Security Considerations

- All routes protected by NextAuth session
- All API routes validate household scope
- File uploads validated (type, size, virus scan placeholder)
- Prompt injection defense: uploaded content never interpreted as system instructions
- Rate limiting on AI endpoints (placeholder for MVP)

---

## Testing Strategy

- Unit tests for policy engine, deadline calculations, graph traversal
- Integration tests for AI extraction pipeline
- E2E tests for critical flows (upload → extract → confirm → view)
- Component tests for UI using Testing Library

---

## Verification Plan

After implementation:

1. **Inbox Flow:** Upload a receipt PDF → see extracted entities → confirm → verify graph connections created
2. **Deadline Tracking:** Create a warranty → verify preparation tasks auto-generated
3. **Search:** "Show me subscriptions over $50" → verify correct results
4. **Household:** Invite member → verify shared entity visibility
5. **Audit:** Perform actions → verify audit log captures all details
6. **Mobile:** Test responsive layout on mobile viewport

---

## Immediate Next Steps

1. Initialize Next.js project with all dependencies
2. Create database schema in Drizzle
3. Build authentication flow
4. Create navigation shell and page layouts
5. Implement file upload + AI extraction stub
6. Build entity browser with graph relationships

This is a substantial build. I recommend tackling it phase by phase, starting with the foundation.
