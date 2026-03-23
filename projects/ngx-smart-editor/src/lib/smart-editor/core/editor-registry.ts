import { EditorNode } from './editor.models';
import { EditorPlugin } from './editor-plugin';
import { isTextNode } from './editor.utils';

export interface EditorRegistry {
  all: EditorPlugin[];
  get: (type: string) => EditorPlugin | undefined;
  parseToken: (input: string) => EditorNode | null;
  serializeNode: (node: EditorNode) => string;
}

export function createEditorRegistry(plugins: EditorPlugin[]): EditorRegistry {
  const all = [...plugins].sort((left, right) => (right.priority ?? 0) - (left.priority ?? 0));
  const map = new Map<string, EditorPlugin>();

  for (const plugin of all) {
    map.set(plugin.type, plugin);
  }

  return {
    all,
    get: (type) => map.get(type),
    parseToken(input) {
      for (const plugin of all) {
        const parsed = plugin.parseMarkdown?.(input) ?? null;
        if (parsed) {
          return parsed;
        }
      }

      return null;
    },
    serializeNode(node): string {
      if (isTextNode(node)) {
        return node.content;
      }

      const serializer = map.get(node.type)?.serializeMarkdown;
      return serializer ? serializer(node) : '';
    },
  };
}
