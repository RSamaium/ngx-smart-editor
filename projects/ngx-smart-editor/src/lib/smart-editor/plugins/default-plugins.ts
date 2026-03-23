import { EditorPlugin } from '../core/editor-plugin';
import { dropdownPlugin } from './dropdown.plugin';
import { textPlugin } from './text.plugin';
import { variablePlugin } from './variable.plugin';

export const defaultEditorPlugins: EditorPlugin[] = [textPlugin, variablePlugin, dropdownPlugin];
