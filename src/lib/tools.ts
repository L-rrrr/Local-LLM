import type { ConversationMessage, LocationRecord, LocationSearchArgs } from '../types';
import type { OllamaToolCall, OllamaToolDefinition } from './ollama';
import { parseToolArguments } from './ollama';
import { locationSearch } from './locationSearch';

export const toolDefinitions: OllamaToolDefinition[] = [
  {
    type: 'function',
    function: {
      name: 'location_search',
      description: 'Search for places in Singapore and return map-ready location results.',
      parameters: {
        type: 'object',
        properties: {
          query: {
            type: 'string',
            description: 'The category or place type to search for, such as coffee shops or parks.',
          },
          near: {
            type: 'string',
            description: 'Optional nearby place or neighborhood to anchor the search.',
          },
          limit: {
            type: 'number',
            description: 'Optional result cap. Defaults to 8.',
          },
        },
        required: ['query'],
        additionalProperties: false,
      },
    },
  },
];

interface ToolExecutionResult {
  locations: LocationRecord[];
  summary: string;
  rawContent: string;
}

function toLocationSummary(locations: LocationRecord[], query: LocationSearchArgs): string {
  const names = locations.slice(0, 3).map((location) => location.name).filter(Boolean);
  const anchor = query.near ? ` near ${query.near}` : '';

  if (locations.length === 0) {
    return `I could not find any results for ${query.query}${anchor}.`;
  }

  const highlight = names.length > 0 ? ` Top matches: ${names.join(', ')}.` : '';

  return `Found ${locations.length} results for ${query.query}${anchor}.${highlight}`;
}

async function executeLocationSearch(toolCall: OllamaToolCall): Promise<ToolExecutionResult> {
  const parsed = parseToolArguments(toolCall.function.arguments) as Partial<LocationSearchArgs>;
  const query = String(parsed.query ?? '').trim();

  if (!query) {
    throw new Error('location_search requires a query argument.');
  }

  const result = await locationSearch({
    query,
    near: typeof parsed.near === 'string' ? parsed.near : undefined,
    limit: typeof parsed.limit === 'number' ? parsed.limit : undefined,
  });

  const summary = toLocationSummary(result.locations, {
    query,
    near: typeof parsed.near === 'string' ? parsed.near : undefined,
    limit: typeof parsed.limit === 'number' ? parsed.limit : undefined,
  });

  return {
    locations: result.locations,
    summary,
    rawContent: JSON.stringify(result.locations),
  };
}

export async function executeToolCall(toolCall: OllamaToolCall): Promise<ToolExecutionResult> {
  switch (toolCall.function.name) {
    case 'location_search':
      return executeLocationSearch(toolCall);
    default:
      throw new Error(`Unsupported tool: ${toolCall.function.name}`);
  }
}

export function createToolMessage(toolCall: OllamaToolCall, execution: ToolExecutionResult): ConversationMessage {
  return {
    id: crypto.randomUUID(),
    role: 'tool',
    content: execution.summary,
    toolName: toolCall.function.name,
    createdAt: new Date().toISOString(),
  };
}
