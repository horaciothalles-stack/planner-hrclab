import { useMemo } from "react";
import { useMarkdownContent } from "@/hooks/useMarkdownContent";
import { usePlanner } from "@/store/plannerStore";

export interface EditablePost {
  number: number;
  title: string;
  format: string;
  pillar: string;
  content: string;
  hasCustomContent: boolean;
}

/**
 * Combina os metadados do dia (plannerData + overrides + posts customizados)
 * com o conteúdo em markdown (quando existe) e as edições feitas no Admin.
 */
export function useDayPosts(day: number) {
  const { getDay, getContentOverride } = usePlanner();
  const { content: markdownContent, loading, error } = useMarkdownContent(day);
  const dayMeta = getDay(day);

  const posts: EditablePost[] = useMemo(() => {
    if (!dayMeta) return [];
    return dayMeta.posts.map((p) => {
      const override = getContentOverride(day, p.number);
      const parsed = markdownContent?.posts.find((mp) => mp.number === p.number);
      return {
        number: p.number,
        title: parsed?.title || `${override?.format || p.format}`,
        format: override?.format || p.format,
        pillar: override?.pillar || p.pillar,
        content: override?.content ?? parsed?.content ?? "",
        hasCustomContent: Boolean(override?.content),
      };
    });
  }, [dayMeta, markdownContent, getContentOverride, day]);

  return { dayMeta, posts, loading, error };
}
