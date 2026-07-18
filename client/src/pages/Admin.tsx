import { useState, useRef, useMemo } from "react";
import { Link } from "wouter";
import { ArrowLeft, Plus, Trash2, Download, Upload, RotateCcw, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { StatusBadge } from "@/components/StatusControl";
import { usePlanner } from "@/store/plannerStore";
import { useDayPosts } from "@/hooks/useDayPosts";
import { toast } from "sonner";

function DayEditor({ day }: { day: number }) {
  const { dayMeta, posts } = useDayPosts(day);
  const { setDayOverride, addPost, removePost, getPostState, setContentOverride, getContentOverride } = usePlanner();
  const [editingPost, setEditingPost] = useState<number | null>(null);
  const [draft, setDraft] = useState("");

  if (!dayMeta) return null;

  const startEdit = (postNumber: number, current: string) => {
    setDraft(current);
    setEditingPost(postNumber);
  };

  const saveEdit = (postNumber: number) => {
    setContentOverride(day, postNumber, { content: draft });
    setEditingPost(null);
    toast.success(`Conteúdo do post ${postNumber} (Dia ${day}) salvo.`);
  };

  return (
    <div className="space-y-6 pt-2">
      <div className="grid md:grid-cols-2 gap-4">
        <div>
          <label className="text-xs text-gray-400 mb-1 block">Tema / Título do dia</label>
          <Input
            defaultValue={dayMeta.theme}
            onBlur={(e) => setDayOverride(day, { theme: e.target.value, title: e.target.value })}
            className="bg-slate-800 border-slate-700 text-white"
          />
        </div>
        <div>
          <label className="text-xs text-gray-400 mb-1 block">Objetivo do dia</label>
          <Input
            defaultValue={dayMeta.description}
            onBlur={(e) => setDayOverride(day, { description: e.target.value })}
            className="bg-slate-800 border-slate-700 text-white"
          />
        </div>
      </div>

      <div className="space-y-3">
        {posts.map((post) => {
          const state = getPostState(day, post.number);
          const isEditing = editingPost === post.number;
          const override = getContentOverride(day, post.number);
          return (
            <Card key={post.number} className="p-4 bg-slate-800/60 border-slate-700">
              <div className="flex flex-wrap items-center gap-3 mb-3">
                <span className="text-xs font-bold text-orange-400">Post {post.number}</span>
                <Input
                  defaultValue={post.format}
                  onBlur={(e) => setContentOverride(day, post.number, { ...override, format: e.target.value })}
                  className="bg-slate-900 border-slate-700 text-white h-8 text-xs w-[180px]"
                  placeholder="Formato"
                />
                <Input
                  defaultValue={post.pillar}
                  onBlur={(e) => setContentOverride(day, post.number, { ...override, pillar: e.target.value })}
                  className="bg-slate-900 border-slate-700 text-white h-8 text-xs w-[200px]"
                  placeholder="Pilar"
                />
                <StatusBadge status={state.status} />
                <div className="ml-auto flex gap-2">
                  {!isEditing ? (
                    <Button size="sm" variant="outline" className="h-7 text-xs border-slate-600 text-gray-300" onClick={() => startEdit(post.number, post.content)}>
                      Editar conteúdo
                    </Button>
                  ) : (
                    <>
                      <Button size="sm" className="h-7 text-xs bg-orange-500 hover:bg-orange-600 text-black" onClick={() => saveEdit(post.number)}>
                        Salvar
                      </Button>
                      <Button size="sm" variant="outline" className="h-7 text-xs border-slate-600 text-gray-300" onClick={() => setEditingPost(null)}>
                        Cancelar
                      </Button>
                    </>
                  )}
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-7 text-xs border-red-500/40 text-red-400 hover:bg-red-500/10"
                    onClick={() => removePost(day, post.number)}
                  >
                    <Trash2 className="w-3 h-3" />
                  </Button>
                </div>
              </div>
              {isEditing && (
                <Textarea
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  className="bg-slate-900 border-slate-700 text-gray-200 text-sm min-h-[220px] font-mono"
                  placeholder="Cole aqui o roteiro/legenda deste post..."
                />
              )}
            </Card>
          );
        })}
      </div>

      <Button size="sm" variant="outline" className="border-orange-500/40 text-orange-400 hover:bg-orange-500/10" onClick={() => addPost(day)}>
        <Plus className="w-4 h-4 mr-1" /> Adicionar post neste dia
      </Button>
    </div>
  );
}

export default function Admin() {
  const { allDays, addDay, exportData, importData, resetAll, getPostState } = usePlanner();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [confirmingReset, setConfirmingReset] = useState(false);

  const sortedDays = useMemo(() => [...allDays].sort((a, b) => a.day - b.day), [allDays]);

  const handleExport = () => {
    const data = exportData();
    const blob = new Blob([data], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `hrc-planner-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Backup exportado.");
  };

  const handleImportClick = () => fileInputRef.current?.click();

  const handleImportFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const ok = importData(String(reader.result));
      if (ok) toast.success("Dados importados com sucesso.");
      else toast.error("Arquivo inválido. Verifique o JSON.");
    };
    reader.readAsText(file);
    e.target.value = "";
  };

  const handleReset = () => {
    if (!confirmingReset) {
      setConfirmingReset(true);
      toast.warning("Clique novamente em \"Resetar tudo\" para confirmar. Isso apaga status e edições salvas.");
      setTimeout(() => setConfirmingReset(false), 5000);
      return;
    }
    resetAll();
    setConfirmingReset(false);
    toast.success("Planner resetado para os dados originais.");
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-black via-slate-900 to-black">
      <header className="sticky top-0 z-50 backdrop-blur-xl bg-black/90 border-b border-orange-500/30">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/">
            <a className="flex items-center gap-2 text-orange-400 hover:text-orange-300 transition-colors">
              <ArrowLeft className="w-5 h-5" />
              <span className="font-medium">Voltar ao Planner</span>
            </a>
          </Link>
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-orange-400" />
            <h1 className="text-lg font-bold text-white">Admin</h1>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-10 max-w-5xl">
        {/* Data management */}
        <Card className="p-6 bg-slate-900 border-slate-800 mb-8">
          <h2 className="text-lg font-bold text-white mb-1">Backup dos dados</h2>
          <p className="text-sm text-gray-400 mb-4">
            Status, conteúdos editados e dias/posts criados ficam salvos no navegador (localStorage). Exporte um
            backup de vez em quando para não perder nada se limpar o cache do navegador.
          </p>
          <div className="flex flex-wrap gap-3">
            <Button size="sm" className="bg-orange-500 hover:bg-orange-600 text-black" onClick={handleExport}>
              <Download className="w-4 h-4 mr-2" /> Exportar backup (.json)
            </Button>
            <Button size="sm" variant="outline" className="border-slate-600 text-gray-300" onClick={handleImportClick}>
              <Upload className="w-4 h-4 mr-2" /> Importar backup
            </Button>
            <input ref={fileInputRef} type="file" accept="application/json" className="hidden" onChange={handleImportFile} />
            <Button size="sm" variant="outline" className="border-red-500/40 text-red-400 hover:bg-red-500/10 ml-auto" onClick={handleReset}>
              <RotateCcw className="w-4 h-4 mr-2" /> {confirmingReset ? "Confirmar reset" : "Resetar tudo"}
            </Button>
          </div>
        </Card>

        {/* Overview table */}
        <Card className="p-6 bg-slate-900 border-slate-800 mb-8">
          <h2 className="text-lg font-bold text-white mb-4">Visão geral</h2>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-slate-800 hover:bg-transparent">
                  <TableHead className="text-gray-400">Dia</TableHead>
                  <TableHead className="text-gray-400">Tema</TableHead>
                  <TableHead className="text-gray-400">Posts</TableHead>
                  <TableHead className="text-gray-400">Rascunho</TableHead>
                  <TableHead className="text-gray-400">Produzido</TableHead>
                  <TableHead className="text-gray-400">Agendado</TableHead>
                  <TableHead className="text-gray-400">Postado</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedDays.map((d) => {
                  const counts = { rascunho: 0, produzido: 0, agendado: 0, postado: 0 };
                  d.posts.forEach((p) => {
                    counts[getPostState(d.day, p.number).status]++;
                  });
                  return (
                    <TableRow key={d.day} className="border-slate-800">
                      <TableCell className="text-white font-medium">{d.day}</TableCell>
                      <TableCell className="text-gray-300 max-w-[240px] truncate">{d.theme}</TableCell>
                      <TableCell className="text-gray-300">{d.posts.length}</TableCell>
                      <TableCell className="text-slate-400">{counts.rascunho}</TableCell>
                      <TableCell className="text-blue-400">{counts.produzido}</TableCell>
                      <TableCell className="text-amber-400">{counts.agendado}</TableCell>
                      <TableCell className="text-emerald-400">{counts.postado}</TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </Card>

        {/* Days editor */}
        <Card className="p-6 bg-slate-900 border-slate-800 mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-white">Editar conteúdo por dia</h2>
            <Button size="sm" variant="outline" className="border-orange-500/40 text-orange-400 hover:bg-orange-500/10" onClick={() => addDay()}>
              <Plus className="w-4 h-4 mr-1" /> Adicionar novo dia
            </Button>
          </div>
          <Accordion type="single" collapsible className="w-full">
            {sortedDays.map((d) => (
              <AccordionItem key={d.day} value={String(d.day)} className="border-slate-800">
                <AccordionTrigger className="text-white hover:no-underline">
                  <span className="flex items-center gap-3">
                    <span className="text-orange-400 font-bold">Dia {d.day}</span>
                    <span className="text-gray-400 text-sm font-normal">{d.theme}</span>
                  </span>
                </AccordionTrigger>
                <AccordionContent>
                  <DayEditor day={d.day} />
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </Card>
      </div>
    </div>
  );
}
