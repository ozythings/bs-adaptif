import { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';

export function phoneValidator(): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    if (!control.value) return null;

    const value = control.value.trim().replace(/\s/g, '');
    const valid = /^(\+90|0)?[0-9]{10}$/.test(value);

    return valid ? null : { phone: true };
  };
}
