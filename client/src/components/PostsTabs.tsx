import React, { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { MarkdownRenderer } from './MarkdownRenderer';
import { StatusBadge, StatusControl, STATUS_DOT } from './StatusControl';
import { usePlanner } from '@/store/plannerStore';
import { Pencil, Check, X } from 'lucide-react';
import type { EditablePost } from '@/hooks/useDayPosts';

interface PostsTabsProps {
  day: number;
  posts: EditablePost[];
}

export function PostsTabs({ day, posts }: PostsTabsProps) {
  const [activeTab, setActiveTab] = useState('1');
  const { getPostState, setContentOverride } = usePlanner();
  const [editing, setEditing] = useState<number | null>(null);
  const [draft, setDraft] = useState('');

  if (!posts || posts.length === 0) {
    return (
      <Card className="p-8 bg-slate-900 border-slate-800">
        <p className="text-gray-400">Nenhum post disponível.</p>
      </Card>
    );
  }

  const startEdit = (post: EditablePost) => {
    setDraft(post.content);
    setEditing(post.number);
  };

  const saveEdit = (post: EditablePost) => {
    setContentOverride(day, post.number, { content: draft });
    setEditing(null);
  };

  return (
    <div className="w-full">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-3 md:grid-cols-9 gap-1 bg-slate-800/50 p-1 mb-6 h-auto">
          {posts.map((post) => {
            const state = getPostState(day, post.number);
            return (
              <TabsTrigger
                key={post.number}
                value={post.number.toString()}
                className="text-xs md:text-sm data-[state=active]:bg-orange-500 data-[state=active]:text-black flex items-center gap-1.5 py-2"
              >
                <span className={`w-1.5 h-1.5 rounded-full ${STATUS_DOT[state.status]}`} />
                <span className="hidden md:inline">Post {post.number}</span>
                <span className="md:hidden">{post.number}</span>
              </TabsTrigger>
            );
          })}
        </TabsList>

        {posts.map((post) => {
          const state = getPostState(day, post.number);
          const isEditing = editing === post.number;
          return (
            <TabsContent key={post.number} value={post.number.toString()} className="mt-0">
              <Card className="p-8 bg-slate-900 border-slate-800">
                {/* Post Header */}
                <div className="mb-6 pb-6 border-b border-slate-700">
                  <div className="flex items-start justify-between mb-4 gap-4 flex-wrap">
                    <div>
                      <div className="inline-block px-3 py-1 rounded-full bg-orange-500/20 text-orange-400 text-xs font-semibold border border-orange-500/30 mb-3">
                        Post {post.number}
                      </div>
                      <h3 className="text-2xl font-bold text-white">{post.title}</h3>
                    </div>
                    <StatusBadge status={state.status} />
                  </div>
                  <div className="flex flex-wrap gap-4">
                    <div>
                      <p className="text-xs text-gray-400 mb-1">Formato</p>
                      <p className="text-sm font-semibold text-orange-400">{post.format}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-400 mb-1">Pilar</p>
                      <p className="text-sm font-semibold text-orange-400">{post.pillar}</p>
                    </div>
                  </div>
                </div>

                {/* Status controls */}
                <div className="mb-6 pb-6 border-b border-slate-700">
                  <StatusControl day={day} number={post.number} />
                </div>

                {/* Post Content */}
                <div className="mb-4 flex items-center justify-between">
                  <p className="text-xs text-gray-400 uppercase tracking-wider font-semibold">Conteúdo</p>
                  {!isEditing ? (
                    <Button size="sm" variant="outline" className="border-orange-500/40 text-orange-400 hover:bg-orange-500/10 h-7 text-xs" onClick={() => startEdit(post)}>
                      <Pencil className="w-3 h-3 mr-1" /> Editar
                    </Button>
                  ) : (
                    <div className="flex gap-2">
                      <Button size="sm" className="bg-orange-500 hover:bg-orange-600 text-black h-7 text-xs" onClick={() => saveEdit(post)}>
                        <Check className="w-3 h-3 mr-1" /> Salvar
                      </Button>
                      <Button size="sm" variant="outline" className="border-slate-600 text-gray-300 h-7 text-xs" onClick={() => setEditing(null)}>
                        <X className="w-3 h-3 mr-1" /> Cancelar
                      </Button>
                    </div>
                  )}
                </div>

                {isEditing ? (
                  <Textarea
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    className="bg-slate-800/60 border-slate-700 text-gray-200 text-sm min-h-[300px] font-mono"
                  />
                ) : post.content ? (
                  <div className="prose prose-invert max-w-none">
                    <MarkdownRenderer content={post.content} className="text-gray-300" />
                  </div>
                ) : (
                  <p className="text-sm text-gray-500 italic">Sem conteúdo ainda. Clique em "Editar" para escrever o roteiro/legenda deste post.</p>
                )}
              </Card>
            </TabsContent>
          );
        })}
      </Tabs>

      {/* Navigation Info */}
      <div className="mt-6 p-4 bg-slate-900 border border-slate-800 rounded-lg text-center text-sm text-gray-400">
        <p>Navegue pelos posts usando as abas acima. Marque o status conforme você produz, agenda e posta cada um.</p>
      </div>
    </div>
  );
}
