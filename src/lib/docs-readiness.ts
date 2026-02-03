function extractSection(readme: string, heading: string): string | null {
  const lines = readme.split(/\r?\n/);
  const startIndex = lines.findIndex((line) => line.trim() === heading);
  if (startIndex === -1) return null;
  const sectionLines: string[] = [];
  for (let i = startIndex + 1; i < lines.length; i += 1) {
    const line = lines[i];
    if (line.trim().startsWith('## ')) break;
    sectionLines.push(line);
  }
  return sectionLines.join('\n');
}

export function extractDocsSection(readme: string): string | null {
  return extractSection(readme, '## Docs');
}

export function extractGoldenCommandsSection(readme: string): string | null {
  return extractSection(readme, '## Golden Commands');
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

const SHELL_LANGS = new Set(['bash', 'sh', 'shell']);

export function findGoldenCommands(markdown: string): string[] {
  const commands: string[] = [];
  const lines = markdown.split(/\r?\n/);
  let inFence = false;
  let fenceLang = '';
  let pending = '';

  const flushPending = () => {
    const command = pending.trim();
    if (command) commands.push(command);
    pending = '';
  };

  const isShellFence = (lang: string) => SHELL_LANGS.has(lang.toLowerCase());

  for (const line of lines) {
    const trimmed = line.trim();
    if (!inFence) {
      if (trimmed.startsWith('```')) {
        fenceLang = trimmed.slice(3).trim().split(/\s+/)[0] ?? '';
        inFence = true;
        if (!isShellFence(fenceLang)) pending = '';
      }
      continue;
    }

    if (trimmed.startsWith('```')) {
      if (isShellFence(fenceLang)) flushPending();
      inFence = false;
      fenceLang = '';
      continue;
    }

    if (!isShellFence(fenceLang)) continue;

    if (!trimmed || trimmed.startsWith('#')) continue;
    const withoutPrompt = trimmed.replace(/^\$\s+/, '');
    if (withoutPrompt.endsWith('\\')) {
      pending += `${withoutPrompt.slice(0, -1).trimEnd()} `;
      continue;
    }

    const command = `${pending}${withoutPrompt}`.trim();
    if (command) commands.push(command);
    pending = '';
  }

  if (inFence && isShellFence(fenceLang)) flushPending();

  return commands;
}
