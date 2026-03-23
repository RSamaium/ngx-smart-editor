import { EditorPlugin } from '../core/editor-plugin';
import { isDropdownNode } from '../core/editor.utils';
import { DropdownTokenComponent } from './dropdown-token.component';

const DROPDOWN_PATTERN =
  /^\{\{\s*dropdown:([a-zA-Z0-9._-]+)\s*\|\s*value:([^|}]+)\s*\|\s*options:([^}]+)\s*\}\}$/;

export const dropdownPlugin: EditorPlugin = {
  type: 'dropdown',
  isInline: true,
  component: DropdownTokenComponent,
  priority: 10,
  parseMarkdown(input) {
    const match = input.match(DROPDOWN_PATTERN);
    if (!match) {
      return null;
    }

    return {
      type: 'dropdown',
      key: match[1].trim(),
      value: match[2].trim(),
      options: match[3]
        .split(',')
        .map((option) => option.trim())
        .filter(Boolean),
    };
  },
  serializeMarkdown(node) {
    if (!isDropdownNode(node)) {
      return '';
    }

    return `{{ dropdown:${node.key} | value:${node.value ?? ''} | options:${node.options.join(',')} }}`;
  },
  onInsert(context) {
    return {
      type: 'dropdown',
      key: `dropdown_${context.cursor.nodeIndex + 1}`,
      value: 'pending',
      options: ['pending', 'active', 'done'],
    };
  },
};
