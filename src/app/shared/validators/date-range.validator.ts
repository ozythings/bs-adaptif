import { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';

export function dateRangeValidator(startKey = 'startDate', endKey = 'endDate'): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    if (!control.value) return null;

    const startDate = control.get(startKey)?.value;
    const endDate = control.get(endKey)?.value;

    if (!startDate || !endDate) return null;

    const start = new Date(startDate);
    const end = new Date(endDate);

    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      return { invalidDate: true };
    }

    if (end <= start) {
      return { dateRange: true };
    }

    return null;
  };
}
