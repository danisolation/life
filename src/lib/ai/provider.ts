// AI Provider Abstraction Layer
// This allows swapping between different LLM providers without changing business logic

export interface ExtractedField<T = unknown> {
  value: T;
  confidence: number;
  source: string;
}

export interface ExtractionResult {
  entityType: string;
  fields: Record<string, ExtractedField>;
  suggestedRelations?: Array<{
    targetType: string;
    relationType: string;
    confidence: number;
  }>;
  raw?: string;
}

export interface DocumentInput {
  type: "receipt" | "invoice" | "contract" | "warranty" | "bill" | "other";
  content: string;
  mimeType: string;
}

export interface Message {
  role: "user" | "assistant" | "system";
  content: string;
}

export interface ChatResponse {
  content: string;
  toolCalls?: Array<{
    name: string;
    arguments: Record<string, unknown>;
  }>;
}

export interface AIProvider {
  name: string;
  extract(document: DocumentInput): Promise<ExtractionResult>;
  chat(messages: Message[]): Promise<ChatResponse>;
  embed(text: string): Promise<number[]>;
}

// Mock provider for development and testing
export class MockProvider implements AIProvider {
  name = "mock";

  async extract(document: DocumentInput): Promise<ExtractionResult> {
    const expiry = new Date();
    expiry.setMonth(expiry.getMonth() + 18);

    // Simulate extraction with fixture data
    return {
      entityType: "purchase",
      fields: {
        merchant: { value: "Demo Store", confidence: 0.95, source: "mock" },
        amount: { value: 299.99, confidence: 0.98, source: "mock" },
        currency: { value: "USD", confidence: 0.99, source: "mock" },
        date: { value: new Date().toISOString().split("T")[0], confidence: 0.97, source: "mock" },
        product: { value: "Demo Product", confidence: 0.85, source: "mock" },
        warrantyPeriod: { value: "2 years", confidence: 0.72, source: "mock" },
        expiryDate: { value: expiry.toISOString().split("T")[0], confidence: 0.72, source: "mock" },
      },
      suggestedRelations: [
        { targetType: "warranty", relationType: "HAS_WARRANTY", confidence: 0.72 },
      ],
    };
  }

  async chat(messages: Message[]): Promise<ChatResponse> {
    const lastMessage = messages[messages.length - 1];
    return {
      content: `This is a mock response to: "${lastMessage?.content}". Connect a real AI provider to enable full functionality.`,
    };
  }

  async embed(text: string): Promise<number[]> {
    // Return a dummy embedding vector (in production, this would be 1536 dimensions for OpenAI)
    return Array(384).fill(0).map(() => Math.random() - 0.5);
  }
}

// Provider factory
export function createAIProvider(): AIProvider {
  const provider = process.env.AI_PROVIDER || "mock";

  switch (provider) {
    case "mock":
    default:
      return new MockProvider();
  }
}

// Singleton instance
let _provider: AIProvider | null = null;

export function getAIProvider(): AIProvider {
  if (!_provider) {
    _provider = createAIProvider();
  }
  return _provider;
}
