import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { TextNode } from '../core/editor.models';

@Component({
  selector: 'smart-editor-text-token',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: '{{ node().content }}',
})
export class TextTokenComponent {
  readonly node = input.required<TextNode>();
}
