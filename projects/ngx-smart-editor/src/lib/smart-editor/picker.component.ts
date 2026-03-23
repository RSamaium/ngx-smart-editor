import { NgTemplateOutlet } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  TemplateRef,
  computed,
  input,
  output,
} from '@angular/core';
import { VariableOption } from './core/editor.models';
import {
  SmartEditorPickerEmptyDirective,
  SmartEditorPickerErrorDirective,
  SmartEditorPickerLoadingDirective,
  SmartEditorPickerOptionContext,
  SmartEditorPickerStateContext,
} from './picker-customization';

export interface SmartEditorPickerPosition {
  left: number;
  top: number;
}

@Component({
  selector: 'smart-editor-picker',
  imports: [NgTemplateOutlet],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="picker-backdrop" (click)="closeRequested.emit()"></div>
    <section
      class="variable-picker"
      [class.is-mobile]="mobile()"
      [style.left.px]="mobile() ? null : position()?.left ?? null"
      [style.top.px]="mobile() ? null : position()?.top ?? null"
      aria-label="Variable picker"
    >
      <header class="picker-header">
        <div class="picker-header-main">
          @if (headerTemplate()) {
            <ng-container
              *ngTemplateOutlet="headerTemplate(); context: stateContext()"
            />
          } @else {
            <div>
              <strong>{{ title() }}</strong>
              <p>
                @if (query()) {
                  Search: <span class="picker-query">{{ query() }}</span>
                } @else {
                  {{ description() }}
                }
              </p>
            </div>
          }
        </div>

        <button type="button" class="picker-close" (click)="closeRequested.emit()">Close</button>
      </header>

      <div class="picker-list" role="listbox">
        @if (loading()) {
          @if (loadingTemplate()) {
            <ng-container
              *ngTemplateOutlet="loadingTemplate(); context: stateContext()"
            />
          } @else {
            <p class="picker-state">Loading options…</p>
          }
        } @else if (error()) {
          @if (errorTemplate()) {
            <ng-container
              *ngTemplateOutlet="errorTemplate(); context: stateContext()"
            />
          } @else {
            <p class="picker-state picker-state-error">{{ error() }}</p>
          }
        } @else if (options().length === 0) {
          @if (emptyTemplate()) {
            <ng-container
              *ngTemplateOutlet="emptyTemplate(); context: stateContext()"
            />
          } @else {
            <p class="picker-state">No variable matches "{{ query() }}".</p>
          }
        } @else {
          @for (option of options(); track option.key; let optionIndex = $index) {
            <button
              type="button"
              class="picker-option"
              [class.is-active]="optionIndex === activeIndex()"
              [attr.aria-selected]="optionIndex === activeIndex()"
              (click)="optionSelected.emit(option)"
            >
              @if (optionTemplate()) {
                <ng-container
                  *ngTemplateOutlet="optionTemplate(); context: optionContext(option, optionIndex)"
                />
              } @else {
                <span class="picker-option-label">{{ option.label }}</span>
                <span class="picker-option-key">{{ option.key }}</span>
              }
            </button>
          }
        }
      </div>

      @if (footerTemplate()) {
        <footer class="picker-footer">
          <ng-container
            *ngTemplateOutlet="footerTemplate(); context: stateContext()"
          />
        </footer>
      }
    </section>
  `,
  styles: `
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
      align-items: start;
    }

    .picker-header-main {
      display: grid;
      gap: 0.6rem;
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

    .picker-state {
      margin: 0;
      border: 1px dashed #c8d5dc;
      border-radius: 0.8rem;
      padding: 0.9rem;
      color: #59717f;
      font: 400 0.92rem/1.4 "IBM Plex Sans", "Segoe UI", sans-serif;
    }

    .picker-state-error {
      color: #9f1239;
      border-color: #fecdd3;
      background: #fff1f2;
    }

    .picker-footer {
      border-top: 1px solid #e5edf1;
      background: #f8fbfc;
      padding: 0.85rem 1rem;
    }

    .picker-close:focus-visible,
    .picker-option:focus-visible {
      outline: 2px solid #0e7490;
      outline-offset: 2px;
      border-radius: 0.4rem;
    }

    @media (max-width: 720px) {
      .picker-list {
        max-height: 50vh;
      }
    }
  `,
})
export class SmartEditorPickerComponent {
  readonly title = input('Variables');
  readonly description = input('Choose a variable to insert in the text.');
  readonly query = input('');
  readonly options = input<VariableOption[]>([]);
  readonly activeIndex = input(-1);
  readonly loading = input(false);
  readonly error = input<string | null>(null);
  readonly mobile = input(false);
  readonly position = input<SmartEditorPickerPosition | null>(null);
  readonly optionTemplate = input<TemplateRef<SmartEditorPickerOptionContext> | null>(null);
  readonly loadingTemplate = input<TemplateRef<SmartEditorPickerStateContext> | null>(null);
  readonly emptyTemplate = input<TemplateRef<SmartEditorPickerStateContext> | null>(null);
  readonly errorTemplate = input<TemplateRef<SmartEditorPickerStateContext> | null>(null);
  readonly headerTemplate = input<TemplateRef<SmartEditorPickerStateContext> | null>(null);
  readonly footerTemplate = input<TemplateRef<SmartEditorPickerStateContext> | null>(null);
  readonly optionSelected = output<VariableOption>();
  readonly closeRequested = output<void>();

  protected readonly stateContext = computed<SmartEditorPickerStateContext>(() => ({
    query: this.query(),
  }));

  protected optionContext(option: VariableOption, optionIndex: number): SmartEditorPickerOptionContext {
    return {
      $implicit: option,
      active: optionIndex === this.activeIndex(),
      query: this.query(),
    };
  }
}
