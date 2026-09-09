"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { EMPTY, type State } from "@/shared/finance";
import { loadState } from "@/frontend/api";
import { demoState } from "@/frontend/demo";

// One snapshot per authenticated app. Navigation never triggers a refetch.
export function useFinanceData(month: string) {
  const [real, setReal] = useState<State>(EMPTY);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [demo, setDemo] = useState(false);
  const firstLoad = useRef(true);
  const refresh = useCallback(async () => {
    setLoadError("");
    try {
      const state = await loadState();
      setReal(state);
      if (firstLoad.current) {
        setDemo(state.accounts.length === 0 && state.transactions.length === 0);
        firstLoad.current = false;
      }
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : "Não foi possível carregar seus dados.");
    } finally { setLoading(false); }
  }, []);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void refresh();
  }, [refresh]);
  const state = useMemo(() => demo ? demoState(month) : real, [demo, month, real]);
  return { state, real, demo, setDemo, loading, loadError, refresh };
}
