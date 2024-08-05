import { Directive } from '@angular/core';
import {
  NG_VALIDATORS,
  Validator,
  AbstractControl,
  ValidationErrors,
} from '@angular/forms';
import { isEmail } from 'validator';

@Directive({
  selector: '[appEmailValidator]',
  standalone: true,
  providers: [
    {
      provide: NG_VALIDATORS,
      useExisting: EmailValidatorDirective,
      multi: true,
    },
  ],
})
export class EmailValidatorDirective implements Validator {
  validate(control: AbstractControl): ValidationErrors | null {
    if (!control.value) return null;
    const valid = isEmail(control.value);
    return valid ? null : { invalidEmail: true };
  }
}
