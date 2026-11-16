/**
 * Agent sidebar panel -- a thin DOM view over {@link AgentChatController}.
 *
 * Header (title + gear + close); a collapsible settings block (provider selector
 * -> cloud API key for Claude/OpenAI/Gemini, a local model picker + load button
 * for WebLLM, or a model-name input for Ollama), hidden behind the gear so the
 * main panel is a clean chat; a toolbar (review-mode toggle + quote + clear); and
 * the reusable @ranuts/chat-ui ChatView.
 *
 * Plain elements throughout (lib/dom.ts): the panel is built once and updated
 * through the nodes it keeps, so a language change re-labels what exists rather
 * than rebuilding the panel and losing the conversation. Loaded behind `?agent=1`.
 */
import { h } from '../../dom';
import { localStorageGetItem, localStorageSetItem } from 'ranuts/utils';
import { type I18nMessages, t } from '@ranuts/shared/i18n';
import { getEditorApi } from '../editor-bridge';
import { agentTools } from '../tools';
import { createProvider, defaultProviderId, type ProviderId } from '@ranuts/agent-core/llm/factory';
import { getApiKey, setApiKey } from '@ranuts/agent-core/llm/keys';
import {
  DEFAULT_WEBLLM_MODEL,
  isModelCached,
  isWebGPUAvailable,
  WEBLLM_MODELS,
  WebLLMProvider,
} from '@ranuts/agent-core/llm/webllm';
import { ChatView, type ChatViewLabels } from '@ranuts/chat-ui';
import { AgentChatController, type ChatTurn } from './controller';
import { createHistoryStorage, historyToTurns } from './storage';

const TURN_LABEL_KEY: Record<ChatTurn['role'], keyof I18nMessages | null> = {
  user: 'agentRoleUser',
  agent: null, // "Agent" -- same in every language
  tool: 'agentRoleTool',
  error: 'agentRoleError',
};
const turnLabel = (role: ChatTurn['role']): string => {
  const key = TURN_LABEL_KEY[role];
  return key ? t(key) : 'Agent';
};

const PROVIDER_LABEL_KEY: Record<ProviderId, keyof I18nMessages> = {
  anthropic: 'agentProviderClaude',
  openai: 'agentProviderOpenAI',
  gemini: 'agentProviderGemini',
  webllm: 'agentProviderLocal',
  ollama: 'agentProviderOllama',
};
const PROVIDER_IDS: ProviderId[] = ['anthropic', 'openai', 'gemini', 'webllm', 'ollama'];

const OLLAMA_MODEL_STORAGE_KEY = 'agent_ollama_model';

/** Providers configured with a cloud API key (vs. local WebLLM/Ollama). */
const CLOUD_PROVIDERS: ReadonlySet<ProviderId> = new Set<ProviderId>(['anthropic', 'openai', 'gemini']);

const KEY_PLACEHOLDER: Partial<Record<ProviderId, string>> = {
  anthropic: 'sk-ant-...',
  openai: 'sk-...',
  gemini: 'AIza...',
};

/** A button with a label and class. */
const button = (text: string, className: string): HTMLButtonElement =>
  h('button', { type: 'button', class: className }, text);

/** A select with options and an initial value. */
const select = (
  className: string,
  options: Array<{ value: string; label: string }>,
  value: string,
): HTMLSelectElement => {
  const node = h(
    'select',
    { class: className },
    options.map((option) => h('option', { value: option.value }, option.label)),
  );
  node.value = value;
  return node;
};

/**
 * Singleton handle to the live panel, so external triggers (the AI button
 * injected into OnlyOffice's left menu, posting `agent:toggle`) can open/close
 * it without building a second panel. Set on first {@link createAgentPanel}.
 */
let panelHandle: { setOpen: (open: boolean) => void; isOpen: () => boolean } | null = null;

/** Open the panel (creating it on first use), close it, or flip it. */
export function toggleAgentPanel(): void {
  if (panelHandle) panelHandle.setOpen(!panelHandle.isOpen());
  else createAgentPanel(); // first call creates the panel already open
}

/** Build the Agent panel, append it to the body, and return its root element. */
export function createAgentPanel(): HTMLElement {
  // Idempotent: a second call just reveals the existing panel.
  const existing = document.querySelector('.agent-panel');
  if (existing) {
    panelHandle?.setOpen(true);
    return existing as HTMLElement;
  }

  const panel = h('aside', { class: 'agent-panel', 'aria-label': t('agentTitle') });

  // Floating launcher -- shown when the panel is closed, reopens it on click.
  const launcher = button('AI', 'agent-launcher agent-launcher-hidden');
  launcher.addEventListener('click', () => setOpen(true));

  let open = true;
  const setOpen = (next: boolean): void => {
    open = next;
    panel.classList.toggle('agent-panel-hidden', !next);
    launcher.classList.toggle('agent-launcher-hidden', next);
    // Dock mode: shrink the editor so the panel takes layout space instead of
    // overlaying the document. CSS keys off this body class.
    document.body.classList.toggle('agent-docked', next);
    // Tell the editor iframe so the injected AI button can show active state.
    // DocsAPI replaces the placeholder with an iframe (name="frameEditor") in #app.
    const frame = document.querySelector<HTMLIFrameElement>('#app iframe');
    frame?.contentWindow?.postMessage({ type: 'agent:state', open: next }, '*');
  };
  panelHandle = { setOpen, isOpen: () => open };

  // ── Header ──────────────────────────────────────────────────────────────
  const title = h('span', { class: 'agent-panel-title' }, t('agentTitle'));
  // Gear toggles the settings block (provider / key / model), hidden by default
  // so the main panel stays a clean chat surface.
  const settingsBtn = button('⚙', 'agent-panel-settings-toggle');
  settingsBtn.addEventListener('click', () => settings.classList.toggle('agent-panel-settings-hidden'));
  const closeBtn = button('×', 'agent-panel-close');
  closeBtn.setAttribute('aria-label', 'Close');
  closeBtn.addEventListener('click', () => setOpen(false));
  const header = h('div', { class: 'agent-panel-header' }, title, settingsBtn, closeBtn);

  // ── Settings (collapsed by default; opened via the gear) ──────────────────
  const providerSelect = select(
    'agent-panel-provider',
    PROVIDER_IDS.map((id) => ({ value: id, label: t(PROVIDER_LABEL_KEY[id]) })),
    defaultProviderId(),
  );

  // Cloud: API key input
  const keyInput = h('input', { class: 'agent-panel-key-input', type: 'password', autocomplete: 'off' });

  // Ollama: local model name input (no key needed)
  const ollamaModelInput = h('input', { class: 'agent-panel-ollama-model', type: 'text', autocomplete: 'off' });
  ollamaModelInput.value = localStorageGetItem(OLLAMA_MODEL_STORAGE_KEY) || '';
  ollamaModelInput.addEventListener('change', () => {
    controller = null; // different model -> rebuild
    localStorageSetItem(OLLAMA_MODEL_STORAGE_KEY, ollamaModelInput.value.trim());
  });

  // Local: model picker + load button
  const modelSelect = select(
    'agent-panel-model',
    WEBLLM_MODELS.map((model) => ({ value: model.id, label: `${model.label} (${model.size})` })),
    DEFAULT_WEBLLM_MODEL,
  );
  const loadBtn = button(t('agentLoadModel'), 'agent-panel-load btn btn-sm');
  loadBtn.addEventListener('click', () => void loadModel());
  const modelRow = h('div', { class: 'agent-panel-model-row' }, modelSelect, loadBtn);

  // Model-load progress / hints. Lives in the MAIN view (not settings) so the
  // auto-load progress is visible; `:empty` collapses it when idle.
  const note = h('div', { class: 'agent-panel-note' });

  // Chat-only banner for WebLLM: explains the local model can't edit, with a
  // clickable shortcut that flips the provider to cloud (and opens settings so
  // the API-key field is right there).
  const switchCloudLink = h(
    'span',
    { class: 'agent-panel-link', role: 'button', tabindex: '0' },
    t('agentSwitchCloud'),
  );
  const chatOnlyHint = h(
    'div',
    { class: 'agent-panel-note agent-panel-chatonly' },
    t('agentLocalChatOnly'),
    ' ',
    switchCloudLink,
  );
  chatOnlyHint.style.display = 'none';

  const settings = h(
    'div',
    { class: 'agent-panel-settings agent-panel-settings-hidden' },
    providerSelect,
    keyInput,
    ollamaModelInput,
    modelRow,
  );

  // ── Compose actions (mounted into ChatView's slot above the input) ────────
  const reviewCheck = h('input', { type: 'checkbox' });
  const reviewText = h('span', {}, t('agentReviewMode'));
  const reviewLabel = h('label', { class: 'agent-panel-review' }, reviewCheck, reviewText);
  const quoteBtn = button(t('agentQuote'), 'agent-panel-quote btn btn-sm');
  quoteBtn.title = t('agentQuoteTip');
  const clearBtn = button(t('agentClear'), 'agent-panel-clear btn btn-sm');

  // ── Conversation + input (reusable chat UI) ──────────────────────────────
  const chatLabels = (): ChatViewLabels => ({
    send: t('agentSend'),
    stop: t('agentStop'),
    placeholder: t('agentInputPlaceholder'),
    empty: t('agentInputPlaceholder'),
    role: (role) => turnLabel(role),
  });
  const chat = new ChatView({
    onSend: (text) => void submit(text),
    onStop: () => controller?.stop(),
    labels: chatLabels(),
  });
  const appendTurn = (turn: ChatTurn): void => {
    chat.append(turn);
  };
  // IM-style compose toolbar: review/quote/clear sit just above the input.
  chat.actionsEl.append(reviewLabel, quoteBtn, clearBtn);

  // Persist the conversation so a reload keeps it (model context + display).
  const historyStorage = createHistoryStorage();

  // Streaming: ChatView owns the live bubble; just forward deltas and the end.
  const controllerOptions = {
    tools: agentTools,
    onAgentDelta: (delta: string): void => chat.appendDelta(delta),
    onAgentStreamEnd: (): void => chat.endStream(),
    storage: historyStorage,
  };

  // Restore a previous conversation into the view on load.
  for (const turn of historyToTurns(historyStorage.load())) chat.append(turn);

  // ── Controller wiring ───────────────────────────────────────────────────
  const currentProvider = (): ProviderId => providerSelect.value as ProviderId;

  let controller: AgentChatController | null = null;
  let controllerKind = '';
  let webllmProvider: WebLLMProvider | null = null;

  // Reflect whether the selected local model is already cached (no re-download).
  const updateLocalHint = async (): Promise<void> => {
    if (currentProvider() !== 'webllm') return;
    if (!isWebGPUAvailable()) {
      note.textContent = t('agentNoWebGPU');
      return;
    }
    const model = WEBLLM_MODELS.find((candidate) => candidate.id === modelSelect.value);
    const size = model?.size ?? '';
    const id = modelSelect.value;
    note.textContent = t('agentCheckingCache');
    const cached = await isModelCached(id);
    if (currentProvider() !== 'webllm' || modelSelect.value !== id) return; // changed meanwhile
    note.textContent = cached ? t('agentModelCached') : t('agentModelFirstDownload').replace('{size}', size);
  };

  // The chat-only banner only makes sense when WebLLM is actually usable.
  const syncChatOnlyHint = (): void => {
    chatOnlyHint.style.display = currentProvider() === 'webllm' && isWebGPUAvailable() ? '' : 'none';
  };

  // "Switch to cloud" shortcut: flip the provider to Claude, drop the stale
  // controller, and reveal settings so the API-key field is visible immediately.
  const switchToCloud = (): void => {
    providerSelect.value = 'anthropic';
    controller = null;
    settings.classList.remove('agent-panel-settings-hidden');
    syncProviderUi();
  };
  switchCloudLink.addEventListener('click', switchToCloud);
  switchCloudLink.addEventListener('keydown', (event) => {
    const key = (event as KeyboardEvent).key;
    if (key === 'Enter' || key === ' ') {
      event.preventDefault();
      switchToCloud();
    }
  });

  const syncProviderUi = (): void => {
    const id = currentProvider();
    const isCloud = CLOUD_PROVIDERS.has(id);
    keyInput.style.display = isCloud ? '' : 'none';
    modelRow.style.display = id === 'webllm' ? '' : 'none';
    ollamaModelInput.style.display = id === 'ollama' ? '' : 'none';
    syncChatOnlyHint();
    if (isCloud) {
      keyInput.placeholder = KEY_PLACEHOLDER[id] ?? '';
      keyInput.value = getApiKey(id) ?? '';
      note.textContent = '';
    } else if (id === 'ollama') {
      ollamaModelInput.placeholder = t('agentOllamaModelPlaceholder');
      note.textContent = t('agentOllamaHint');
    } else {
      void updateLocalHint();
    }
  };
  providerSelect.addEventListener('change', () => {
    controller = null;
    syncProviderUi();
  });
  modelSelect.addEventListener('change', () => {
    controller = null; // different model -> rebuild
    void updateLocalHint();
  });
  keyInput.addEventListener('change', () => {
    const id = currentProvider();
    if (CLOUD_PROVIDERS.has(id)) setApiKey(id, keyInput.value.trim());
  });
  syncProviderUi();

  const buildController = (): AgentChatController | null => {
    const id = currentProvider();
    if (id === 'webllm') {
      if (!isWebGPUAvailable()) return null;
      const kind = `webllm:${modelSelect.value}`;
      if (!controller || controllerKind !== kind) {
        // Local 7-8B models can't reliably drive tool calls, so WebLLM runs
        // chat-only: a plain assistant that never errors but can't edit.
        webllmProvider = new WebLLMProvider({
          model: modelSelect.value,
          chatOnly: true,
          onProgress: (progress) => (note.textContent = progress.text),
        });
        controller = new AgentChatController(webllmProvider, appendTurn, controllerOptions);
        controllerKind = kind;
      }
      return controller;
    }
    if (id === 'ollama') {
      const model = ollamaModelInput.value.trim() || undefined;
      const kind = `ollama:${model ?? ''}`;
      if (!controller || controllerKind !== kind) {
        controller = new AgentChatController(
          createProvider('ollama', { ollamaModel: model }),
          appendTurn,
          controllerOptions,
        );
        controllerKind = kind;
        webllmProvider = null;
      }
      return controller;
    }
    const key = keyInput.value.trim();
    if (!key) return null;
    const kind = `${id}:${key}`;
    if (!controller || controllerKind !== kind) {
      controller = new AgentChatController(createProvider(id, { apiKey: key }), appendTurn, controllerOptions);
      controllerKind = kind;
      webllmProvider = null;
    }
    return controller;
  };

  // Load (download + warm) the selected WebLLM model. Used by the Load button and
  // auto-triggered on open when the default provider is local.
  const loadModel = async (): Promise<void> => {
    if (!isWebGPUAvailable()) {
      note.textContent = t('agentNoWebGPU');
      return;
    }
    buildController();
    loadBtn.disabled = true;
    try {
      await webllmProvider?.preload();
      note.textContent = t('agentModelLoaded');
    } catch (error) {
      appendTurn({ role: 'error', text: error instanceof Error ? error.message : String(error) });
    } finally {
      loadBtn.disabled = false;
    }
  };

  // ChatView owns the Send/Stop button, Enter-to-send, and the input lock; this
  // just runs a turn. `submit` is passed to ChatView's onSend above.
  const submit = async (text: string): Promise<void> => {
    const trimmed = text.trim();
    if (!trimmed) return;
    const ctl = buildController();
    if (!ctl) {
      chat.append({
        role: 'error',
        text: currentProvider() === 'webllm' ? t('agentNoWebGPU') : t('agentNeedKey'),
      });
      return;
    }
    chat.setRunning(true);
    try {
      await ctl.send(trimmed);
    } finally {
      chat.setRunning(false);
      chat.focus();
    }
  };
  clearBtn.addEventListener('click', () => {
    controller?.reset();
    historyStorage.clear(); // also clear when no controller has been built yet
    chat.clear();
  });

  // Quote the current selection (Word text / Excel cells / PPT shape text) into
  // the input so the user can ask about it. Works across editor types because
  // pluginMethod_GetSelectedText is part of the shared plugin command API.
  quoteBtn.addEventListener('click', () => {
    const selected = getEditorApi()?.pluginMethod_GetSelectedText() ?? '';
    if (!selected.trim()) {
      appendTurn({ role: 'error', text: t('agentNoSelection') });
      return;
    }
    const quoted = `${t('agentQuotePrefix')}\n"""\n${selected.replace(/\r\n/g, '\n')}\n"""\n\n`;
    chat.setInput(quoted + chat.getInput());
    chat.focus();
  });

  // Review-mode toggle reads/sets track-changes directly on the editor.
  const api = getEditorApi();
  // Track-changes is a Word/Spreadsheet API; the presentation editor has no
  // asc_IsTrackRevisions, so feature-detect before using it.
  const canReview = !!api && typeof api.asc_IsTrackRevisions === 'function';
  if (!canReview) reviewCheck.disabled = true;
  if (canReview) reviewCheck.checked = Boolean(api!.asc_IsTrackRevisions());
  reviewCheck.addEventListener('change', () => {
    getEditorApi()?.asc_SetTrackRevisions?.(reviewCheck.checked);
  });

  // Re-apply every translatable label when the shell language changes. One
  // pass over the nodes this panel already holds -- the conversation survives.
  const applyLabels = (): void => {
    launcher.title = t('agentOpenTip');
    title.textContent = t('agentTitle');
    settingsBtn.title = t('agentSettings');
    const selected = providerSelect.value;
    for (const option of providerSelect.options) {
      option.textContent = t(PROVIDER_LABEL_KEY[option.value as ProviderId]);
    }
    providerSelect.value = selected;
    loadBtn.textContent = t('agentLoadModel');
    reviewText.textContent = t('agentReviewMode');
    quoteBtn.textContent = t('agentQuote');
    quoteBtn.title = t('agentQuoteTip');
    clearBtn.textContent = t('agentClear');
    chat.setLabels(chatLabels());
    syncProviderUi(); // refresh key placeholder / model hint in the new language
  };
  applyLabels();
  window.addEventListener('languagechange', applyLabels);

  panel.append(header, settings, note, chatOnlyHint, chat.el);
  document.body.append(panel, launcher);
  setOpen(true); // start open + docked

  // Auto-load the default local model on open -- but only when it's already
  // cached, so opening the panel never triggers a surprise multi-GB download.
  if (currentProvider() === 'webllm' && isWebGPUAvailable()) {
    void isModelCached(modelSelect.value).then((cached) => {
      if (cached) void loadModel();
    });
  }

  return panel;
}
