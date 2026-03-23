import { CustomNode, DropdownNode, EditorDocument, EditorNode, TextNode, ValidationIssue, ValidationResult, VariableNode } from './editor.models';

export function isTextNode(node: EditorNode | null | undefined): node is TextNode {
  return !!node && node.type === 'text';
}

export function isVariableNode(node: EditorNode | null | undefined): node is VariableNode {
  return !!node && node.type === 'variable';
}

export function isDropdownNode(node: EditorNode | null | undefined): node is DropdownNode {
  return !!node && node.type === 'dropdown';
}

export function createTextNode(content = ''): TextNode {
  return { type: 'text', content };
}

export function normalizeDocument(document: EditorDocument | null | undefined): EditorDocument {
  const nodes = (document ?? []).map(normalizeNode);
  const merged: EditorDocument = [];

  for (const node of nodes) {
    if (isTextNode(node)) {
      if (isTextNode(merged.at(-1))) {
        const previous = merged.at(-1) as TextNode;
        previous.content += node.content;
      } else if (node.content.length > 0) {
        merged.push(node);
      }
      continue;
    }

    merged.push(node);
  }

  return merged.length > 0 ? merged : [createTextNode('')];
}

export function ensureEditableDocument(document: EditorDocument | null | undefined): EditorDocument {
  const normalized = normalizeDocument(document);
  const editable: EditorDocument = [];

  for (const node of normalized) {
    if (!isTextNode(node) && !isTextNode(editable.at(-1))) {
      editable.push(createTextNode(''));
    }

    editable.push(node);

    if (!isTextNode(node)) {
      editable.push(createTextNode(''));
    }
  }

  return normalizeEditableGaps(editable);
}

export function validateDocument(document: EditorDocument | null | undefined): ValidationResult {
  const issues: ValidationIssue[] = [];
  const normalized = document ?? [];

  if (!Array.isArray(normalized)) {
    return {
      isValid: false,
      issues: [{ message: 'Document must be an array of nodes.' }],
    };
  }

  normalized.forEach((node, nodeIndex) => {
    if (!node || typeof node !== 'object' || typeof node.type !== 'string') {
      issues.push({ message: 'Node must define a string type.', nodeIndex });
      return;
    }

    if (node.type === 'text' && typeof (node as Partial<TextNode>).content !== 'string') {
      issues.push({ message: 'Text nodes must define a string content.', nodeIndex });
    }

    if (node.type === 'variable' && typeof (node as Partial<VariableNode>).key !== 'string') {
      issues.push({ message: 'Variable nodes must define a string key.', nodeIndex });
    }

    if (node.type === 'dropdown') {
      const dropdown = node as Partial<DropdownNode>;
      if (typeof dropdown.key !== 'string') {
        issues.push({ message: 'Dropdown nodes must define a string key.', nodeIndex });
      }

      if (!Array.isArray(dropdown.options)) {
        issues.push({ message: 'Dropdown nodes must define an options array.', nodeIndex });
      }
    }
  });

  return {
    isValid: issues.length === 0,
    issues,
  };
}

function normalizeNode(node: EditorNode): EditorNode {
  if (!node || typeof node !== 'object') {
    return createTextNode(String(node ?? ''));
  }

  if (node.type === 'text') {
    return createTextNode(typeof node.content === 'string' ? node.content : '');
  }

  if (node.type === 'variable') {
    return {
      type: 'variable',
      key: typeof node.key === 'string' ? node.key : '',
      label: typeof node.label === 'string' ? node.label : undefined,
    };
  }

  if (node.type === 'dropdown') {
    return {
      type: 'dropdown',
      key: typeof node.key === 'string' ? node.key : '',
      value: typeof node.value === 'string' ? node.value : undefined,
      options: Array.isArray(node.options) ? node.options.map((option) => String(option)) : [],
    };
  }

  return {
    ...(node as CustomNode),
    type: typeof node.type === 'string' ? node.type : 'custom',
  };
}

function normalizeEditableGaps(document: EditorDocument): EditorDocument {
  if (document.length === 0) {
    return [createTextNode('')];
  }

  const nodes: EditorDocument = [];

  for (let index = 0; index < document.length; index += 1) {
    const node = document[index];
    if (isTextNode(node) && isTextNode(document[index + 1])) {
      continue;
    }

    nodes.push(node);
  }

  if (!isTextNode(nodes[0])) {
    nodes.unshift(createTextNode(''));
  }

  if (!isTextNode(nodes.at(-1))) {
    nodes.push(createTextNode(''));
  }

  return nodes;
}
