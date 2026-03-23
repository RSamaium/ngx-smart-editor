import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { DropdownNode } from '../core/editor.models';

@Component({
  selector: 'smart-editor-dropdown-token',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: '<span class="token dropdown">{{ label() }}</span>',
  styles: `
    .token {
      display: inline-flex;
      align-items: center;
      border: 1px solid #9b5e00;
      border-radius: 0.65rem;
      background: #fff7e3;
      color: #6b4100;
      padding: 0.25rem 0.6rem;
      font: 600 0.9rem/1.2 "IBM Plex Sans", "Segoe UI", sans-serif;
      white-space: nowrap;
    }
  `,
})
export class DropdownTokenComponent {
  readonly node = input.required<DropdownNode>();
  protected readonly label = computed(() => `${this.node().key}: ${this.node().value ?? 'select'}`);
}
