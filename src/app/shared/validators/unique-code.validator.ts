import { AbstractControl, AsyncValidatorFn, ValidationErrors } from '@angular/forms';
import { Observable, of } from 'rxjs';
import { delay, map } from 'rxjs/operators';

export function uniqueCodeValidator(existingCodes: string[], currentCode?: string): AsyncValidatorFn {
  return (control: AbstractControl): Observable<ValidationErrors | null> => {
    const value = (control.value || '').trim();
    if (!value) return of(null);
    if (value === currentCode) return of(null);
    return of(value).pipe(
      delay(300),
      map(v => existingCodes.includes(v) ? { uniqueCode: true } : null)
    );
  };
}
