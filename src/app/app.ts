import { JsonPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { startWith } from 'rxjs';
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
  selector: 'app-root',
  imports: [
    ReactiveFormsModule,
    SmartEditorComponent,
    SmartEditorPickerHeaderDirective,
    SmartEditorPickerOptionDirective,
    SmartEditorPickerEmptyDirective,
    SmartEditorPickerFooterDirective,
    JsonPipe,
  ],
  templateUrl: './app.html',
  styleUrl: './app.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class App {
  protected readonly plugins = defaultEditorPlugins;
  protected readonly variableOptions: VariableOption[] = [
    { key: 'customer.firstName', label: 'Customer first name' },
    { key: 'customer.lastName', label: 'Customer last name' },
    { key: 'ticket.id', label: 'Ticket ID' },
    { key: 'ticket.status', label: 'Ticket status' },
    { key: 'agent.name', label: 'Agent name' },
  ];
  protected readonly sampleImportMarkdown = '{{ variable:customer.lastName | label:Customer last name }}';
  protected readonly pickerTemplateExample =
    '<ng-template smartEditorPickerHeader let-query="query"> ... </ng-template>\n' +
    '<ng-template smartEditorPickerOption let-option let-active="active"> ... </ng-template>\n' +
    '<ng-template smartEditorPickerEmpty let-query="query"> ... </ng-template>\n' +
    '<ng-template smartEditorPickerFooter> ... </ng-template>';
  protected readonly editorControl = new FormControl<EditorDocument>(
    [
      { type: 'text', content: 'Hello ' },
      { type: 'variable', key: 'customer.firstName', label: 'Customer first name' },
      { type: 'text', content: ', your ticket is ' },
      { type: 'variable', key: 'ticket.id', label: 'Ticket ID' },
      { type: 'text', content: '.' },
    ],
    { nonNullable: true },
  );
  protected readonly documentValue = toSignal(
    this.editorControl.valueChanges.pipe(startWith(this.editorControl.getRawValue())),
    { initialValue: this.editorControl.getRawValue() },
  );
  protected readonly markdown = computed(() => serializeMarkdown(this.documentValue(), this.plugins));
  protected readonly validation = computed(() => validateDocument(this.documentValue()));

  protected importMarkdown(markdown: string): void {
    this.editorControl.setValue(parseMarkdown(markdown, this.plugins));
  }
}
