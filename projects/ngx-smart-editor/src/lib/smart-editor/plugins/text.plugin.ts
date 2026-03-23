import { EditorPlugin } from '../core/editor-plugin';
import { isTextNode } from '../core/editor.utils';
import { TextTokenComponent } from './text-token.component';

export const textPlugin: EditorPlugin = {
  type: 'text',
  isInline: true,
  component: TextTokenComponent,
  serializeMarkdown: (node) => (isTextNode(node) ? node.content : ''),
};
