import { parseMarkdown, serializeMarkdown } from './markdown';
import { normalizeDocument, validateDocument } from './editor.utils';
import { defaultEditorPlugins } from '../plugins/default-plugins';

describe('smart editor markdown', () => {
  it('serializes business nodes to markdown', () => {
    const markdown = serializeMarkdown(
      [
        { type: 'text', content: 'Hello ' },
        { type: 'variable', key: 'customer.firstName', label: 'Customer first name' },
        { type: 'text', content: '.' },
      ],
      defaultEditorPlugins,
    );

    expect(markdown).toBe('Hello {{ variable:customer.firstName | label:Customer first name }}.');
  });

  it('parses markdown tokens into canonical nodes', () => {
    const document = parseMarkdown(
      'Status: {{ dropdown:status | value:in-progress | options:todo,in-progress,done }}',
      defaultEditorPlugins,
    );

    expect(document).toEqual([
      { type: 'text', content: 'Status: ' },
      {
        type: 'dropdown',
        key: 'status',
        value: 'in-progress',
        options: ['todo', 'in-progress', 'done'],
      },
    ]);
  });

  it('keeps invalid syntax as text', () => {
    const document = parseMarkdown('Broken {{ variable }} token', defaultEditorPlugins);
    expect(document).toEqual([{ type: 'text', content: 'Broken {{ variable }} token' }]);
  });

  it('preserves business structure through round-trip', () => {
    const original = [
      { type: 'text', content: 'Hi ' },
      { type: 'variable', key: 'agent.name', label: 'Agent' },
      { type: 'text', content: ', state is ' },
      { type: 'dropdown', key: 'status', value: 'done', options: ['todo', 'done'] },
    ] as const;

    const roundTrip = parseMarkdown(serializeMarkdown([...original], defaultEditorPlugins), defaultEditorPlugins);
    expect(roundTrip).toEqual(normalizeDocument([...original]));
  });

  it('validates malformed nodes', () => {
    const result = validateDocument([{ type: 'variable' } as never]);
    expect(result.isValid).toBeFalsy();
    expect(result.issues[0]?.message).toContain('Variable nodes');
  });
});
