import {
  ChangeDetectionStrategy,
  Component,
  OnChanges,
  SimpleChanges,
  ViewContainerRef,
  input,
  viewChild,
} from '@angular/core';
import { EditorNode } from './core/editor.models';
import { EditorPlugin } from './core/editor-plugin';

@Component({
  selector: 'smart-editor-plugin-host',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: '<ng-container #container />',
})
export class SmartEditorPluginHostComponent implements OnChanges {
  readonly node = input.required<EditorNode>();
  readonly plugin = input<EditorPlugin | undefined>();

  private readonly container = viewChild.required('container', { read: ViewContainerRef });

  ngOnChanges(_changes: SimpleChanges): void {
    this.render();
  }

  private render(): void {
    const viewContainerRef = this.container();
    viewContainerRef.clear();

    const plugin = this.plugin();
    if (!plugin) {
      return;
    }

    const componentRef = viewContainerRef.createComponent(plugin.component);
    componentRef.setInput('node', this.node());
  }
}
