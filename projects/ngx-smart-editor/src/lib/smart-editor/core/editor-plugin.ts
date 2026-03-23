import { InjectionToken, Type } from '@angular/core';
import { EditorCursorPosition, EditorDocument, EditorNode } from './editor.models';

export interface TriggerDefinition {
  char: string;
  action: 'insert' | 'open-menu';
}

export interface EditorPluginContext {
  cursor: EditorCursorPosition;
  document: EditorDocument;
  trigger?: string;
}

export interface EditorPlugin {
  type: string;
  isInline: boolean;
  component: Type<unknown>;
  priority?: number;
  parseMarkdown?: (input: string) => EditorNode | null;
  serializeMarkdown?: (node: EditorNode) => string;
  triggers?: TriggerDefinition[];
  onInsert?: (context: EditorPluginContext) => EditorNode;
  onUpdate?: (node: EditorNode, context: EditorPluginContext) => EditorNode;
}

export const EDITOR_PLUGINS = new InjectionToken<EditorPlugin[]>('EDITOR_PLUGINS', {
  factory: () => [],
});
