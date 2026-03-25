# ngx-smart-editor

`ngx-smart-editor` is an Angular library for inline rich-text editing with dynamic tokens, JSON as the source of truth, and bidirectional JSON ↔ Markdown conversion.

It is designed for use cases such as:

- inline variables inside text
- lightweight Notion-like editing
- plugin-driven custom tokens
- Markdown import/export for business syntax

## Features

- Angular standalone component: `ngx-smart-editor`
- `ControlValueAccessor` support for Reactive Forms
- canonical JSON document model
- Markdown serialization and parsing helpers
- inline variable picker triggered from `{`
- keyboard-first variable search and selection
- extensible plugin architecture

## Installation

Install the package and Angular peer dependencies in your application:

```bash
npm install ngx-smart-editor
```

## Build

Build the library package:

```bash
npm run build:lib
```

This command synchronizes the root `README.md` into `projects/ngx-smart-editor/README.md` before running `ng build ngx-smart-editor`, so the same README is published to npm inside `dist/ngx-smart-editor`.

## Publish

Check the library version before publishing:

```bash
npm run version:check:lib
```

Update `projects/ngx-smart-editor/package.json` before every publication.

Then publish the package:

```bash
npm run publish:lib
```

Equivalent manual commands:

```bash
npm run build:lib
cd dist/ngx-smart-editor
npm publish
```

## Quick Start

Import the component and helpers from the package:

```ts
import { ChangeDetectionStrategy, Component, computed } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import {
  SmartEditorComponent,
  SmartEditorPickerEmptyDirective,
  SmartEditorPickerFooterDirective,
  SmartEditorPickerHeaderDirective,
  SmartEditorPickerOptionDirective,
  defaultEditorPlugins,
  parseMarkdown,
  serializeMarkdown,
  validateDocument,
} from 'ngx-smart-editor';
import type { EditorDocument, VariableOption } from 'ngx-smart-editor';

@Component({
  selector: 'app-editor-demo',
  imports: [
    ReactiveFormsModule,
    SmartEditorComponent,
    SmartEditorPickerHeaderDirective,
    SmartEditorPickerOptionDirective,
    SmartEditorPickerEmptyDirective,
    SmartEditorPickerFooterDirective,
  ],
  template: `
    <ngx-smart-editor
      [formControl]="editorControl"
      [plugins]="plugins"
      [variableOptions]="variableOptions"
      placeholder="Write text and press { to insert a variable"
      ariaLabel="Smart editor"
    >
      <ng-template smartEditorPickerHeader let-query="query">
        <div>
          <strong>Custom picker</strong>
          <p>{{ query ? 'Searching: ' + query : 'Type after { to filter variables.' }}</p>
        </div>
      </ng-template>

      <ng-template smartEditorPickerOption let-option let-active="active">
        <div [attr.data-active]="active">
          <strong>{{ option.label }}</strong>
          <small>{{ option.key }}</small>
        </div>
      </ng-template>

      <ng-template smartEditorPickerEmpty let-query="query">
        <p>No result for "{{ query }}"</p>
      </ng-template>

      <ng-template smartEditorPickerFooter>
        <button type="button">Manage variables</button>
      </ng-template>
    </ngx-smart-editor>

    <pre>{{ markdown() }}</pre>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EditorDemoComponent {
  readonly plugins = defaultEditorPlugins;

  readonly variableOptions: VariableOption[] = [
    { key: 'customer.firstName', label: 'Customer first name' },
    { key: 'customer.lastName', label: 'Customer last name' },
    { key: 'ticket.id', label: 'Ticket ID' },
    { key: 'ticket.status', label: 'Ticket status' },
  ];

  readonly editorControl = new FormControl<EditorDocument>(
    [
      { type: 'text', content: 'Hello ' },
      { type: 'variable', key: 'customer.firstName', label: 'Customer first name' },
      { type: 'text', content: ', your ticket is ' },
      { type: 'variable', key: 'ticket.id', label: 'Ticket ID' },
      { type: 'text', content: '.' },
    ],
    { nonNullable: true },
  );

  readonly markdown = computed(() => serializeMarkdown(this.editorControl.getRawValue(), this.plugins));

  importMarkdown(markdown: string): void {
    this.editorControl.setValue(parseMarkdown(markdown, this.plugins));
  }

  validate(): void {
    console.log(validateDocument(this.editorControl.getRawValue()));
  }
}
```

## Document Model

The editor works with a canonical JSON document:

```ts
type EditorDocument = EditorNode[];

type EditorNode = TextNode | VariableNode | DropdownNode | CustomNode;

interface TextNode {
  type: 'text';
  content: string;
}

interface VariableNode {
  type: 'variable';
  key: string;
  label?: string;
}

interface DropdownNode {
  type: 'dropdown';
  key: string;
  value?: string;
  options: string[];
}
```

JSON is the source of truth. Markdown is an exchange format.

## Markdown Helpers

The library exposes pure helpers for conversion and validation:

```ts
import {
  normalizeDocument,
  parseMarkdown,
  serializeMarkdown,
  validateDocument,
} from 'ngx-smart-editor';
```

Typical usage:

```ts
const markdown = serializeMarkdown(document, defaultEditorPlugins);
const parsed = parseMarkdown(markdown, defaultEditorPlugins);
const normalized = normalizeDocument(parsed);
const validation = validateDocument(normalized);
```

### Variable Markdown Syntax

```md
{{ variable:customer.firstName | label:Customer first name }}
```

### Dropdown Markdown Syntax

```md
{{ dropdown:status | value:in-progress | options:todo,in-progress,done }}
```

Invalid business tokens are preserved as plain text instead of crashing the parser.

## Component Inputs and Output

`ngx-smart-editor` exposes these main bindings:

- `[plugins]`: custom plugin list merged with the default plugins
- `[variableOptions]`: list used by the inline variable picker
- `[placeholder]`: placeholder text when the document is empty
- `[ariaLabel]`: accessibility label for the editor surface
- `(documentChange)`: emits the normalized `EditorDocument`

Because the component implements `ControlValueAccessor`, you can use:

- `[formControl]`
- `formControlName`
- `[(ngModel)]` if needed in your application

## Keyboard Behavior

Current inline interaction includes:

- type normally in text segments
- press `{` to open the variable picker
- keep typing to filter variables by label or key
- press `ArrowDown` / `ArrowUp` to move through matches
- press `Enter` to insert the active variable
- press `Backspace` on an adjacent text boundary to remove an inline token
- click an existing variable token to reopen the picker and replace it

