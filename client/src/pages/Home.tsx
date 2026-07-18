import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { ChevronRight, Sparkles, Zap, Settings, AlertTriangle, Info, CheckCircle2 } from "lucide-react";
import { Link } from "wouter";
import { usePlanner } from "@/store/plannerStore";
import { SyncIndicator } from "@/components/SyncIndicator";
import { runInsightsScan, type InsightLevel } from "@/lib/insights";
import { useMemo } from "react";

const LEVEL_ICON: Record<InsightLevel, typeof AlertTriangle> = {
  atencao: AlertTriangle,
  info: Info,
  sucesso: CheckCircle2,
};

const LEVEL_STYLE: Record<InsightLevel, string> = {
  atencao: "border-red-500/30 bg-red-500/10 text-red-300",
  info: "border-blue-500/30 bg-blue-500/10 text-blue-300",
  sucesso: "border-emerald-500/30 bg-emerald-500/10 text-emerald-300",
};

export default function Home() {
  const { allDays, getPostState } = usePlanner();

  const stats = useMemo(() => {
    let total = 0, rascunho = 0, produzido = 0, agendado = 0, postado = 0;
    for (const d of allDays) {
      for (const p of d.posts) {
        total++;
        const s = getPostState(d.day, p.number).status;
        if (s === "rascunho") rascunho++;
        else if (s === "produzido") produzido++;
        else if (s === "agendado") agendado++;
        else if (s === "postado") postado++;
      }
    }
    return { total, rascunho, produzido, agendado, postado };
  }, [allDays, getPostState]);

  const insights = useMemo(() => runInsightsScan({ allDays, getPostState }), [allDays, getPostState]);

  const nextDay = useMemo(() => {
    const sorted = [...allDays].sort((a, b) => a.day - b.day);
    for (const d of sorted) {
      const hasPending = d.posts.some((p) => getPostState(d.day, p.number).status === "rascunho");
      if (hasPending) return d;
    }
    return null;
  }, [allDays, getPostState]);

  const overallPct = stats.total > 0 ? Math.round(((stats.postado + stats.agendado) / stats.total) * 100) : 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-black via-slate-900 to-black">
      {/* Header */}
      <header className="sticky top-0 z-50 backdrop-blur-xl bg-black/90 border-b border-orange-500/30">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-orange-500 to-orange-600 flex items-center justify-center">
                <Sparkles className="w-6 h-6 text-black" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-white">HRC Lab</h1>
                <p className="text-xs text-orange-400">Planner de Conteúdo</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <SyncIndicator />
              <Link href="/admin">
                <a>
                  <Button variant="outline" size="sm" className="border-orange-500 text-orange-400 hover:bg-orange-500/10">
                    <Settings className="w-4 h-4 mr-2" />
                    Admin
                  </Button>
                </a>
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Dashboard */}
      <section className="container mx-auto px-4 py-12">
        <div className="max-w-5xl mx-auto">
          {/* Continue where you left off */}
          {nextDay && (
            <Card className="p-6 mb-8 bg-gradient-to-r from-orange-600 to-orange-500 border-0 text-black flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider opacity-80 mb-1">Continue de onde parou</p>
                <h3 className="text-xl font-bold">Dia {nextDay.day}: {nextDay.title}</h3>
              </div>
              <Link href={`/day/${nextDay.day}`}>
                <a>
                  <Button className="bg-black text-orange-400 hover:bg-slate-900 font-semibold whitespace-nowrap">
                    Ir para o Dia {nextDay.day}
                    <ChevronRight className="w-4 h-4 ml-2" />
                  </Button>
                </a>
              </Link>
            </Card>
          )}

          {/* Overall progress */}
          <Card className="p-6 mb-8 bg-slate-900 border-slate-800">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-bold text-white">Progresso Geral</h3>
              <span className="text-orange-400 font-bold text-lg">{overallPct}%</span>
            </div>
            <Progress value={overallPct} className="h-2 mb-4" />
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
              <div>
                <p className="text-2xl font-bold text-slate-300">{stats.rascunho}</p>
                <p className="text-xs text-gray-500">Rascunho</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-blue-400">{stats.produzido}</p>
                <p className="text-xs text-gray-500">Produzido</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-amber-400">{stats.agendado}</p>
                <p className="text-xs text-gray-500">Agendado</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-emerald-400">{stats.postado}</p>
                <p className="text-xs text-gray-500">Postado</p>
              </div>
            </div>
          </Card>

          {/* Insights */}
          <div className="mb-4">
            <h3 className="text-lg font-bold text-white mb-1 flex items-center gap-2">
              <Zap className="w-5 h-5 text-orange-400" />
              Dicas da Varredura
            </h3>
            <p className="text-sm text-gray-500 mb-4">Análise automática do seu planner, atualizada em tempo real.</p>
          </div>
          <div className="grid gap-3 mb-4">
            {insights.map((insight, i) => {
              const Icon = LEVEL_ICON[insight.level];
              return (
                <Card key={i} className={`p-4 border ${LEVEL_STYLE[insight.level]} bg-slate-900`}>
                  <div className="flex gap-3">
                    <Icon className="w-5 h-5 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="font-semibold text-white text-sm mb-1">{insight.title}</p>
                      <p className="text-sm text-gray-300">{insight.message}</p>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        </div>
      </section>

      {/* Planner Grid */}
      <section className="container mx-auto px-4 pb-24" id="planner">
        <div className="mb-12 max-w-5xl mx-auto">
          <h3 className="text-3xl font-bold text-white mb-2">Seu Planner Estratégico</h3>
          <p className="text-gray-400 text-lg">Clique em qualquer dia para produzir, editar e marcar o status dos posts</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 max-w-5xl mx-auto">
          {[...allDays].sort((a, b) => a.day - b.day).map((day) => {
            const doneCount = day.posts.filter((p) => {
              const s = getPostState(day.day, p.number).status;
              return s === "produzido" || s === "agendado" || s === "postado";
            }).length;
            const postedCount = day.posts.filter((p) => getPostState(day.day, p.number).status === "postado").length;
            const pct = day.posts.length > 0 ? Math.round((doneCount / day.posts.length) * 100) : 0;

            return (
              <Link key={day.day} href={`/day/${day.day}`} className="group">
                <Card className="p-6 h-full hover:shadow-xl hover:border-orange-500 transition-all duration-300 cursor-pointer bg-slate-900 border-slate-800 group overflow-hidden relative">
                  <div className="absolute inset-0 bg-gradient-to-br from-orange-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

                  <div className="relative z-10">
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <div className="text-xs font-bold text-orange-400 mb-2 uppercase tracking-wider">Dia {day.day.toString().padStart(2, '0')}</div>
                        <h4 className="text-lg font-bold text-white group-hover:text-orange-400 transition-colors leading-snug">
                          {day.title}
                        </h4>
                      </div>
                      <div className="w-8 h-8 rounded-lg bg-orange-500/20 flex items-center justify-center group-hover:bg-orange-500 group-hover:text-black transition-all flex-shrink-0">
                        <ChevronRight className="w-4 h-4" />
                      </div>
                    </div>

                    <p className="text-sm text-gray-400 mb-4 line-clamp-2 group-hover:text-gray-300 transition-colors">
                      {day.description}
                    </p>

                    <div className="mb-3">
                      <div className="flex items-center justify-between text-xs mb-1">
                        <span className="text-gray-500">{doneCount}/{day.posts.length} avançou · {postedCount} postado</span>
                        <span className="text-orange-400 font-semibold">{pct}%</span>
                      </div>
                      <Progress value={pct} className="h-1.5" />
                    </div>
                  </div>
                </Card>
              </Link>
            );
          })}
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-orange-500/20 bg-black text-gray-300 py-16">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-8">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 rounded-lg bg-orange-500 flex items-center justify-center">
                  <Sparkles className="w-5 h-5 text-black" />
                </div>
                <h5 className="font-bold text-white text-lg">HRC Lab</h5>
              </div>
              <p className="text-sm text-gray-400">
                Transformando marcas em ícones de autoridade e faturamento no mercado de alto valor.
              </p>
            </div>
            <div>
              <h5 className="font-bold text-white mb-4">Recursos</h5>
              <ul className="space-y-2 text-sm text-gray-400">
                <li><a href="#planner" className="hover:text-orange-400 transition-colors">Planner</a></li>
                <li><Link href="/admin"><a className="hover:text-orange-400 transition-colors">Admin</a></Link></li>
              </ul>
            </div>
            <div>
              <h5 className="font-bold text-white mb-4">Status</h5>
              <ul className="space-y-2 text-sm text-gray-400">
                <li>{stats.total} posts no total</li>
                <li>{stats.postado} já postados</li>
              </ul>
            </div>
          </div>
          <div className="border-t border-orange-500/20 pt-8 text-center text-sm text-gray-500">
            <p>&copy; 2026 HRC Lab. Ecossistema de Conteúdo Estratégico. Todos os direitos reservados.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
