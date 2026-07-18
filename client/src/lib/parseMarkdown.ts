export interface ParsedPost {
  number: number;
  title: string;
  pillar: string;
  format: string;
  content: string;
}

export function parseMarkdownPosts(markdown: string): ParsedPost[] {
  const posts: ParsedPost[] = [];

  const postSections = markdown.split(/^### \d+\.\s+/m).slice(1);

  postSections.forEach((section, index) => {
    const lines = section.split("\n");
    const titleLine = lines[0];

    const titleMatch = titleLine.match(/^(.*?)\s*\((.*?)\)$/);
    const title = titleMatch ? titleMatch[1].trim() : titleLine.trim();
    const format = titleMatch ? titleMatch[2].trim() : "Conteúdo";

    let pillar = "Geral";
    const pillarMatch = section.match(/Pilar:\s*([^\n)]+)/);
    if (pillarMatch) {
      pillar = pillarMatch[1].trim();
    }

    posts.push({
      number: index + 1,
      title,
      pillar,
      format,
      content: section.trim(),
    });
  });

  return posts;
}
