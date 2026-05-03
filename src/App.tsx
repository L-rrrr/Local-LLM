import { useEffect, useMemo, useState } from 'react';
import { ChatPanel } from './components/ChatPanel';
import { MapPanel } from './components/MapPanel';
import type { ConversationMessage, GeoJsonFeatureCollection, LocationRecord } from './types';
import { runAgentTurn } from './lib/agent';
import { checkOllamaHealth } from './lib/ollama';

const initialMessages: ConversationMessage[] = [
  {
    id: crypto.randomUUID(),
    role: 'assistant',
    content: 'Ask me about coffee shops, parks, ramen, or any place type in Singapore and I will search locally.',
    createdAt: new Date().toISOString(),
  },
];

const emptyFeatureCollection: GeoJsonFeatureCollection = {
  type: 'FeatureCollection',
  features: [],
};

export default function App() {
  const [messages, setMessages] = useState<ConversationMessage[]>(initialMessages);
  const [locations, setLocations] = useState<LocationRecord[]>([]);
  const [featureCollection, setFeatureCollection] = useState<GeoJsonFeatureCollection>(emptyFeatureCollection);
  const [selectedLocationId, setSelectedLocationId] = useState<string | null>(null);
  const [isSending, setIsSending] = useState(false);
  const [ollamaError, setOllamaError] = useState<string | null>(null);

  useEffect(() => {
    async function verifyOllama() {
      const health = await checkOllamaHealth();
      if (!health.accessible || !health.modelAvailable) {
        setOllamaError(health.error || 'Ollama is not available');
        setMessages((current) => [
          ...current,
          {
            id: crypto.randomUUID(),
            role: 'assistant',
            content: `⚠️ Ollama Setup Issue: ${health.error}`,
            createdAt: new Date().toISOString(),
          },
        ]);
      }
    }

    verifyOllama();
  }, []);

  const canClearSelection = useMemo(() => locations.length > 0, [locations.length]);

  async function handleSend(prompt: string) {
    if (ollamaError) {
      setMessages((current) => [
        ...current,
        {
          id: crypto.randomUUID(),
          role: 'assistant',
          content: `Cannot process request: ${ollamaError}`,
          createdAt: new Date().toISOString(),
        },
      ]);
      return;
    }

    const userMessage: ConversationMessage = {
      id: crypto.randomUUID(),
      role: 'user',
      content: prompt,
      createdAt: new Date().toISOString(),
    };

    const nextMessages = [...messages, userMessage];
    setMessages(nextMessages);
    setIsSending(true);

    try {
      const result = await runAgentTurn(nextMessages);
      setMessages((currentMessages) => [...currentMessages, ...result.messages]);
      setLocations(result.locations);
      setFeatureCollection({
        type: 'FeatureCollection',
        features: result.locations.map((location) => ({
          type: 'Feature',
          id: location.id,
          geometry: location.geometry,
          properties: {
            id: location.id,
            name: location.name,
            displayName: location.displayName,
            category: location.category,
            summary: location.summary,
          },
        })),
      });
      setSelectedLocationId(result.locations[0]?.id ?? null);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Something went wrong while running the agent.';
      setMessages((currentMessages) => [
        ...currentMessages,
        {
          id: crypto.randomUUID(),
          role: 'assistant',
          content: `I could not complete that request: ${message}`,
          createdAt: new Date().toISOString(),
        },
      ]);
    } finally {
      setIsSending(false);
    }
  }

  return (
    <div className="app-shell">
      <MapPanel
        locations={locations}
        featureCollection={featureCollection}
        selectedLocationId={selectedLocationId}
        onSelectLocation={(locationId) => {
          if (locationId || canClearSelection) {
            setSelectedLocationId(locationId);
          }
        }}
      />
      <ChatPanel messages={messages} isSending={isSending} onSend={handleSend} />
    </div>
  );
}
