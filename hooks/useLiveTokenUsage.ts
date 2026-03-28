import { useEffect, useState } from "react";
import {
  getLiveTokenUsageSnapshot,
  subscribeToLiveTokenUsage,
  type LiveTokenUsageState,
} from "../lib/token-usage-live";

export function useLiveTokenUsage(enabled = true): LiveTokenUsageState {
  const [state, setState] = useState<LiveTokenUsageState>(() => getLiveTokenUsageSnapshot());

  useEffect(() => {
    if (!enabled) return;
    return subscribeToLiveTokenUsage(setState);
  }, [enabled]);

  if (!enabled) {
    return {
      usage: null,
      connected: false,
      loading: false,
    };
  }

  return state;
}

