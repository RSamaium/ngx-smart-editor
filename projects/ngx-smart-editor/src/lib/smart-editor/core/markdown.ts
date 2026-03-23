import { EditorDocument } from './editor.models';
import { createEditorRegistry } from './editor-registry';
import { EditorPlugin } from './editor-plugin';
import { createTextNode, normalizeDocument } from './editor.utils';

const BUSINESS_TOKEN_PATTERN = /\{\{[\s\S]*?\}\}/g;

export function parseMarkdown(markdown: string, plugins: EditorPlugin[] = []): EditorDocument {
  const registry = createEditorRegistry(plugins);
  const nodes: EditorDocument = [];
  let cursor = 0;

  for (const match of markdown.matchAll(BUSINESS_TOKEN_PATTERN)) {
    const start = match.index ?? 0;
    const token = match[0];

    if (start > cursor) {
      nodes.push(createTextNode(markdown.slice(cursor, start)));
    }

    const parsed = registry.parseToken(token);
    if (parsed) {
      nodes.push(parsed);
    } else {
      nodes.push(createTextNode(token));
    }

    cursor = start + token.length;
  }

  if (cursor < markdown.length) {
    nodes.push(createTextNode(markdown.slice(cursor)));
  }

  return normalizeDocument(nodes);
}

export function serializeMarkdown(document: EditorDocument, plugins: EditorPlugin[] = []): string {
  const registry = createEditorRegistry(plugins);
  return normalizeDocument(document)
    .map((node) => registry.serializeNode(node))
    .join('');
}
