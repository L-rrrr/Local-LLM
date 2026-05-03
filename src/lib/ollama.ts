import type { ConversationMessage } from '../types';

export const OLLAMA_MODEL = 'qwen2.5:7b';
export const OLLAMA_BASE_URL = 'http://localhost:11434';

export interface OllamaToolParameterSchema {
  type: 'object';
  properties: Record<string, unknown>;
  required?: string[];
  additionalProperties?: boolean;
}

export interface OllamaToolDefinition {
  type: 'function';
  function: {
    name: string;
    description: string;
    parameters: OllamaToolParameterSchema;
  };
}

export interface OllamaToolCall {
  id?: string;
  type: 'function';
  function: {
    name: string;
    arguments: string | Record<string, unknown>;
  };
}

export interface OllamaChatMessage {
  role: 'system' | 'user' | 'assistant' | 'tool';
  content: string;
  tool_calls?: OllamaToolCall[];
  tool_call_id?: string;
  name?: string;
}

export interface OllamaChatResponse {
  model: string;
  created_at: string;
  message: OllamaChatMessage;
  done: boolean;
}

export const SYSTEM_PROMPT = [
  'You are a local-first location intelligence agent for Singapore.',
  'Answer clearly and concisely.',
  'Use the location_search tool when the user wants places, categories, or a map-ready search result.',
  'If a tool is needed, call it instead of guessing.',
  'When tool results arrive, summarize them and mention the most relevant places.',
  'Keep the response useful for a desktop chat and map experience.',
].join(' ');

export function toOllamaMessages(messages: ConversationMessage[]): OllamaChatMessage[] {
  return messages.map((message) => ({
    role: message.role,
    content: message.content,
    name: message.toolName,
  }));
}

export function parseToolArguments(argumentsValue: string | Record<string, unknown>): Record<string, unknown> {
  if (typeof argumentsValue === 'string') {
    const trimmed = argumentsValue.trim();

    if (!trimmed) {
      return {};
    }

    return JSON.parse(trimmed) as Record<string, unknown>;
  }

  return argumentsValue;
}

export async function checkOllamaHealth(): Promise<{ accessible: boolean; modelAvailable: boolean; error?: string }> {
  try {
    // Check if Ollama is accessible
    const healthResponse = await fetch(`${OLLAMA_BASE_URL}/api/tags`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    });

    if (!healthResponse.ok) {
      return {
        accessible: false,
        modelAvailable: false,
        error: `Ollama server returned status ${healthResponse.status}. Is Ollama running? Try 'ollama serve' in a terminal.`,
      };
    }

    const tagsData = (await healthResponse.json()) as { models?: Array<{ name: string }> };
    const modelAvailable = tagsData.models?.some((m) => m.name.includes(OLLAMA_MODEL)) ?? false;

    if (!modelAvailable) {
      return {
        accessible: true,
        modelAvailable: false,
        error: `Model '${OLLAMA_MODEL}' is not pulled. Run: ollama pull ${OLLAMA_MODEL}`,
      };
    }

    return { accessible: true, modelAvailable: true };
  } catch (error) {
    return {
      accessible: false,
      modelAvailable: false,
      error: `Cannot reach Ollama at ${OLLAMA_BASE_URL}. Make sure Ollama is running: 'ollama serve'`,
    };
  }
}

function mapOllamaError(status: number, errorText: string): string {
  if (status === 500 && /requires more system memory/i.test(errorText)) {
    return [
      'Ollama could not load the model due to low memory.',
      `Use a smaller model and pull it first: ollama pull ${OLLAMA_MODEL}`,
      'Then restart the app and try again.',
    ].join(' ');
  }

  return `Ollama request failed with status ${status}: ${errorText}`;
}

export async function chatWithOllama(messages: OllamaChatMessage[], tools: OllamaToolDefinition[]): Promise<OllamaChatResponse> {
  // Pre-flight check
  const health = await checkOllamaHealth();
  if (!health.accessible || !health.modelAvailable) {
    throw new Error(health.error || 'Ollama is not properly configured');
  }

  const response = await fetch(`${OLLAMA_BASE_URL}/api/chat`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: OLLAMA_MODEL,
      messages,
      tools,
      stream: false,
      options: {
        temperature: 0.2,
      },
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(mapOllamaError(response.status, errorText));
  }

  return (await response.json()) as OllamaChatResponse;
}
