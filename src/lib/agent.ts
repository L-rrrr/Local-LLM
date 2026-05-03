import type { ConversationMessage, LocationRecord } from '../types';
import { chatWithOllama, SYSTEM_PROMPT, toOllamaMessages } from './ollama';
import { createToolMessage, executeToolCall, toolDefinitions } from './tools';

const MAX_TOOL_STEPS = 3;

export interface AgentTurnResult {
  messages: ConversationMessage[];
  locations: LocationRecord[];
}

function toAssistantMessage(content: string): ConversationMessage {
  return {
    id: crypto.randomUUID(),
    role: 'assistant',
    content,
    createdAt: new Date().toISOString(),
  };
}

function toSystemMessage(): { role: 'system'; content: string } {
  return {
    role: 'system',
    content: SYSTEM_PROMPT,
  };
}

export async function runAgentTurn(conversation: ConversationMessage[]): Promise<AgentTurnResult> {
  const modelMessages = [toSystemMessage(), ...toOllamaMessages(conversation)];
  const visibleMessages: ConversationMessage[] = [];
  const collectedLocations: LocationRecord[] = [];

  for (let step = 0; step < MAX_TOOL_STEPS; step += 1) {
    const response = await chatWithOllama(modelMessages, toolDefinitions);
    const assistantContent = response.message.content.trim();
    const toolCalls = response.message.tool_calls ?? [];

    if (assistantContent) {
      visibleMessages.push(toAssistantMessage(assistantContent));
    }

    modelMessages.push({
      role: 'assistant',
      content: assistantContent,
      tool_calls: toolCalls,
    });

    if (toolCalls.length === 0) {
      break;
    }

    for (const toolCall of toolCalls) {
      const execution = await executeToolCall(toolCall);
      collectedLocations.splice(0, collectedLocations.length, ...execution.locations);
      visibleMessages.push(createToolMessage(toolCall, execution));
      modelMessages.push({
        role: 'tool',
        content: execution.rawContent,
        tool_call_id: toolCall.id,
        name: toolCall.function.name,
      });
    }
  }

  if (visibleMessages.length === 0) {
    visibleMessages.push(toAssistantMessage('I did not receive a response from the model.'));
  }

  return {
    messages: visibleMessages,
    locations: collectedLocations,
  };
}
