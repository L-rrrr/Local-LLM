import type { FormEvent } from 'react';
import type { ConversationMessage } from '../types';

interface ChatPanelProps {
  messages: ConversationMessage[];
  isSending: boolean;
  onSend: (prompt: string) => Promise<void>;
}

function ChatBubble({ message }: { message: ConversationMessage }) {
  return (
    <article className={`chat-bubble chat-bubble--${message.role}`}>
      <div className="chat-bubble__meta">
        <span>{message.role}</span>
        {message.toolName ? <span>{message.toolName}</span> : null}
      </div>
      <p>{message.content}</p>
    </article>
  );
}

export function ChatPanel({ messages, isSending, onSend }: ChatPanelProps) {
  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const formData = new FormData(form);
    const prompt = String(formData.get('prompt') ?? '').trim();

    if (!prompt || isSending) {
      return;
    }

    form.reset();
    await onSend(prompt);
  }

  return (
    <aside className="chat-panel">
      <header className="chat-panel__header">
        <div>
          <p className="eyebrow">Local AI agent</p>
          <h1>Location intelligence for Singapore</h1>
        </div>
        <p className="chat-panel__status">{isSending ? 'Thinking locally…' : 'Ready'}</p>
      </header>

      <div className="chat-panel__messages" aria-live="polite">
        {messages.map((message) => (
          <ChatBubble key={message.id} message={message} />
        ))}
      </div>

      <form className="chat-panel__composer" onSubmit={handleSubmit}>
        <textarea
          name="prompt"
          rows={3}
          placeholder="Try: Find coffee shops near Tanjong Pagar"
          disabled={isSending}
        />
        <button type="submit" disabled={isSending}>
          {isSending ? 'Working…' : 'Ask'}
        </button>
      </form>
    </aside>
  );
}
