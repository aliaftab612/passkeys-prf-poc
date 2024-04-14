import { Directive, ElementRef, HostListener, Input } from '@angular/core';

@Directive({
  selector: '[appCharacterCounter]',
  standalone: true,
})
export class CharacterCounterDirective {
  @Input() maxLength: number = 100; // Default maximum length

  constructor(private el: ElementRef) {}

  @HostListener('input', ['$event.target.value'])
  onInput(value: string): void {
    // Limit the input value length
    if (value.length > this.maxLength) {
      this.el.nativeElement.value = value.slice(0, this.maxLength);
    }
    // Calculate remaining characters
    const remaining = this.maxLength - value.length;
    // Update the counter in the element's attribute
    this.el.nativeElement.setAttribute('data-counter', remaining);
  }
}
