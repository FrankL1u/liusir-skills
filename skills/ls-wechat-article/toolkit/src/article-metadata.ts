export interface ArticleMetadata {
  title: string;
  content: string;
}

function splitFrontmatter(text: string): { frontmatter: string; content: string } {
  if (!text.startsWith('---\n')) {
    return { frontmatter: '', content: text };
  }

  const end = text.indexOf('\n---', 4);
  if (end < 0) {
    return { frontmatter: '', content: text };
  }

  const boundaryEnd = text.indexOf('\n', end + 4);
  const contentStart = boundaryEnd >= 0 ? boundaryEnd + 1 : text.length;
  return {
    frontmatter: text.slice(0, contentStart),
    content: text.slice(contentStart),
  };
}

export function resolveArticleMetadata(text: string): ArticleMetadata {
  const { content } = splitFrontmatter(text);
  const normalizedContent = content.replace(/^\s+/, '');
  let title = '';

  for (const line of normalizedContent.split(/\r?\n/)) {
    const stripped = line.trim();
    if (/^#\s+/.test(stripped) && !/^##\s+/.test(stripped)) {
      title = stripped.slice(2).trim();
      break;
    }
  }

  return {
    title,
    content: normalizedContent,
  };
}

export function stripPrimaryTitle(text: string): string {
  const metadata = resolveArticleMetadata(text);
  if (!metadata.title) {
    return metadata.content;
  }

  let removed = false;
  return metadata.content
    .split(/\r?\n/)
    .filter(line => {
      if (removed) return true;
      const stripped = line.trim();
      if (/^#\s+/.test(stripped) && stripped.slice(2).trim() === metadata.title) {
        removed = true;
        return false;
      }
      return true;
    })
    .join('\n');
}
