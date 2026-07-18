import React, { createContext, useContext, useEffect, useMemo, useState, useCallback } from "react";
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

const STORAGE_KEY = "hrc_planner_v1";

function loadState(): PlannerStateShape {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return {
        version: 1,
        postStates: parsed.postStates || {},
        contentOverrides: parsed.contentOverrides || {},
        dayOverrides: parsed.dayOverrides || {},
        customPosts: parsed.customPosts || {},
        extraDays: parsed.extraDays || [],
      };
    }
  } catch (e) {
    console.error("Falha ao carregar dados do planner:", e);
  }
  return { version: 1, postStates: {}, contentOverrides: {}, dayOverrides: {}, customPosts: {}, extraDays: [] };
}

function postKey(day: number, number: number) {
  return `${day}-${number}`;
}

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
}

const PlannerContext = createContext<PlannerContextValue | null>(null);

export function PlannerProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<PlannerStateShape>(loadState);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (e) {
      console.error("Falha ao salvar dados do planner:", e);
    }
  }, [state]);

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
      setState({
        version: 1,
        postStates: parsed.postStates || {},
        contentOverrides: parsed.contentOverrides || {},
        dayOverrides: parsed.dayOverrides || {},
        customPosts: parsed.customPosts || {},
        extraDays: parsed.extraDays || [],
      });
      return true;
    } catch (e) {
      console.error("JSON inválido:", e);
      return false;
    }
  }, []);

  const resetAll = useCallback(() => {
    setState({ version: 1, postStates: {}, contentOverrides: {}, dayOverrides: {}, customPosts: {}, extraDays: [] });
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
  };

  return <PlannerContext.Provider value={value}>{children}</PlannerContext.Provider>;
}

export function usePlanner() {
  const ctx = useContext(PlannerContext);
  if (!ctx) throw new Error("usePlanner deve ser usado dentro de PlannerProvider");
  return ctx;
}
