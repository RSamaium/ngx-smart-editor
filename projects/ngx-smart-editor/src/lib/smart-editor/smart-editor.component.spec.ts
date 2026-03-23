import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { SmartEditorComponent } from './smart-editor.component';
import { EditorDocument, VariableOption } from './core/editor.models';
import {
  SmartEditorPickerEmptyDirective,
  SmartEditorPickerFooterDirective,
  SmartEditorPickerHeaderDirective,
  SmartEditorPickerOptionDirective,
} from './picker-customization';

const variableOptions: VariableOption[] = [
  { key: 'customer.firstName', label: 'Customer first name' },
  { key: 'ticket.id', label: 'Ticket ID' },
];

describe('SmartEditorComponent', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SmartEditorComponent],
    }).compileComponents();
  });

  it('renders a variable token from the document value', () => {
    const fixture = TestBed.createComponent(SmartEditorComponent);
    const component = fixture.componentInstance;

    component.writeValue([
      { type: 'text', content: 'Hello ' },
      { type: 'variable', key: 'customer.firstName', label: 'Customer first name' },
    ]);
    fixture.componentRef.setInput('variableOptions', variableOptions);
    fixture.detectChanges();

    const token = fixture.nativeElement.querySelector('.token-node');
    expect(token?.textContent).toContain('Customer first name');
  });

  it('opens the picker on trigger and inserts the chosen variable', async () => {
    const fixture = TestBed.createComponent(SmartEditorComponent);
    const component = fixture.componentInstance;
    let latestValue: EditorDocument | undefined;

    component.registerOnChange((value) => {
      latestValue = value;
    });
    component.writeValue([{ type: 'text', content: 'Hello' }]);
    fixture.componentRef.setInput('variableOptions', variableOptions);
    fixture.detectChanges();

    const textNode = fixture.nativeElement.querySelector('.text-node') as HTMLElement;
    placeCaret(textNode, 5);
    textNode.dispatchEvent(new KeyboardEvent('keydown', { key: '{', bubbles: true }));
    fixture.detectChanges();

    const pickerOption = fixture.nativeElement.querySelector('.picker-option') as HTMLButtonElement;
    expect(pickerOption?.textContent).toContain('Customer first name');

    pickerOption.click();
    fixture.detectChanges();
    await fixture.whenStable();

    expect(latestValue).toBeDefined();
    expect(fixture.nativeElement.querySelectorAll('.token-node').length).toBe(1);
    expect(fixture.nativeElement.querySelector('.variable-picker')).toBeNull();
  });

  it('filters the picker from keyboard input after typing { and validates the active variable on Enter', async () => {
    const fixture = TestBed.createComponent(SmartEditorComponent);
    const component = fixture.componentInstance;

    component.writeValue([{ type: 'text', content: 'Hello ' }]);
    fixture.componentRef.setInput('variableOptions', variableOptions);
    fixture.detectChanges();

    const textNode = fixture.nativeElement.querySelector('.text-node') as HTMLElement;
    placeCaret(textNode, 0);
    textNode.dispatchEvent(new KeyboardEvent('keydown', { key: '{', bubbles: true }));
    fixture.detectChanges();

    for (const key of ['t', 'i', 'c', 'k', 'e', 't']) {
      textNode.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true }));
    }
    fixture.detectChanges();

    const options = fixture.nativeElement.querySelectorAll('.picker-option');
    expect(options.length).toBe(1);
    expect((options[0] as HTMLButtonElement).textContent).toContain('Ticket ID');

    textNode.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
    fixture.detectChanges();
    await fixture.whenStable();

    const token = fixture.nativeElement.querySelector('.token-node') as HTMLButtonElement;
    expect(token.textContent).toContain('Ticket ID');
    expect(fixture.nativeElement.querySelector('.variable-picker')).toBeNull();
  });

  it('reopens the picker when clicking a variable token and replaces the existing variable', async () => {
    const fixture = TestBed.createComponent(SmartEditorComponent);
    const component = fixture.componentInstance;

    component.writeValue([
      { type: 'text', content: 'Hello ' },
      { type: 'variable', key: 'customer.firstName', label: 'Customer first name' },
      { type: 'text', content: '!' },
    ]);
    fixture.componentRef.setInput('variableOptions', variableOptions);
    fixture.detectChanges();

    const token = fixture.nativeElement.querySelector('.token-node') as HTMLButtonElement;
    token.click();
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('.variable-picker')).not.toBeNull();

    const options = fixture.nativeElement.querySelectorAll('.picker-option');
    (options[1] as HTMLButtonElement).click();
    fixture.detectChanges();
    await fixture.whenStable();

    const updatedToken = fixture.nativeElement.querySelector('.token-node') as HTMLButtonElement;
    expect(fixture.nativeElement.querySelectorAll('.token-node').length).toBe(1);
    expect(updatedToken.textContent).toContain('Ticket ID');
    expect(fixture.nativeElement.querySelector('.variable-picker')).toBeNull();
  });

  it('renders custom picker templates and projected content', async () => {
    const fixture = TestBed.createComponent(TestHostComponent);
    fixture.detectChanges();

    const addVariableButton = fixture.nativeElement.querySelector('.tool') as HTMLButtonElement;
    addVariableButton.click();
    fixture.detectChanges();

    const textNode = fixture.nativeElement.querySelector('.text-node') as HTMLElement;
    expect(fixture.nativeElement.querySelector('.custom-picker-header')?.textContent).toContain('Custom picker header');
    expect(fixture.nativeElement.querySelector('.custom-picker-footer')?.textContent).toContain('Footer action');
    expect(fixture.nativeElement.querySelector('.custom-option')?.textContent).toContain('customer.firstName');

    for (const key of ['z', 'z', 'z']) {
      textNode.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true }));
    }
    fixture.detectChanges();
    await fixture.whenStable();

    expect(fixture.nativeElement.querySelector('.custom-empty')?.textContent).toContain('zzz');
  });

  it('removes the previous token when backspace is pressed at the start of a text node', async () => {
    const fixture = TestBed.createComponent(SmartEditorComponent);
    const component = fixture.componentInstance;

    component.writeValue([
      { type: 'text', content: 'Hello ' },
      { type: 'variable', key: 'customer.firstName', label: 'Customer first name' },
      { type: 'text', content: ' world' },
    ]);
    fixture.componentRef.setInput('variableOptions', variableOptions);
    fixture.detectChanges();

    const textNodes = fixture.nativeElement.querySelectorAll('.text-node');
    const trailingTextNode = textNodes[textNodes.length - 1] as HTMLElement;
    placeCaret(trailingTextNode, 0);
    trailingTextNode.dispatchEvent(new KeyboardEvent('keydown', { key: 'Backspace', bubbles: true }));
    fixture.detectChanges();
    await fixture.whenStable();

    expect(fixture.nativeElement.querySelectorAll('.token-node').length).toBe(0);
  });
});

function placeCaret(element: HTMLElement, offset: number): void {
  element.focus();
  const textNode = element.firstChild ?? element.appendChild(document.createTextNode(element.textContent ?? ''));
  const range = document.createRange();
  range.setStart(textNode, offset);
  range.collapse(true);

  const selection = window.getSelection();
  selection?.removeAllRanges();
  selection?.addRange(range);
}

@Component({
  imports: [
    SmartEditorComponent,
    SmartEditorPickerOptionDirective,
    SmartEditorPickerHeaderDirective,
    SmartEditorPickerFooterDirective,
    SmartEditorPickerEmptyDirective,
  ],
  template: `
    <ngx-smart-editor [variableOptions]="variableOptions" [plugins]="[]">
      <ng-template smartEditorPickerHeader>
        <div class="custom-picker-header">Custom picker header</div>
      </ng-template>

      <ng-template smartEditorPickerOption let-option let-active="active">
        <div class="custom-option" [attr.data-active]="active">{{ option.key }}</div>
      </ng-template>

      <ng-template smartEditorPickerEmpty let-query="query">
        <p class="custom-empty">No match for {{ query }}</p>
      </ng-template>

      <ng-template smartEditorPickerFooter>
        <div class="custom-picker-footer">Footer action</div>
      </ng-template>
    </ngx-smart-editor>
  `,
})
class TestHostComponent {
  readonly variableOptions = variableOptions;
}
