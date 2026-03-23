import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { VariableNode } from '../core/editor.models';

@Component({
  selector: 'smart-editor-variable-token',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: '<span class="token variable">{{ label() }}</span>',
  styles: `
    .token {
      display: inline-flex;
      align-items: center;
      gap: 0.35rem;
      border-radius: 999px;
      background: #153b4d;
      color: #f2fbff;
      padding: 0.25rem 0.65rem;
      font: 600 0.9rem/1.2 "IBM Plex Sans", "Segoe UI", sans-serif;
      white-space: nowrap;
    }
  `,
})
export class VariableTokenComponent {
  readonly node = input.required<VariableNode>();
  protected readonly label = computed(() => this.node().label ?? this.node().key);
}
