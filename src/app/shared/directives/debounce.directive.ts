import { Directive,  input,  output } from '@angular/core';

@Directive({
  selector: '[appDebounce]',
  standalone: true,
  host: {
    '(input)': 'onInput($event)'
  }
})
export class DebounceDirective {
  appDebounce = input<number>(300);
  debouncedChange = output<string>();

  private timeoutId: ReturnType<typeof setTimeout> | null = null;

  onInput(event: Event): void {
    const target = event.target as HTMLInputElement | HTMLTextAreaElement;
    const value = target?.value ?? '';

    if (this.timeoutId) {
      clearTimeout(this.timeoutId);
    }

    this.timeoutId = setTimeout(() => {
      this.debouncedChange.emit(value);
      this.timeoutId = null;
    }, this.appDebounce());
  }
}
