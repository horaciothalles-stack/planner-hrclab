import { useState, useEffect } from 'react';
import { parseMarkdownPosts, type ParsedPost } from '@/lib/parseMarkdown';

export type Post = ParsedPost;

export interface DayContent {
  dayNumber: number;
  posts: Post[];
  rawMarkdown: string;
}

export function useMarkdownContent(dayNumber: number) {
  const [content, setContent] = useState<DayContent | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchContent = async () => {
      try {
        setLoading(true);
        const dayStr = dayNumber.toString().padStart(2, '0');
        const response = await fetch(`/content/conteudo_dia_${dayStr}.md`);

        if (!response.ok) {
          // Dias novos criados no Admin ainda não têm markdown — não é um erro fatal.
          setContent({ dayNumber, posts: [], rawMarkdown: '' });
          setError(null);
          return;
        }

        const markdown = await response.text();
        const posts = parseMarkdownPosts(markdown);

        setContent({
          dayNumber,
          posts,
          rawMarkdown: markdown,
        });
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
        setContent({ dayNumber, posts: [], rawMarkdown: '' });
      } finally {
        setLoading(false);
      }
    };

    fetchContent();
  }, [dayNumber]);

  return { content, loading, error };
}
