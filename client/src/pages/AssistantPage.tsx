import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import {
  ArrowRight,
  Bot,
  BrainCircuit,
  Compass,
  CornerDownLeft,
  FlaskConical,
  Globe2,
  Send,
  Sparkles,
  Trash2,
  User
} from 'lucide-react';

import { PRODUCT, SUGGESTIONS, type ChatResponse } from '@cyberscape/shared';

import { useToast } from '../components/Toast';
import { Panel } from '../components/ui';
import { apiPost } from '../lib/api';
import { cx } from '../lib/format';
import { useAppStore } from '../store/appStore';

interface ChatAction {
  type: 'focus_entity' | 'open_page' | 'run_simulation' | 'answer';
  label: string;
  params: Record<string, unknown>;
}

interface Message {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  actions?: ChatAction[];
  metadata?: ChatResponse['metadata'];
}

const WELCOME = PRODUCT.assistantWelcome;

const PAGE_PATHS: Record<string, string> = {
  catalog: '/catalog',
  simulator: '/simulator',
  settings: '/settings',
  overview: '/',
  assistant: '/assistant'
};

function paramString(params: Record<string, unknown>, key: string): string | undefined {
  const value = params[key];
  return typeof value === 'string' ? value : undefined;
}

export function AssistantPage() {
  const navigate = useNavigate();
  const { addToast } = useToast();
  const setSimulationPrefill = useAppStore((state) => state.setSimulationPrefill);
  const [messages, setMessages] = useState<Message[]>([
    { id: 'welcome', role: 'assistant', text: WELCOME }
  ]);
  const [input, setInput] = useState('');
  const [conversationId, setConversationId] = useState<string | undefined>();
  const scroller = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const chat = useMutation({
    mutationFn: (message: string) =>
      apiPost<ChatResponse>('/ai/chat', {
        message,
        conversationId,
        model: PRODUCT.assistantModel
      }),
    onSuccess: (data) => {
      setConversationId(data.conversationId);
      setMessages((current) => [
        ...current,
        {
          id: `assistant-${data.conversationId}-${current.length}`,
          role: 'assistant',
          text: data.message,
          actions: data.actions as ChatAction[],
          metadata: data.metadata
        }
      ]);
    },
    onError: (error: Error) => {
      addToast({ type: 'error', title: `${PRODUCT.assistantNameTitle} unavailable`, message: error.message });
      setMessages((current) => [
        ...current,
        {
          id: `error-${current.length}`,
          role: 'assistant',
          text: `I could not reach the ${PRODUCT.assistantName} service. Check that the API is running, then try again.`
        }
      ]);
    }
  });

  useEffect(() => {
    if (scroller.current) {
      scroller.current.scrollTop = scroller.current.scrollHeight;
    }
  }, [messages, chat.isPending]);

  const lastMetadata = useMemo(() => {
    for (let index = messages.length - 1; index >= 0; index -= 1) {
      const metadata = messages[index]?.metadata;
      if (metadata) return metadata;
    }
    return null;
  }, [messages]);

  function send(text: string) {
    const message = text.trim();
    if (!message || chat.isPending) return;
    setMessages((current) => [
      ...current,
      { id: `user-${current.length}-${Date.now()}`, role: 'user', text: message }
    ]);
    setInput('');
    chat.mutate(message);
  }

  function runAction(action: ChatAction) {
    if (action.type === 'run_simulation') {
      const actionId = paramString(action.params, 'action');
      const targetId = paramString(action.params, 'targetId');
      setSimulationPrefill({ action: actionId, targetId });
      navigate('/simulator');
      return;
    }

    if (action.type === 'focus_entity') {
      const entityId = paramString(action.params, 'entityId');
      if (entityId) navigate(`/catalog?entity=${encodeURIComponent(entityId)}`);
      return;
    }

    const page = paramString(action.params, 'page');
    if (page) {
      const base = PAGE_PATHS[page] ?? '/catalog';
      const query = new URLSearchParams();
      const category = paramString(action.params, 'category');
      const sort = paramString(action.params, 'sort');
      const actionId = paramString(action.params, 'action');
      const targetId = paramString(action.params, 'targetId');
      if (category) query.set('category', category);
      if (sort) query.set('sort', sort);
      if (actionId) query.set('action', actionId);
      if (targetId) query.set('target', targetId);
      navigate(query.toString() ? `${base}?${query.toString()}` : base);
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-brand-300">{PRODUCT.assistantNameTitle}</p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight text-ink sm:text-3xl">Talk to the determinism engine</h1>
          <p className="mt-1.5 max-w-2xl text-sm text-ink-muted">
            Intent-aware, grounded in the live catalogue. The assistant never invents an entry — it queries the same
            typed engine that serves the API and can queue an intervention for you.
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            setMessages([{ id: 'welcome', role: 'assistant', text: WELCOME }]);
            setConversationId(undefined);
            inputRef.current?.focus();
          }}
          className="btn text-xs"
        >
          <Trash2 className="h-3.5 w-3.5" />
          New conversation
        </button>
      </div>

      <div className="grid gap-5 xl:grid-cols-[1.35fr_0.65fr]">
        <section className="card flex min-h-[620px] flex-col overflow-hidden">
          <div className="flex items-center justify-between border-b border-line px-4 py-3">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-brand-400 to-teal-600">
                <Bot className="h-4 w-4 text-[#04140d]" />
              </div>
              <div>
                <p className="text-xs font-semibold text-ink">{PRODUCT.assistantNameTitle}</p>
                <p className="text-[10px] text-ink-faint">grounded · deterministic · {PRODUCT.assistantModel}</p>
              </div>
            </div>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-400/25 bg-emerald-400/5 px-2 py-1 text-[10px] font-semibold text-emerald-200">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
              online
            </span>
          </div>

          <div ref={scroller} className="min-h-0 flex-1 space-y-4 overflow-y-auto px-4 py-4" aria-live="polite">
            {messages.map((message) => (
              <div key={message.id} className={cx('flex gap-2.5', message.role === 'user' ? 'flex-row-reverse' : '')}>
                <div
                  className={cx(
                    'mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border',
                    message.role === 'user'
                      ? 'border-line bg-white/5 text-ink-muted'
                      : 'border-brand-400/30 bg-brand-400/10 text-brand-300'
                  )}
                >
                  {message.role === 'user' ? <User className="h-3.5 w-3.5" /> : <Sparkles className="h-3.5 w-3.5" />}
                </div>
                <div className={cx('max-w-[82%] min-w-0', message.role === 'user' && 'text-right')}>
                  <div
                    className={cx(
                      'inline-block rounded-2xl border px-3.5 py-2.5 text-left text-sm leading-relaxed',
                      message.role === 'user'
                        ? 'border-brand-400/25 bg-brand-500/10 text-ink'
                        : 'border-line bg-surface-sunken/70 text-ink-muted'
                    )}
                  >
                    {message.text}
                  </div>

                  {message.actions && message.actions.length > 0 ? (
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {message.actions.map((action, index) => (
                        <button
                          key={`${message.id}-action-${index}`}
                          type="button"
                          onClick={() => runAction(action)}
                          className="inline-flex items-center gap-1.5 rounded-lg border border-brand-400/30 bg-brand-400/5 px-2.5 py-1.5 text-[11px] font-semibold text-brand-200 transition-colors hover:bg-brand-400/10"
                        >
                          {action.type === 'run_simulation' ? (
                            <FlaskConical className="h-3 w-3" />
                          ) : action.type === 'focus_entity' ? (
                            <Globe2 className="h-3 w-3" />
                          ) : (
                            <Compass className="h-3 w-3" />
                          )}
                          {action.label}
                          <ArrowRight className="h-3 w-3" />
                        </button>
                      ))}
                    </div>
                  ) : null}

                  {message.metadata ? (
                    <p className="mt-1.5 text-[10px] text-ink-faint">
                      {message.metadata.model} · {message.metadata.tokensUsed} tokens · {message.metadata.latencyMs}ms
                    </p>
                  ) : null}
                </div>
              </div>
            ))}

            {chat.isPending ? (
              <div className="flex items-center gap-2.5">
                <div className="flex h-7 w-7 items-center justify-center rounded-lg border border-brand-400/30 bg-brand-400/10 text-brand-300">
                  <Sparkles className="h-3.5 w-3.5" />
                </div>
                <div className="inline-flex items-center gap-1 rounded-2xl border border-line bg-surface-sunken/70 px-3 py-2.5">
                  <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-brand-300 [animation-delay:-0.2s]" />
                  <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-brand-300 [animation-delay:-0.1s]" />
                  <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-brand-300" />
                </div>
              </div>
            ) : null}
          </div>

          <div className="border-t border-line p-3">
            <div className="mb-2 flex flex-wrap gap-1.5">
              {SUGGESTIONS.slice(0, 3).map((suggestion) => (
                <button
                  key={suggestion}
                  type="button"
                  onClick={() => send(suggestion)}
                  disabled={chat.isPending}
                  className="chip transition-colors hover:border-brand-400/40 hover:text-brand-200 disabled:opacity-50"
                >
                  {suggestion}
                </button>
              ))}
            </div>
            <form
              onSubmit={(event) => {
                event.preventDefault();
                send(input);
              }}
              className="flex items-end gap-2"
            >
              <label className="sr-only" htmlFor="architect-input">
                Message the {PRODUCT.assistantName}
              </label>
              <textarea
                id="architect-input"
                ref={inputRef}
                value={input}
                onChange={(event) => setInput(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' && !event.shiftKey) {
                    event.preventDefault();
                    send(input);
                  }
                }}
                rows={2}
                maxLength={600}
                placeholder={`Ask about ${PRODUCT.entityArticle} ${PRODUCT.entitySingular}, a category, the seed, or a scenario…`}
                className="textarea resize-none"
              />
              <button type="submit" disabled={!input.trim() || chat.isPending} className="btn btn-primary h-[52px] px-4" aria-label="Send message">
                <Send className="h-4 w-4" />
              </button>
            </form>
            <p className="mt-1.5 flex items-center gap-1 text-[10px] text-ink-faint">
              <CornerDownLeft className="h-3 w-3" />
              Enter to send · Shift+Enter for a new line · responses are deterministic
            </p>
          </div>
        </section>

        <div className="space-y-4">
          <Panel title="What it can do" description="No free-form hallucination — every intent maps to engine state.">
            <ul className="space-y-2">
              {[
                { icon: Globe2, title: `Focus ${PRODUCT.entityArticle} ${PRODUCT.entitySingular}`, body: `Opens the dossier for a named ${PRODUCT.entitySingular}.` },
                { icon: Compass, title: 'Filter the catalogue', body: 'Category, region, status, and risk ranking.' },
                { icon: FlaskConical, title: 'Queue a simulation', body: 'Carries action and target into the lab.' },
                { icon: BrainCircuit, title: 'Explain determinism', body: `Describes the seed-to-${PRODUCT.entitySingular} pipeline.` }
              ].map((item) => (
                <li key={item.title} className="flex gap-2.5 rounded-lg border border-line bg-surface-sunken/50 p-2.5">
                  <item.icon className="mt-0.5 h-4 w-4 shrink-0 text-brand-300" />
                  <span>
                    <span className="block text-xs font-semibold text-ink">{item.title}</span>
                    <span className="block text-[11px] text-ink-muted">{item.body}</span>
                  </span>
                </li>
              ))}
            </ul>
          </Panel>

          <Panel title="Try an intent" description="Examples that exercise each action type.">
            <div className="flex flex-wrap gap-1.5">
              {SUGGESTIONS.map((suggestion) => (
                <button
                  key={suggestion}
                  type="button"
                  onClick={() => send(suggestion)}
                  disabled={chat.isPending}
                  className="rounded-lg border border-line bg-surface-sunken/60 px-2.5 py-1.5 text-left text-[11px] text-ink-muted transition-colors hover:border-brand-400/40 hover:text-ink disabled:opacity-50"
                >
                  {suggestion}
                </button>
              ))}
            </div>
          </Panel>

          <Panel title="Telemetry" description="Last response from the assistant.">
            {lastMetadata ? (
              <dl className="grid grid-cols-2 gap-2 text-[11px]">
                <div className="rounded-lg border border-line bg-surface-sunken/50 px-2 py-1.5">
                  <dt className="text-ink-faint">Model</dt>
                  <dd className="font-mono text-ink">{lastMetadata.model}</dd>
                </div>
                <div className="rounded-lg border border-line bg-surface-sunken/50 px-2 py-1.5">
                  <dt className="text-ink-faint">Latency</dt>
                  <dd className="font-mono text-ink">{lastMetadata.latencyMs}ms</dd>
                </div>
                <div className="rounded-lg border border-line bg-surface-sunken/50 px-2 py-1.5">
                  <dt className="text-ink-faint">Tokens</dt>
                  <dd className="font-mono text-ink">{lastMetadata.tokensUsed}</dd>
                </div>
                <div className="rounded-lg border border-line bg-surface-sunken/50 px-2 py-1.5">
                  <dt className="text-ink-faint">Conversation</dt>
                  <dd className="truncate font-mono text-ink">{conversationId?.slice(0, 8) ?? 'new'}</dd>
                </div>
              </dl>
            ) : (
              <p className="text-[11px] text-ink-faint">Send a message to see deterministic latency and token estimates.</p>
            )}
          </Panel>

          <div className="rounded-xl border border-line bg-surface p-3 text-[11px] text-ink-muted">
            <p className="flex items-center gap-1.5 font-semibold text-ink">
              <Sparkles className="h-3.5 w-3.5 text-brand-300" />
              {PRODUCT.name} · {PRODUCT.assistantName}
            </p>
            <p className="mt-1">All context is local; no conversation leaves this deployment.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
