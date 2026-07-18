import type { PlannerDay } from "@/data/plannerData";
import type { PostState } from "@/store/plannerStore";

export type InsightLevel = "atencao" | "info" | "sucesso";

export interface Insight {
  level: InsightLevel;
  title: string;
  message: string;
}

interface ScanInput {
  allDays: PlannerDay[];
  getPostState: (day: number, number: number) => PostState;
}

const STALE_DRAFT_DAYS = 5;

export function runInsightsScan({ allDays, getPostState }: ScanInput): Insight[] {
  const insights: Insight[] = [];

  let total = 0;
  let postado = 0;
  let agendado = 0;
  let produzido = 0;
  let rascunho = 0;
  const pillarCount: Record<string, number> = {};
  const staleDrafts: { day: number; number: number; days: number }[] = [];
  const emptyButAdvanced: { day: number; number: number }[] = [];
  const dayCompletion: { day: number; done: number; totalPosts: number }[] = [];

  const now = Date.now();

  for (const d of allDays) {
    let doneInDay = 0;
    for (const p of d.posts) {
      total++;
      const state = getPostState(d.day, p.number);
      pillarCount[p.pillar] = (pillarCount[p.pillar] || 0) + 1;

      if (state.status === "postado") { postado++; doneInDay++; }
      else if (state.status === "agendado") { agendado++; doneInDay++; }
      else if (state.status === "produzido") { produzido++; doneInDay++; }
      else rascunho++;

      if (state.status === "rascunho") {
        const ageDays = (now - new Date(state.updatedAt).getTime()) / (1000 * 60 * 60 * 24);
        if (ageDays >= STALE_DRAFT_DAYS) {
          staleDrafts.push({ day: d.day, number: p.number, days: Math.floor(ageDays) });
        }
      }
    }
    dayCompletion.push({ day: d.day, done: doneInDay, totalPosts: d.posts.length });
  }

  // 1. Progresso geral
  const pct = total > 0 ? Math.round(((postado + agendado) / total) * 100) : 0;
  insights.push({
    level: pct >= 70 ? "sucesso" : pct >= 30 ? "info" : "atencao",
    title: "Progresso geral",
    message: `${postado + agendado} de ${total} posts já estão agendados ou postados (${pct}%). ${produzido} produzidos aguardando agendamento e ${rascunho} ainda em rascunho.`,
  });

  // 2. Continue de onde parou
  const nextPending = dayCompletion.find((d) => d.done < d.totalPosts);
  if (nextPending) {
    insights.push({
      level: "info",
      title: "Próximo passo sugerido",
      message: `O Dia ${nextPending.day} ainda tem ${nextPending.totalPosts - nextPending.done} post(s) pendente(s). Comece por ali para não perder a sequência.`,
    });
  } else if (total > 0) {
    insights.push({
      level: "sucesso",
      title: "Tudo em dia!",
      message: "Todos os dias do planner têm pelo menos algum avanço em cada post. Bom ritmo.",
    });
  }

  // 3. Rascunhos parados
  if (staleDrafts.length > 0) {
    const worst = staleDrafts.sort((a, b) => b.days - a.days).slice(0, 3);
    insights.push({
      level: "atencao",
      title: "Rascunhos parados",
      message: `${staleDrafts.length} post(s) estão em rascunho há ${STALE_DRAFT_DAYS}+ dias sem mudança de status. Exemplos: ${worst
        .map((w) => `Dia ${w.day} / Post ${w.number} (${w.days}d)`)
        .join(", ")}. Vale revisar se ainda fazem sentido ou se precisam de ajuda para sair do papel.`,
    });
  }

  // 4. Desequilíbrio de pilares
  const pillarEntries = Object.entries(pillarCount);
  if (pillarEntries.length > 1) {
    const avg = total / pillarEntries.length;
    const overused = pillarEntries.filter(([, count]) => count > avg * 1.6);
    if (overused.length > 0) {
      insights.push({
        level: "info",
        title: "Repetição de pilar",
        message: `O(s) pilar(es) ${overused.map(([name]) => `"${name}"`).join(", ")} aparece(m) bem mais que a média. Considere variar os formatos para não cansar a audiência.`,
      });
    }
  }

  // 5. Dias sem nenhum avanço
  const notStarted = dayCompletion.filter((d) => d.done === 0);
  if (notStarted.length > 0 && notStarted.length < allDays.length) {
    insights.push({
      level: "info",
      title: "Dias ainda não iniciados",
      message: `${notStarted.length} dia(s) sem nenhum post produzido, agendado ou postado: ${notStarted
        .slice(0, 8)
        .map((d) => d.day)
        .join(", ")}${notStarted.length > 8 ? "..." : ""}.`,
    });
  }

  return insights;
}
