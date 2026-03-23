import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  computed,
  effect,
  forwardRef,
  inject,
  input,
  output,
  signal,
  viewChild,
} from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';
import { EditorCursorPosition, EditorDocument, EditorNode, TextNode, VariableNode, VariableOption } from './core/editor.models';
import { createEditorRegistry } from './core/editor-registry';
import { EDITOR_PLUGINS, EditorPlugin } from './core/editor-plugin';
import { createTextNode, ensureEditableDocument, isTextNode, normalizeDocument } from './core/editor.utils';
import { SmartEditorPluginHostComponent } from './plugin-host.component';
import { defaultEditorPlugins } from './plugins/default-plugins';

interface PickerPosition {
  left: number;
  top: number;
}

interface VariablePickerRequest {
  anchorElement?: HTMLElement | null;
  cursor?: EditorCursorPosition | null;
  replaceIndex?: number | null;
}

@Component({
  selector: 'ngx-smart-editor',
  imports: [SmartEditorPluginHostComponent],
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => SmartEditorComponent),
      multi: true,
    },
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'smart-editor-host',
  },
  template: `
    <section class="editor-frame" [class.is-disabled]="disabled()">
      <header class="toolbar">
        <button type="button" class="tool" (click)="openVariablePickerFromToolbar()" [disabled]="disabled()">
          Add variable
        </button>
        <button type="button" class="tool secondary" (click)="insertFromToolbar('dropdown')" [disabled]="disabled()">
          Add dropdown
        </button>
      </header>

      <div
        #surface
        class="editor-surface"
        role="textbox"
        aria-multiline="false"
        [attr.aria-label]="ariaLabel()"
        [attr.data-empty]="isVisuallyEmpty()"
        (click)="onSurfaceClick($event)"
      >
        @for (node of document(); track $index) {
          @if (node.type === 'text') {
            <span class="text-node"
              [attr.data-node-index]="$index"
              [attr.contenteditable]="disabled() ? 'false' : 'plaintext-only'"
              spellcheck="false"
              (focus)="onTextFocus($index, $event)"
              (blur)="onTextBlur($index)"
              (input)="onTextInput($index, $event)"
              (keydown)="onTextKeydown($index, $event)">{{ getRenderedText($index, node) }}</span>
          } @else {
            <button type="button"
              class="token-node"
              [attr.data-node-index]="$index"
              [disabled]="disabled()"
              (click)="onTokenClick($index, node, $event)"
              (focus)="activeIndex.set($index)"
              (keydown)="onTokenKeydown($index, $event)"><smart-editor-plugin-host [node]="node" [plugin]="registry().get(node.type)" /></button>
          }
        }

        @if (isVisuallyEmpty()) {
          <span class="placeholder">{{ placeholder() }}</span>
        }
      </div>

      @if (variablePickerOpen()) {
        <div class="picker-backdrop" (click)="closeVariablePicker()"></div>
        <section
          class="variable-picker"
          [class.is-mobile]="pickerMobile()"
          [style.left.px]="pickerMobile() ? null : pickerPosition()?.left ?? null"
          [style.top.px]="pickerMobile() ? null : pickerPosition()?.top ?? null"
          aria-label="Variable picker"
        >
          <header class="picker-header">
            <div>
              <strong>Variables</strong>
              <p>
                @if (variableQuery()) {
                  Search: <span class="picker-query">{{ variableQuery() }}</span>
                } @else {
                  Choose a variable to insert in the text.
                }
              </p>
            </div>
            <button type="button" class="picker-close" (click)="closeVariablePicker()">Close</button>
          </header>

          <div class="picker-list" role="listbox">
            @for (option of filteredVariableOptions(); track option.key; let optionIndex = $index) {
              <button
                type="button"
                class="picker-option"
                [class.is-active]="optionIndex === activeVariableOptionIndex()"
                [attr.aria-selected]="optionIndex === activeVariableOptionIndex()"
                (click)="selectVariable(option)"
              >
                <span class="picker-option-label">{{ option.label }}</span>
                <span class="picker-option-key">{{ option.key }}</span>
              </button>
            }

            @if (filteredVariableOptions().length === 0) {
              <p class="picker-empty">No variable matches "{{ variableQuery() }}".</p>
            }
          </div>
        </section>
      }
    </section>
  `,
  styles: `
    :host {
      display: block;
    }

    .editor-frame {
      position: relative;
      border: 1px solid #c7d1da;
      border-radius: 1.25rem;
      background: #f8fafb;
      box-shadow: 0 18px 40px rgba(18, 37, 51, 0.08);
      overflow: hidden;
      transition:
        border-color 120ms ease,
        box-shadow 120ms ease;
    }

    .editor-frame:focus-within {
      border-color: #0e7490;
      box-shadow:
        0 0 0 3px rgba(14, 116, 144, 0.14),
        0 18px 40px rgba(18, 37, 51, 0.08);
    }

    .toolbar {
      display: flex;
      flex-wrap: wrap;
      gap: 0.75rem;
      padding: 0.85rem 1rem;
      border-bottom: 1px solid #dbe3e8;
      background: linear-gradient(90deg, #fef3d5 0%, #fffaf0 45%, #f3fbff 100%);
    }

    .tool {
      border: 0;
      border-radius: 999px;
      background: #17394b;
      color: #f7fbfd;
      padding: 0.5rem 0.85rem;
      font: 600 0.9rem/1 "IBM Plex Sans", "Segoe UI", sans-serif;
      cursor: pointer;
    }

    .tool.secondary {
      background: #b36400;
    }

    .editor-surface {
      position: relative;
      min-height: 8rem;
      padding: 1rem;
      display: flex;
      flex-wrap: wrap;
      gap: 0.3rem;
      align-items: center;
      cursor: text;
      touch-action: manipulation;
      -webkit-user-select: text;
      user-select: text;
      font: 400 1rem/1.55 "Literata", Georgia, serif;
      color: #102331;
    }

    .text-node {
      min-width: 0.35rem;
      min-height: 1.6rem;
      padding-block: 0.1rem;
      outline: none;
      white-space: pre-wrap;
      word-break: break-word;
    }

    .token-node {
      border: 0;
      padding: 0;
      background: transparent;
      cursor: pointer;
    }

    .tool:focus-visible,
    .picker-option:focus-visible,
    .picker-close:focus-visible {
      outline: 2px solid #0e7490;
      outline-offset: 2px;
      border-radius: 0.4rem;
    }

    .token-node:focus-visible,
    .text-node:focus-visible {
      outline: none;
    }

    .placeholder {
      position: absolute;
      inset: 1rem auto auto 1rem;
      color: #6a7780;
      pointer-events: none;
      font-style: italic;
    }

    .picker-backdrop {
      position: fixed;
      inset: 0;
      z-index: 1600;
      background: rgba(16, 35, 49, 0.12);
    }

    .variable-picker {
      position: fixed;
      z-index: 1601;
      width: min(24rem, calc(100vw - 2rem));
      border: 1px solid #dbe3e8;
      border-radius: 1rem;
      background: #ffffff;
      box-shadow: 0 24px 50px rgba(16, 35, 49, 0.18);
      overflow: hidden;
    }

    .variable-picker.is-mobile {
      inset: auto 0 0 0;
      width: auto;
      border-radius: 1.1rem 1.1rem 0 0;
    }

    .picker-header {
      display: flex;
      justify-content: space-between;
      gap: 1rem;
      padding: 1rem;
      border-bottom: 1px solid #e5edf1;
      background: #f8fbfc;
    }

    .picker-header p {
      margin: 0.2rem 0 0;
      color: #59717f;
      font: 400 0.9rem/1.4 "IBM Plex Sans", "Segoe UI", sans-serif;
    }

    .picker-close {
      border: 0;
      background: transparent;
      color: #17394b;
      font: 600 0.9rem/1 "IBM Plex Sans", "Segoe UI", sans-serif;
      cursor: pointer;
    }

    .picker-list {
      display: grid;
      max-height: min(18rem, 55vh);
      overflow: auto;
      padding: 0.5rem;
      gap: 0.35rem;
    }

    .picker-option {
      display: grid;
      gap: 0.2rem;
      border: 1px solid #e1e8ec;
      border-radius: 0.8rem;
      background: #ffffff;
      color: #102331;
      padding: 0.8rem 0.9rem;
      text-align: left;
      cursor: pointer;
    }

    .picker-option.is-active {
      border-color: #0e7490;
      background: #ecfeff;
      box-shadow: inset 0 0 0 1px rgba(14, 116, 144, 0.12);
    }

    .picker-option-label {
      font: 600 0.95rem/1.2 "IBM Plex Sans", "Segoe UI", sans-serif;
    }

    .picker-option-key {
      color: #6c7e88;
      font: 400 0.85rem/1.2 "IBM Plex Mono", monospace;
    }

    .picker-query {
      color: #17394b;
      font-weight: 600;
    }

    .picker-empty {
      margin: 0;
      border: 1px dashed #c8d5dc;
      border-radius: 0.8rem;
      padding: 0.9rem;
      color: #59717f;
      font: 400 0.92rem/1.4 "IBM Plex Sans", "Segoe UI", sans-serif;
    }

    .is-disabled {
      opacity: 0.72;
    }

    @media (max-width: 720px) {
      .editor-surface {
        min-height: 10rem;
        padding: 0.9rem;
      }

      .picker-list {
        max-height: 50vh;
      }
    }
  `,
})
export class SmartEditorComponent implements ControlValueAccessor {
  readonly plugins = input<EditorPlugin[]>([]);
  readonly variableOptions = input<VariableOption[]>([]);
  readonly placeholder = input('Write inline content and press { to insert a variable');
  readonly ariaLabel = input('Smart editor');
  readonly documentChange = output<EditorDocument>();

  protected readonly activeIndex = signal(0);
  protected readonly disabled = signal(false);
  protected readonly document = signal<EditorDocument>([createTextNode('')]);
  protected readonly editingIndex = signal<number | null>(null);
  protected readonly variablePickerOpen = signal(false);
  protected readonly variableQuery = signal('');
  protected readonly pickerMobile = signal(false);
  protected readonly pickerPosition = signal<PickerPosition | null>(null);
  protected readonly registry = computed(() => createEditorRegistry(this.resolvedPlugins()));
  protected readonly resolvedVariableOptions = computed(() => {
    return this.variableOptions().length > 0
      ? this.variableOptions()
      : [
          { key: 'customer.firstName', label: 'Customer first name' },
          { key: 'customer.lastName', label: 'Customer last name' },
          { key: 'ticket.id', label: 'Ticket ID' },
        ];
  });
  protected readonly filteredVariableOptions = computed(() => {
    const query = this.variableQuery().trim().toLowerCase();
    if (!query) {
      return this.resolvedVariableOptions();
    }

    return this.resolvedVariableOptions().filter((option) => {
      const haystack = `${option.label} ${option.key}`.toLowerCase();
      return haystack.includes(query);
    });
  });
  protected readonly activeVariableOptionIndex = computed(() => {
    const options = this.filteredVariableOptions();
    if (options.length === 0) {
      return -1;
    }

    return Math.min(this.variableSelectionIndex(), options.length - 1);
  });
  protected readonly isVisuallyEmpty = computed(() => {
    const normalized = normalizeDocument(this.document());
    return normalized.length === 1 && this.asTextNode(normalized[0]).content.length === 0;
  });

  private readonly externalPlugins = inject(EDITOR_PLUGINS);
  private readonly surface = viewChild.required<ElementRef<HTMLElement>>('surface');
  private readonly resolvedPlugins = computed<EditorPlugin[]>(() => {
    const merged = [...defaultEditorPlugins, ...this.externalPlugins, ...this.plugins()];
    const unique = new Map<string, EditorPlugin>();

    for (const plugin of merged) {
      unique.set(plugin.type, plugin);
    }

    return [...unique.values()];
  });
  private readonly pendingVariableCursor = signal<EditorCursorPosition | null>(null);
  private readonly pendingVariableReplaceIndex = signal<number | null>(null);
  private readonly variableSelectionIndex = signal(0);

  private editingSnapshot = '';
  private pickerAnchorElement: HTMLElement | null = null;
  private onChange: (value: EditorDocument) => void = () => undefined;
  private onTouched: () => void = () => undefined;

  constructor() {
    effect(() => {
      this.document();
      queueMicrotask(() => this.syncEmptyTextNodes());
    });
  }

  writeValue(value: EditorDocument | null): void {
    this.resetVariablePickerState();
    this.document.set(ensureEditableDocument(value));
  }

  registerOnChange(fn: (value: EditorDocument) => void): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  setDisabledState(isDisabled: boolean): void {
    this.disabled.set(isDisabled);
  }

  protected asTextNode(node: EditorNode): TextNode {
    return isTextNode(node) ? node : createTextNode('');
  }

  protected getRenderedText(index: number, node: EditorNode): string {
    return this.editingIndex() === index ? this.editingSnapshot : this.asTextNode(node).content;
  }

  protected onTextFocus(index: number, event: FocusEvent): void {
    this.activeIndex.set(index);
    this.editingIndex.set(index);
    this.editingSnapshot = (event.target as HTMLElement).textContent ?? '';
  }

  protected onTextBlur(index: number): void {
    if (this.editingIndex() === index) {
      this.editingIndex.set(null);
      this.editingSnapshot = '';
    }
  }

  protected onSurfaceClick(event: MouseEvent): void {
    const target = event.target as HTMLElement | null;
    if (target === this.surface().nativeElement || target?.classList.contains('placeholder')) {
      this.focusTrailingTextNode();
    }
  }

  protected onTextInput(index: number, event: Event): void {
    const element = event.target as HTMLElement;
    if (this.syncVariableQueryFromInput(index, element)) {
      return;
    }

    const caretOffset = this.getCaretOffset(element);
    let content = element.textContent ?? '';

    if (caretOffset > 0 && content[caretOffset - 1] === '{') {
      content = `${content.slice(0, caretOffset - 1)}${content.slice(caretOffset)}`;
      element.textContent = content;
      this.syncTextNode(index, content);
      this.restoreTextSelection(index, caretOffset - 1);
      this.openVariablePicker({ cursor: { nodeIndex: index, offset: caretOffset - 1 } });
      return;
    }

    this.syncTextNode(index, content);
  }

  protected onTextKeydown(index: number, event: KeyboardEvent): void {
    if (this.disabled()) {
      return;
    }

    const node = this.document()[index];
    if (!isTextNode(node)) {
      return;
    }

    const caretOffset = this.getCaretOffset(event.currentTarget as HTMLElement);

    if (this.handleVariableQueryKeydown(index, event)) {
      return;
    }

    if (!event.ctrlKey && !event.metaKey && !event.altKey && event.key === '{') {
      event.preventDefault();
      this.openVariablePicker({ cursor: { nodeIndex: index, offset: caretOffset } });
      return;
    }

    if (event.key === 'Backspace' && caretOffset === 0 && index > 0 && this.document()[index - 1]?.type !== 'text') {
      event.preventDefault();
      const previousTextIndex = this.findAdjacentTextIndex(index - 1, -1);
      const previousTextNode = previousTextIndex !== null ? this.document()[previousTextIndex] : null;
      const previousTextLength = isTextNode(previousTextNode) ? previousTextNode.content.length : 0;
      this.removeNode(index - 1, {
        focusIndex: previousTextIndex ?? 0,
        focusMode: previousTextIndex !== null ? 'end' : 'start',
        focusOffset: previousTextLength,
      });
      return;
    }

    if (
      event.key === 'Delete' &&
      caretOffset === node.content.length &&
      index < this.document().length - 1 &&
      this.document()[index + 1]?.type !== 'text'
    ) {
      event.preventDefault();
      this.removeNode(index + 1, { focusIndex: index, focusMode: 'end', focusOffset: caretOffset });
      return;
    }

    if (event.key === 'ArrowLeft' && caretOffset === 0) {
      event.preventDefault();
      this.focusNode(index - 1, 'end');
      return;
    }

    if (event.key === 'ArrowRight' && caretOffset === node.content.length) {
      event.preventDefault();
      this.focusNode(index + 1, 'start');
    }
  }

  protected onTokenClick(index: number, node: EditorNode, event: MouseEvent): void {
    this.activeIndex.set(index);

    if (this.disabled() || node.type !== 'variable') {
      return;
    }

    event.preventDefault();
    event.stopPropagation();
    this.openVariablePicker({
      anchorElement: event.currentTarget as HTMLElement,
      replaceIndex: index,
    });
  }

  protected onTokenKeydown(index: number, event: KeyboardEvent): void {
    if (this.disabled()) {
      return;
    }

    if (event.key === 'Backspace' || event.key === 'Delete') {
      event.preventDefault();
      const previousTextIndex = this.findAdjacentTextIndex(index, -1);
      const nextTextIndex = this.findAdjacentTextIndex(index, 1);
      const previousTextNode = previousTextIndex !== null ? this.document()[previousTextIndex] : null;
      const previousTextLength = isTextNode(previousTextNode) ? previousTextNode.content.length : 0;
      this.removeNode(index, {
        focusIndex: previousTextIndex ?? nextTextIndex ?? 0,
        focusMode: previousTextIndex !== null ? 'end' : 'start',
        focusOffset: previousTextIndex !== null ? previousTextLength : 0,
      });
      return;
    }

    if (event.key === 'ArrowLeft') {
      event.preventDefault();
      this.focusNode(index - 1, 'end');
      return;
    }

    if (event.key === 'ArrowRight') {
      event.preventDefault();
      this.focusNode(index + 1, 'start');
    }
  }

  protected openVariablePickerFromToolbar(): void {
    const anchorIndex = Math.min(this.activeIndex(), this.document().length - 1);
    const targetNode = this.document()[anchorIndex];
    const offset = isTextNode(targetNode) ? targetNode.content.length : 0;
    this.openVariablePicker({ cursor: { nodeIndex: anchorIndex, offset } });
  }

  protected closeVariablePicker(): void {
    this.resetVariablePickerState();
  }

  protected selectVariable(option: VariableOption): void {
    const node: VariableNode = {
      type: 'variable',
      key: option.key,
      label: option.label,
    };
    const replaceIndex = this.pendingVariableReplaceIndex();

    if (replaceIndex !== null) {
      this.replaceVariableNode(replaceIndex, node);
      this.closeVariablePicker();
      return;
    }

    const cursor = this.pendingVariableCursor();
    if (!cursor) {
      return;
    }

    this.insertVariableNode(node, cursor, false);
    this.closeVariablePicker();
  }

  protected insertFromToolbar(type: string): void {
    const anchorIndex = Math.min(this.activeIndex(), this.document().length - 1);
    const targetNode = this.document()[anchorIndex];

    if (isTextNode(targetNode)) {
      this.insertPluginNode(type, { nodeIndex: anchorIndex, offset: targetNode.content.length }, false);
      return;
    }

    const insertionIndex = Math.max(anchorIndex, 0);
    const next = [...this.document()];
    next.splice(insertionIndex + 1, 0, createTextNode(''));
    this.syncDocument(next, { focusIndex: insertionIndex + 1, focusMode: 'start' });
    this.insertPluginNode(type, { nodeIndex: insertionIndex + 1, offset: 0 }, false);
  }

  protected focusTrailingTextNode(): void {
    this.focusNode(this.document().length - 1, 'end');
  }

  private openVariablePicker(request: VariablePickerRequest): void {
    this.variableQuery.set('');
    this.variableSelectionIndex.set(0);
    this.pendingVariableCursor.set(request.cursor ?? null);
    this.pendingVariableReplaceIndex.set(request.replaceIndex ?? null);
    this.pickerAnchorElement = request.anchorElement ?? null;
    this.variablePickerOpen.set(true);
    queueMicrotask(() => this.updatePickerPosition(this.pickerAnchorElement));
    this.onTouched();
  }

  private replaceVariableNode(index: number, node: VariableNode): void {
    if (this.document()[index]?.type !== 'variable') {
      return;
    }

    const next = [...this.document()];
    next[index] = node;
    this.syncDocument(next, { focusIndex: index, focusMode: 'token' });
  }

  private insertVariableNode(node: VariableNode, cursor: EditorCursorPosition, focusToken: boolean): void {
    const current = this.document()[cursor.nodeIndex];
    if (!isTextNode(current)) {
      return;
    }

    const before = current.content.slice(0, cursor.offset);
    const after = current.content.slice(cursor.offset);
    const next = [...this.document()];
    next.splice(cursor.nodeIndex, 1, createTextNode(before), node, createTextNode(after));
    this.syncDocument(next, {
      focusIndex: focusToken ? cursor.nodeIndex + 1 : cursor.nodeIndex + 2,
      focusMode: focusToken ? 'token' : 'start',
    });
  }

  private insertPluginNode(type: string, cursor: EditorCursorPosition, focusToken: boolean): void {
    const plugin = this.registry().get(type);
    if (!plugin) {
      return;
    }

    const current = this.document()[cursor.nodeIndex];
    const node =
      plugin.onInsert?.({
        cursor,
        document: normalizeDocument(this.document()),
        trigger: type === 'variable' ? '{' : undefined,
      }) ?? null;

    if (!node) {
      return;
    }

    if (type === 'variable') {
      this.insertVariableNode(node as VariableNode, cursor, focusToken);
      return;
    }

    if (!isTextNode(current)) {
      return;
    }

    const before = current.content.slice(0, cursor.offset);
    const after = current.content.slice(cursor.offset);
    const next = [...this.document()];
    next.splice(cursor.nodeIndex, 1, createTextNode(before), node, createTextNode(after));
    this.syncDocument(next, {
      focusIndex: focusToken ? cursor.nodeIndex + 1 : cursor.nodeIndex + 2,
      focusMode: focusToken ? 'token' : 'start',
    });
  }

  private removeNode(
    index: number,
    options: { focusIndex: number; focusMode: 'start' | 'end' | 'token'; focusOffset?: number },
  ): void {
    const next = [...this.document()];
    next.splice(index, 1);
    this.syncDocument(next, options);
  }

  private syncTextNode(index: number, content: string): void {
    const next = [...this.document()];
    next[index] = createTextNode(content);
    this.syncDocument(next, { emitOnly: true, markTouched: false });
  }

  private syncDocument(
    document: EditorDocument,
    options: {
      emitOnly?: boolean;
      focusIndex?: number;
      focusMode?: 'start' | 'end' | 'token';
      focusOffset?: number;
      markTouched?: boolean;
    } = {},
  ): void {
    const editable = ensureEditableDocument(document);
    this.document.set(editable);

    const value = normalizeDocument(editable);
    this.onChange(value);
    this.documentChange.emit(value);

    if (options.markTouched !== false) {
      this.onTouched();
    }

    if (options.emitOnly) {
      return;
    }

    this.activeIndex.set(Math.min(options.focusIndex ?? this.activeIndex(), editable.length - 1));
    queueMicrotask(() => {
      if (typeof options.focusIndex === 'number') {
        this.focusNode(options.focusIndex, options.focusMode ?? 'end', options.focusOffset);
      }
    });
  }

  private focusNode(index: number, mode: 'start' | 'end' | 'token', offset?: number): void {
    const element = this.surface().nativeElement.querySelector<HTMLElement>(`[data-node-index="${index}"]`);
    if (!element) {
      return;
    }

    element.focus();
    this.activeIndex.set(index);

    if (mode === 'token' || element.getAttribute('contenteditable') === 'false') {
      return;
    }

    this.setCaretOnElement(element, offset ?? (mode === 'start' ? 0 : element.textContent?.length ?? 0));
  }

  private setCaretOnElement(element: HTMLElement, offset: number): void {
    const selection = window.getSelection();
    if (!selection) {
      return;
    }

    const target = element.firstChild ?? element.appendChild(document.createTextNode(element.textContent ?? ''));
    const safeOffset = Math.max(0, Math.min(offset, target.textContent?.length ?? 0));
    const range = document.createRange();
    range.setStart(target, safeOffset);
    range.collapse(true);
    selection.removeAllRanges();
    selection.addRange(range);
  }


  private restoreTextSelection(index: number, offset: number): void {
    queueMicrotask(() => {
      const element = this.surface().nativeElement.querySelector<HTMLElement>(`[data-node-index="${index}"]`);
      if (!element || element.getAttribute('contenteditable') === 'false') {
        return;
      }

      this.editingIndex.set(index);
      element.focus();
      this.setCaretOnElement(element, offset);
    });
  }

  private getCaretOffset(element: HTMLElement): number {
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) {
      return element.textContent?.length ?? 0;
    }

    const range = selection.getRangeAt(0).cloneRange();
    range.selectNodeContents(element);
    range.setEnd(selection.anchorNode ?? element, selection.anchorOffset);
    return range.toString().length;
  }

  private findAdjacentTextIndex(index: number, direction: -1 | 1): number | null {
    let cursor = index + direction;
    while (cursor >= 0 && cursor < this.document().length) {
      if (isTextNode(this.document()[cursor])) {
        return cursor;
      }

      cursor += direction;
    }

    return null;
  }

  private updatePickerPosition(anchorElement: HTMLElement | null = null): void {
    const mobile = window.innerWidth <= 720;
    this.pickerMobile.set(mobile);

    if (mobile) {
      this.pickerPosition.set(null);
      return;
    }

    const fallbackRect = this.surface().nativeElement.getBoundingClientRect();
    const anchoredRect = anchorElement && anchorElement.isConnected ? anchorElement.getBoundingClientRect() : null;
    const selection = window.getSelection();
    const range = selection?.rangeCount ? selection.getRangeAt(0) : null;
    const selectionRect = range && typeof range.getBoundingClientRect === 'function' ? range.getBoundingClientRect() : fallbackRect;
    const rect = anchoredRect ?? (selectionRect.width > 0 || selectionRect.height > 0 ? selectionRect : fallbackRect);
    const frame = this.surface().nativeElement.closest('.editor-frame');
    const positionRoot = frame instanceof HTMLElement && frame.offsetParent instanceof HTMLElement ? frame.offsetParent : null;
    const rootRect = positionRoot?.getBoundingClientRect();
    const pickerWidth = Math.min(384, (rootRect?.width ?? window.innerWidth) - 32);
    const left = Math.min(
      Math.max(16, rect.left - (rootRect?.left ?? 0)),
      (rootRect?.width ?? window.innerWidth) - pickerWidth - 16,
    );
    const top = Math.max(16, rect.bottom + 12 - (rootRect?.top ?? 0));

    this.pickerPosition.set({ left, top });
  }

  private syncEmptyTextNodes(): void {
    const nodes = this.surface().nativeElement.querySelectorAll<HTMLElement>('.text-node');
    nodes.forEach((node) => {
      if ((node.textContent ?? '').length === 0) {
        node.innerHTML = '';
      }
    });
  }

  private resetVariablePickerState(): void {
    this.variablePickerOpen.set(false);
    this.variableQuery.set('');
    this.variableSelectionIndex.set(0);
    this.pendingVariableCursor.set(null);
    this.pendingVariableReplaceIndex.set(null);
    this.pickerPosition.set(null);
    this.pickerAnchorElement = null;
  }

  private syncVariableQueryFromInput(index: number, element: HTMLElement): boolean {
    if (!this.variablePickerOpen() || this.pendingVariableReplaceIndex() !== null) {
      return false;
    }

    const cursor = this.pendingVariableCursor();
    if (!cursor || cursor.nodeIndex !== index) {
      return false;
    }

    const node = this.document()[index];
    if (!isTextNode(node)) {
      return false;
    }

    const content = element.textContent ?? '';
    const before = node.content.slice(0, cursor.offset);
    const after = node.content.slice(cursor.offset);
    if (!content.startsWith(before) || !content.endsWith(after) || content.length < before.length + after.length) {
      return false;
    }

    const query = content.slice(before.length, content.length - after.length);
    element.textContent = node.content;
    this.updateVariableQuery(query);
    this.restoreTextSelection(index, cursor.offset);
    return true;
  }

  private handleVariableQueryKeydown(index: number, event: KeyboardEvent): boolean {
    if (!this.variablePickerOpen() || this.pendingVariableReplaceIndex() !== null) {
      return false;
    }

    const cursor = this.pendingVariableCursor();
    if (!cursor || cursor.nodeIndex !== index) {
      return false;
    }

    if (event.key === 'Escape') {
      event.preventDefault();
      this.closeVariablePicker();
      return true;
    }

    if (event.key === 'Enter') {
      event.preventDefault();
      this.selectActiveVariable();
      return true;
    }

    if (event.key === 'ArrowDown') {
      event.preventDefault();
      this.moveActiveVariableOption(1);
      return true;
    }

    if (event.key === 'ArrowUp') {
      event.preventDefault();
      this.moveActiveVariableOption(-1);
      return true;
    }

    if (event.key === 'Backspace') {
      if (this.variableQuery().length === 0) {
        this.closeVariablePicker();
        return false;
      }

      event.preventDefault();
      this.updateVariableQuery(this.variableQuery().slice(0, -1));
      return true;
    }

    if (!event.ctrlKey && !event.metaKey && !event.altKey && event.key.length === 1 && event.key !== '{') {
      event.preventDefault();
      this.updateVariableQuery(`${this.variableQuery()}${event.key}`);
      return true;
    }

    return false;
  }

  private updateVariableQuery(query: string): void {
    this.variableQuery.set(query);
    this.variableSelectionIndex.set(0);
    queueMicrotask(() => this.updatePickerPosition(this.pickerAnchorElement));
  }

  private moveActiveVariableOption(step: -1 | 1): void {
    const options = this.filteredVariableOptions();
    if (options.length === 0) {
      return;
    }

    const nextIndex = (this.activeVariableOptionIndex() + step + options.length) % options.length;
    this.variableSelectionIndex.set(nextIndex);
  }

  private selectActiveVariable(): void {
    const optionIndex = this.activeVariableOptionIndex();
    if (optionIndex < 0) {
      return;
    }

    const option = this.filteredVariableOptions()[optionIndex];
    if (!option) {
      return;
    }

    this.selectVariable(option);
  }
}
