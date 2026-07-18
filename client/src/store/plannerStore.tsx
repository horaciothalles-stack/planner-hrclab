import React, { createContext, useContext, useEffect, useMemo, useState, useCallback, useRef } from "react";
import { plannerData, type PlannerDay, type PlannerPostMeta } from "@/data/plannerData";

export type PostStatus = "rascunho" | "produzido" | "agendado" | "postado";

export const STATUS_ORDER: PostStatus[] = ["rascunho", "produzido", "agendado", "postado"];

export const STATUS_LABEL: Record<PostStatus, string> = {
  rascunho: "Rascunho",
  produzido: "Produzido",
  agendado: "Agendado",
  postado: "Postado",
};

export interface PostState {
  status: PostStatus;
  scheduledDate?: string; // ISO date
  postedDate?: string; // ISO date
  notes?: string;
  updatedAt: string; // ISO datetime, used for "parado há X dias"
}

export interface ContentOverride {
  format?: string;
  pillar?: string;
  content?: string; // full markdown body for the post, overrides parsed default
}

export interface DayOverride {
  title?: string;
  theme?: string;
  description?: string;
}

interface PlannerStateShape {
  version: 1;
  postStates: Record<string, PostState>; // key: `${day}-${number}`
  contentOverrides: Record<string, ContentOverride>;
  dayOverrides: Record<number, DayOverride>;
  customPosts: Record<number, PlannerPostMeta[]>; // extra posts added per day beyond the default 9
  extraDays: PlannerDay[]; // days beyond the default 30
}

const STORAGE_KEY = "hrc_planner_v1"; // cache local (offline / carregamento instantâneo)
const PASSWORD_KEY = "hrc_planner_pw";

const EMPTY_STATE: PlannerStateShape = {
  version: 1,
  postStates: {},
  contentOverrides: {},
  dayOverrides: {},
  customPosts: {},
  extraDays: [],
};

function normalizeState(raw: any): PlannerStateShape {
  if (!raw || typeof raw !== "object") return { ...EMPTY_STATE };
  return {
    version: 1,
    postStates: raw.postStates || {},
    contentOverrides: raw.contentOverrides || {},
    dayOverrides: raw.dayOverrides || {},
    customPosts: raw.customPosts || {},
    extraDays: raw.extraDays || [],
  };
}

function loadLocalCache(): PlannerStateShape {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return normalizeState(JSON.parse(raw));
  } catch (e) {
    console.error("Falha ao carregar cache local do planner:", e);
  }
  return { ...EMPTY_STATE };
}

function postKey(day: number, number: number) {
  return `${day}-${number}`;
}

export type SyncStatus = "idle" | "loading" | "saving" | "saved" | "error" | "offline";

interface PlannerContextValue {
  allDays: PlannerDay[];
  getDay: (day: number) => PlannerDay | undefined;
  getPostState: (day: number, number: number) => PostState;
  setPostStatus: (day: number, number: number, status: PostStatus, extra?: Partial<Pick<PostState, "scheduledDate" | "postedDate">>) => void;
  setPostNotes: (day: number, number: number, notes: string) => void;
  getContentOverride: (day: number, number: number) => ContentOverride | undefined;
  setContentOverride: (day: number, number: number, override: ContentOverride) => void;
  setDayOverride: (day: number, override: DayOverride) => void;
  addPost: (day: number) => void;
  removePost: (day: number, number: number) => void;
  addDay: () => number;
  exportData: () => string;
  importData: (json: string) => boolean;
  resetAll: () => void;
  // Autenticação / sincronização remota
  isAuthenticated: boolean;
  login: (password: string) => Promise<boolean>;
  logout: () => void;
  syncStatus: SyncStatus;
  syncError: string | null;
  syncNow: () => Promise<void>;
}

const PlannerContext = createContext<PlannerContextValue | null>(null);

async function apiGet(password: string): Promise<PlannerStateShape | null> {
  const res = await fetch("/api/state", { headers: { "x-planner-password": password } });
  if (res.status === 401) throw new Error("UNAUTHORIZED");
  if (!res.ok) throw new Error(`Erro ao carregar (${res.status})`);
  const data = await res.json();
  return data ? normalizeState(data) : null;
}

async function apiPost(password: string, state: PlannerStateShape): Promise<void> {
  const res = await fetch("/api/state", {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-planner-password": password },
    body: JSON.stringify(state),
  });
  if (res.status === 401) throw new Error("UNAUTHORIZED");
  if (!res.ok) throw new Error(`Erro ao salvar (${res.status})`);
}

export function PlannerProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<PlannerStateShape>(loadLocalCache);
  const [password, setPassword] = useState<string | null>(() => localStorage.getItem(PASSWORD_KEY));
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [syncStatus, setSyncStatus] = useState<SyncStatus>("idle");
  const [syncError, setSyncError] = useState<string | null>(null);

  const skipNextSaveRef = useRef(false);
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Persist local cache always (funciona como backup mesmo se a rede falhar)
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (e) {
      console.error("Falha ao salvar cache local do planner:", e);
    }
  }, [state]);

  const loadRemote = useCallback(async (pw: string) => {
    setSyncStatus("loading");
    setSyncError(null);
    try {
      const remote = await apiGet(pw);
      if (remote) {
        skipNextSaveRef.current = true;
        setState(remote);
      }
      setIsAuthenticated(true);
      setSyncStatus("saved");
    } catch (e) {
      if (e instanceof Error && e.message === "UNAUTHORIZED") {
        setIsAuthenticated(false);
        localStorage.removeItem(PASSWORD_KEY);
        setPassword(null);
        setSyncError("Senha incorreta.");
        setSyncStatus("error");
      } else {
        // Sem rede ou API fora do ar: segue com o cache local, mas ainda autenticado.
        setIsAuthenticated(true);
        setSyncStatus("offline");
        setSyncError(e instanceof Error ? e.message : "Não foi possível conectar ao servidor.");
      }
    }
  }, []);

  useEffect(() => {
    if (password) {
      loadRemote(password);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Salvamento remoto com debounce sempre que o estado mudar
  useEffect(() => {
    if (!password || !isAuthenticated) return;
    if (skipNextSaveRef.current) {
      skipNextSaveRef.current = false;
      return;
    }
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    saveTimeoutRef.current = setTimeout(async () => {
      setSyncStatus("saving");
      try {
        await apiPost(password, state);
        setSyncStatus("saved");
        setSyncError(null);
      } catch (e) {
        if (e instanceof Error && e.message === "UNAUTHORIZED") {
          setIsAuthenticated(false);
          localStorage.removeItem(PASSWORD_KEY);
          setPassword(null);
        }
        setSyncStatus("error");
        setSyncError(e instanceof Error ? e.message : "Falha ao sincronizar.");
      }
    }, 900);
    return () => {
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state, password, isAuthenticated]);

  const login = useCallback(
    async (pw: string): Promise<boolean> => {
      setSyncStatus("loading");
      setSyncError(null);
      try {
        const remote = await apiGet(pw);
        localStorage.setItem(PASSWORD_KEY, pw);
        setPassword(pw);
        setIsAuthenticated(true);
        if (remote) {
          skipNextSaveRef.current = true;
          setState(remote);
        } else {
          // Primeira vez: não há nada salvo ainda no servidor. Envia o que existir localmente.
          skipNextSaveRef.current = false;
        }
        setSyncStatus("saved");
        return true;
      } catch (e) {
        if (e instanceof Error && e.message === "UNAUTHORIZED") {
          setSyncStatus("error");
          setSyncError("Senha incorreta.");
          return false;
        }
        // Sem servidor/rede disponível (ex: rodando localmente via `pnpm run dev` sem `vercel dev`,
        // ou sem internet no momento): entra mesmo assim usando o cache local deste navegador.
        localStorage.setItem(PASSWORD_KEY, pw);
        setPassword(pw);
        setIsAuthenticated(true);
        setSyncStatus("offline");
        setSyncError("Não foi possível conectar ao servidor. Trabalhando só com os dados deste navegador por enquanto.");
        return true;
      }
    },
    []
  );

  const logout = useCallback(() => {
    localStorage.removeItem(PASSWORD_KEY);
    setPassword(null);
    setIsAuthenticated(false);
  }, []);

  const syncNow = useCallback(async () => {
    if (!password) return;
    setSyncStatus("saving");
    try {
      await apiPost(password, state);
      setSyncStatus("saved");
      setSyncError(null);
    } catch (e) {
      setSyncStatus("error");
      setSyncError(e instanceof Error ? e.message : "Falha ao sincronizar.");
    }
  }, [password, state]);

  const allDays: PlannerDay[] = useMemo(() => {
    const merged = plannerData.map((d) => {
      const override = state.dayOverrides[d.day];
      const extra = state.customPosts[d.day] || [];
      return {
        ...d,
        ...(override || {}),
        posts: [...d.posts, ...extra],
      };
    });
    return [...merged, ...state.extraDays].sort((a, b) => a.day - b.day);
  }, [state]);

  const getDay = useCallback((day: number) => allDays.find((d) => d.day === day), [allDays]);

  const getPostState = useCallback(
    (day: number, number: number): PostState => {
      const key = postKey(day, number);
      return state.postStates[key] || { status: "rascunho", updatedAt: new Date().toISOString() };
    },
    [state.postStates]
  );

  const setPostStatus = useCallback(
    (day: number, number: number, status: PostStatus, extra?: Partial<Pick<PostState, "scheduledDate" | "postedDate">>) => {
      const key = postKey(day, number);
      setState((prev) => ({
        ...prev,
        postStates: {
          ...prev.postStates,
          [key]: {
            ...(prev.postStates[key] || { status: "rascunho", updatedAt: new Date().toISOString() }),
            status,
            ...extra,
            updatedAt: new Date().toISOString(),
          },
        },
      }));
    },
    []
  );

  const setPostNotes = useCallback((day: number, number: number, notes: string) => {
    const key = postKey(day, number);
    setState((prev) => ({
      ...prev,
      postStates: {
        ...prev.postStates,
        [key]: {
          ...(prev.postStates[key] || { status: "rascunho", updatedAt: new Date().toISOString() }),
          notes,
          updatedAt: new Date().toISOString(),
        },
      },
    }));
  }, []);

  const getContentOverride = useCallback(
    (day: number, number: number) => state.contentOverrides[postKey(day, number)],
    [state.contentOverrides]
  );

  const setContentOverride = useCallback((day: number, number: number, override: ContentOverride) => {
    const key = postKey(day, number);
    setState((prev) => ({
      ...prev,
      contentOverrides: {
        ...prev.contentOverrides,
        [key]: { ...prev.contentOverrides[key], ...override },
      },
    }));
  }, []);

  const setDayOverride = useCallback((day: number, override: DayOverride) => {
    setState((prev) => ({
      ...prev,
      dayOverrides: { ...prev.dayOverrides, [day]: { ...prev.dayOverrides[day], ...override } },
    }));
  }, []);

  const addPost = useCallback((day: number) => {
    setState((prev) => {
      const base = plannerData.find((d) => d.day === day);
      const extraExisting = prev.extraDays.find((d) => d.day === day);
      const existingPosts = [...(base?.posts || extraExisting?.posts || []), ...(prev.customPosts[day] || [])];
      const nextNumber = existingPosts.length > 0 ? Math.max(...existingPosts.map((p) => p.number)) + 1 : 1;
      const newPost: PlannerPostMeta = { number: nextNumber, format: "Novo formato", pillar: "Novo pilar" };
      return {
        ...prev,
        customPosts: { ...prev.customPosts, [day]: [...(prev.customPosts[day] || []), newPost] },
      };
    });
  }, []);

  const removePost = useCallback((day: number, number: number) => {
    setState((prev) => ({
      ...prev,
      customPosts: {
        ...prev.customPosts,
        [day]: (prev.customPosts[day] || []).filter((p) => p.number !== number),
      },
    }));
  }, []);

  const addDay = useCallback((): number => {
    let newDayNumber = 1;
    setState((prev) => {
      const allNumbers = [...plannerData.map((d) => d.day), ...prev.extraDays.map((d) => d.day)];
      newDayNumber = allNumbers.length > 0 ? Math.max(...allNumbers) + 1 : 1;
      const newDay: PlannerDay = {
        day: newDayNumber,
        title: `Dia ${newDayNumber} (novo)`,
        theme: "Defina o tema",
        description: "Defina o objetivo deste dia.",
        posts: [
          { number: 1, format: "Reels / Vídeo Curto", pillar: "Provocação / Gancho Forte" },
        ],
      };
      return { ...prev, extraDays: [...prev.extraDays, newDay] };
    });
    return newDayNumber;
  }, []);

  const exportData = useCallback(() => JSON.stringify(state, null, 2), [state]);

  const importData = useCallback((json: string): boolean => {
    try {
      const parsed = JSON.parse(json);
      setState(normalizeState(parsed));
      return true;
    } catch (e) {
      console.error("JSON inválido:", e);
      return false;
    }
  }, []);

  const resetAll = useCallback(() => {
    setState({ ...EMPTY_STATE });
  }, []);

  const value: PlannerContextValue = {
    allDays,
    getDay,
    getPostState,
    setPostStatus,
    setPostNotes,
    getContentOverride,
    setContentOverride,
    setDayOverride,
    addPost,
    removePost,
    addDay,
    exportData,
    importData,
    resetAll,
    isAuthenticated,
    login,
    logout,
    syncStatus,
    syncError,
    syncNow,
  };

  return <PlannerContext.Provider value={value}>{children}</PlannerContext.Provider>;
}

export function usePlanner() {
  const ctx = useContext(PlannerContext);
  if (!ctx) throw new Error("usePlanner deve ser usado dentro de PlannerProvider");
  return ctx;
}
