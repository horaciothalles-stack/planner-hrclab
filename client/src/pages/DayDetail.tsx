import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { ChevronLeft, ChevronRight, ArrowLeft, Settings } from "lucide-react";
import { Link, useParams } from "wouter";
import { usePlanner } from "@/store/plannerStore";
import { useDayPosts } from "@/hooks/useDayPosts";
import { PostsTabs } from "@/components/PostsTabs";

export default function DayDetail() {
  const { day: dayParam } = useParams<{ day: string }>();
  const dayNumber = parseInt(dayParam || "1", 10);
  const { allDays, getPostState } = usePlanner();
  const { dayMeta, posts, loading: isLoading, error: contentError } = useDayPosts(dayNumber);

  const sortedDays = [...allDays].sort((a, b) => a.day - b.day);
  const idx = sortedDays.findIndex((d) => d.day === dayNumber);
  const previousDay = idx > 0 ? sortedDays[idx - 1].day : null;
  const nextDay = idx >= 0 && idx < sortedDays.length - 1 ? sortedDays[idx + 1].day : null;

  if (!dayMeta) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-black via-slate-900 to-black flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-4xl font-bold text-white mb-4">Dia não encontrado</h1>
          <Link href="/">
            <a>
              <Button className="bg-orange-500 hover:bg-orange-600 text-black font-semibold">Voltar ao Planner</Button>
            </a>
          </Link>
        </div>
      </div>
    );
  }

  const doneCount = dayMeta.posts.filter((p) => {
    const s = getPostState(dayMeta.day, p.number);
    return s.status === "produzido" || s.status === "agendado" || s.status === "postado";
  }).length;
  const postedCount = dayMeta.posts.filter((p) => getPostState(dayMeta.day, p.number).status === "postado").length;
  const totalPosts = dayMeta.posts.length;
  const donePct = totalPosts > 0 ? Math.round((doneCount / totalPosts) * 100) : 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-black via-slate-900 to-black">
      {/* Header */}
      <header className="sticky top-0 z-50 backdrop-blur-xl bg-black/90 border-b border-orange-500/30">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <Link href="/">
              <a className="flex items-center gap-2 text-orange-400 hover:text-orange-300 transition-colors">
                <ArrowLeft className="w-5 h-5" />
                <span className="font-medium">Voltar</span>
              </a>
            </Link>
            <div className="text-center">
              <p className="text-sm text-gray-400">Dia {dayNumber} de {sortedDays.length}</p>
            </div>
            <Link href="/admin">
              <a className="flex items-center gap-1.5 text-orange-400 hover:text-orange-300 transition-colors text-sm">
                <Settings className="w-4 h-4" />
                <span className="hidden sm:inline">Admin</span>
              </a>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="container mx-auto px-4 py-12 md:py-16">
        <div className="max-w-4xl mx-auto">
          {/* Day Badge */}
          <div className="inline-block px-4 py-2 rounded-full bg-orange-500/20 text-orange-400 text-sm font-semibold mb-6 border border-orange-500/30">
            Dia {dayNumber} de {sortedDays.length}
          </div>

          {/* Title */}
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-4 leading-tight">
            {dayMeta.title}
          </h1>

          {/* Progress */}
          <div className="mb-8">
            <div className="flex items-center justify-between mb-2 text-sm">
              <span className="text-gray-400">
                {doneCount}/{totalPosts} posts avançaram · {postedCount} já postado(s)
              </span>
              <span className="text-orange-400 font-semibold">{donePct}%</span>
            </div>
            <Progress value={donePct} className="h-2" />
          </div>

          {/* Meta Information */}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-6 mb-12">
            <div>
              <p className="text-sm text-gray-400 mb-2">Tema Central</p>
              <p className="text-lg font-semibold text-orange-400">{dayMeta.theme}</p>
            </div>
            <div>
              <p className="text-sm text-gray-400 mb-2">Posts</p>
              <p className="text-lg font-semibold text-orange-400">{totalPosts} posts</p>
            </div>
            <div>
              <p className="text-sm text-gray-400 mb-2">Tipo</p>
              <p className="text-lg font-semibold text-orange-400">Ecossistema</p>
            </div>
          </div>

          {/* Objective Section */}
          <Card className="p-8 bg-gradient-to-br from-orange-500/20 to-orange-600/10 border-orange-500/30 mb-12">
            <h3 className="text-lg font-bold text-white mb-4">Objetivo do Dia</h3>
            <p className="text-gray-300 leading-relaxed">
              {dayMeta.description || "Nenhum objetivo definido ainda. Edite no Admin."}
            </p>
          </Card>

          {/* Content */}
          {contentError ? (
            <Card className="p-8 bg-red-900/20 border-red-500/30 mb-12">
              <h3 className="text-2xl font-bold text-white mb-4">Erro ao Carregar Conteúdo</h3>
              <p className="text-red-300">{contentError}</p>
            </Card>
          ) : isLoading ? (
            <Card className="p-8 bg-slate-900 border-slate-800 mb-12">
              <h3 className="text-2xl font-bold text-white mb-6">Roteiros Detalhados</h3>
              <div className="text-center py-12">
                <p className="text-gray-400">Carregando roteiros...</p>
              </div>
            </Card>
          ) : posts.length > 0 ? (
            <div className="mb-12">
              <h3 className="text-2xl font-bold text-white mb-6">Roteiros Detalhados - {totalPosts} Posts</h3>
              <PostsTabs day={dayNumber} posts={posts} />
            </div>
          ) : (
            <Card className="p-8 bg-slate-900 border-slate-800 mb-12">
              <h3 className="text-2xl font-bold text-white mb-6">Conteúdo Detalhado</h3>
              <div className="text-gray-300 space-y-4">
                <p>Nenhum post cadastrado para este dia ainda. Adicione posts no Admin.</p>
                <Link href="/admin">
                  <a>
                    <Button className="bg-orange-500 hover:bg-orange-600 text-black font-semibold">Ir para o Admin</Button>
                  </a>
                </Link>
              </div>
            </Card>
          )}
        </div>
      </section>

      {/* Navigation */}
      <section className="container mx-auto px-4 pb-12">
        <div className="max-w-4xl mx-auto">
          <div className="grid grid-cols-2 gap-4">
            {previousDay ? (
              <Link href={`/day/${previousDay}`}>
                <a>
                  <Button variant="outline" className="w-full justify-start border-orange-500 text-orange-400 hover:bg-orange-500/10">
                    <ChevronLeft className="w-4 h-4 mr-2" />
                    Dia {previousDay}
                  </Button>
                </a>
              </Link>
            ) : (
              <div></div>
            )}
            {nextDay ? (
              <Link href={`/day/${nextDay}`}>
                <a>
                  <Button variant="outline" className="w-full justify-end border-orange-500 text-orange-400 hover:bg-orange-500/10">
                    Dia {nextDay}
                    <ChevronRight className="w-4 h-4 ml-2" />
                  </Button>
                </a>
              </Link>
            ) : (
              <div></div>
            )}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-orange-500/20 bg-black py-12">
        <div className="container mx-auto px-4 text-center text-sm text-gray-400">
          <p>&copy; 2026 HRC Lab. Ecossistema de Conteúdo Estratégico.</p>
        </div>
      </footer>
    </div>
  );
}
