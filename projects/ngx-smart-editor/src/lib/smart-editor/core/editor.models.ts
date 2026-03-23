export type EditorDocument = EditorNode[];

export type EditorNode = TextNode | VariableNode | DropdownNode | CustomNode;

export interface BaseNode {
  type: string;
}

export interface TextNode extends BaseNode {
  type: 'text';
  content: string;
}

export interface VariableNode extends BaseNode {
  type: 'variable';
  key: string;
  label?: string;
}

export interface DropdownNode extends BaseNode {
  type: 'dropdown';
  key: string;
  value?: string;
  options: string[];
}

export interface CustomNode extends BaseNode {
  [key: string]: unknown;
}

export interface VariableOption {
  key: string;
  label: string;
}

export interface ValidationIssue {
  message: string;
  nodeIndex?: number;
}

export interface ValidationResult {
  isValid: boolean;
  issues: ValidationIssue[];
}

export interface EditorCursorPosition {
  nodeIndex: number;
  offset: number;
}
