import { tokenStorage } from "./api";
import type { UsageSnapshot } from "./billing";

const BASE_URL = import.meta.env.VITE_API_URL ?? "";

export interface LiveTokenUsageState {
  usage: UsageSnapshot | null;
  connected: boolean;
  loading: boolean;
}

type Listener = (state: LiveTokenUsageState) => void;

let state: LiveTokenUsageState = {
  usage: null,
  connected: false,
  loading: false,
};

const listeners = new Set<Listener>();
let subscribers = 0;
let streamAbortController: AbortController | null = null;
let reconnectTimeoutId: number | null = null;

function emit() {
  for (const listener of listeners) listener(state);
}

function setState(partial: Partial<LiveTokenUsageState>) {
  state = { ...state, ...partial };
  emit();
}

function resetReconnectTimeout() {
  if (reconnectTimeoutId !== null) {
    window.clearTimeout(reconnectTimeoutId);
    reconnectTimeoutId = null;
  }
}

function stopStream() {
  streamAbortController?.abort();
  streamAbortController = null;
  resetReconnectTimeout();
  setState({ connected: false, loading: false });
}

function parseEventBlock(block: string): { event: string; data: string } | null {
  const lines = block.split("\n");
  let event = "message";
  const dataLines: string[] = [];

  for (const rawLine of lines) {
    const line = rawLine.replace(/\r$/, "");
    if (!line) continue;
    if (line.startsWith(":")) continue;
    if (line.startsWith("event:")) {
      event = line.slice("event:".length).trim();
      continue;
    }
    if (line.startsWith("data:")) {
      dataLines.push(line.slice("data:".length).trimStart());
    }
  }

  if (dataLines.length === 0) return null;
  return { event, data: dataLines.join("\n") };
}

async function readEventStream(body: ReadableStream<Uint8Array>, signal: AbortSignal): Promise<void> {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  try {
    while (!signal.aborted) {
      const { value, done } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });

      while (true) {
        const boundary = buffer.indexOf("\n\n");
        if (boundary < 0) break;
        const rawBlock = buffer.slice(0, boundary);
        buffer = buffer.slice(boundary + 2);
        const parsed = parseEventBlock(rawBlock);
        if (!parsed) continue;
        if (parsed.event !== "usage") continue;

        try {
          const payload = JSON.parse(parsed.data) as UsageSnapshot;
          setState({
            usage: payload,
            loading: false,
            connected: true,
          });
        } catch {
          // ignore malformed payloads and keep stream alive
        }
      }
    }
  } finally {
    reader.releaseLock();
  }
}

async function connectStream() {
  if (streamAbortController || subscribers <= 0) return;

  const accessToken = tokenStorage.getAccess();
  if (!accessToken) {
    setState({ usage: null, loading: false, connected: false });
    return;
  }

  const controller = new AbortController();
  streamAbortController = controller;
  setState({ loading: true, connected: false });

  try {
    const response = await fetch(`${BASE_URL}/api/billing/usage/stream`, {
      method: "GET",
      headers: {
        Accept: "text/event-stream",
        Authorization: `Bearer ${accessToken}`,
      },
      signal: controller.signal,
      cache: "no-store",
    });

    if (!response.ok || !response.body) {
      throw new Error(`Failed usage stream request (${response.status})`);
    }

    setState({ connected: true });
    await readEventStream(response.body, controller.signal);
  } catch {
    if (controller.signal.aborted) return;
    setState({ connected: false });
  } finally {
    if (streamAbortController === controller) {
      streamAbortController = null;
    }
  }

  if (subscribers > 0) {
    resetReconnectTimeout();
    reconnectTimeoutId = window.setTimeout(() => {
      reconnectTimeoutId = null;
      void connectStream();
    }, 1_000);
  }
}

export function subscribeToLiveTokenUsage(listener: Listener): () => void {
  listeners.add(listener);
  listener(state);
  subscribers += 1;
  void connectStream();

  return () => {
    listeners.delete(listener);
    subscribers = Math.max(0, subscribers - 1);
    if (subscribers === 0) {
      stopStream();
    }
  };
}

export function getLiveTokenUsageSnapshot(): LiveTokenUsageState {
  return state;
}

