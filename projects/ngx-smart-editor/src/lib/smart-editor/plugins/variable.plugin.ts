import { EditorPlugin } from '../core/editor-plugin';
import { isVariableNode } from '../core/editor.utils';
import { VariableTokenComponent } from './variable-token.component';

const VARIABLE_PATTERN = /^\{\{\s*variable:([a-zA-Z0-9._-]+)(?:\s*\|\s*label:([^}]+))?\s*\}\}$/;

export const variablePlugin: EditorPlugin = {
  type: 'variable',
  isInline: true,
  component: VariableTokenComponent,
  priority: 20,
  triggers: [{ char: '{', action: 'open-menu' }],
  parseMarkdown(input) {
    const match = input.match(VARIABLE_PATTERN);
    if (!match) {
      return null;
    }

    return {
      type: 'variable',
      key: match[1].trim(),
      label: match[2]?.trim() || undefined,
    };
  },
  serializeMarkdown(node) {
    if (!isVariableNode(node)) {
      return '';
    }

    const label = node.label ? ` | label:${node.label}` : '';
    return `{{ variable:${node.key}${label} }}`;
  },
  onInsert(context) {
    return {
      type: 'variable',
      key: `variable_${context.cursor.nodeIndex + 1}`,
      label: 'Variable',
    };
  },
};
