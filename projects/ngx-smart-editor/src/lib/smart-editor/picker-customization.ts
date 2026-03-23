import { Directive, TemplateRef } from '@angular/core';
import { VariableOption } from './core/editor.models';

export interface SmartEditorPickerOptionContext {
  $implicit: VariableOption;
  active: boolean;
  query: string;
}

export interface SmartEditorPickerStateContext {
  query: string;
}

@Directive({
  selector: 'ng-template[smartEditorPickerOption]',
})
export class SmartEditorPickerOptionDirective {
  constructor(readonly template: TemplateRef<SmartEditorPickerOptionContext>) {}
}

@Directive({
  selector: 'ng-template[smartEditorPickerLoading]',
})
export class SmartEditorPickerLoadingDirective {
  constructor(readonly template: TemplateRef<SmartEditorPickerStateContext>) {}
}

@Directive({
  selector: 'ng-template[smartEditorPickerEmpty]',
})
export class SmartEditorPickerEmptyDirective {
  constructor(readonly template: TemplateRef<SmartEditorPickerStateContext>) {}
}

@Directive({
  selector: 'ng-template[smartEditorPickerError]',
})
export class SmartEditorPickerErrorDirective {
  constructor(readonly template: TemplateRef<SmartEditorPickerStateContext>) {}
}

@Directive({
  selector: 'ng-template[smartEditorPickerHeader]',
})
export class SmartEditorPickerHeaderDirective {
  constructor(readonly template: TemplateRef<SmartEditorPickerStateContext>) {}
}

@Directive({
  selector: 'ng-template[smartEditorPickerFooter]',
})
export class SmartEditorPickerFooterDirective {
  constructor(readonly template: TemplateRef<SmartEditorPickerStateContext>) {}
}
