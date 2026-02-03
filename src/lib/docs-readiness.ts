export function extractDocsSection(readme: string): string | null {
  const lines = readme.split(/\r?\n/);
  const startIndex = lines.findIndex((line) => line.trim() === '## Docs');
  if (startIndex === -1) return null;
  const sectionLines: string[] = [];
  for (let i = startIndex + 1; i < lines.length; i += 1) {
    const line = lines[i];
    if (line.trim().startsWith('## ')) break;
    sectionLines.push(line);
  }
  return sectionLines.join('\n');
}

export function findRelativeLinks(markdown: string): string[] {
  const links: string[] = [];
  const linkPattern = /\[[^\]]+?\]\(([^)]+?)\)/g;
  for (const match of markdown.matchAll(linkPattern)) {
    const raw = match[1]?.trim();
    if (!raw) continue;
    if (raw.startsWith('#')) continue;
    if (/^[a-z]+:\/\//i.test(raw)) continue;
    const [target] = raw.split('#');
    if (target) links.push(target);
  }
  return links;
}
