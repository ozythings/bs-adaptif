import { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';

export function schoolNumberValidator(): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    if (!control.value) return null;

    const value = control.value.trim();
    const valid = /^\d{1,10}$/.test(value);

    return valid ? null : { schoolNumber: true };
  };
}
