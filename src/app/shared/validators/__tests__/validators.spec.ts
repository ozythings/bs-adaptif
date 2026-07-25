import { describe, it, expect } from 'vitest';
import { FormControl, FormGroup } from '@angular/forms';
import { firstValueFrom } from 'rxjs';
import { Observable } from 'rxjs';
import { ValidationErrors } from '@angular/forms';
import { schoolNumberValidator } from '../school-number.validator';
import { emailValidator } from '../email.validator';
import { phoneValidator } from '../phone.validator';
import { dateRangeValidator } from '../date-range.validator';
import { uniqueCodeValidator } from '../unique-code.validator';

async function resolveAsync(obs: Observable<ValidationErrors | null> | Promise<ValidationErrors | null>): Promise<ValidationErrors | null> {
  if (obs instanceof Promise) return obs;
  return firstValueFrom(obs);
}

describe('Validators', () => {
  describe('schoolNumberValidator', () => {
    it('should accept valid school numbers', () => {
      const validate = schoolNumberValidator();
      expect(validate(new FormControl('2024001'))).toBeNull();
      expect(validate(new FormControl('1'))).toBeNull();
      expect(validate(new FormControl('1234567890'))).toBeNull();
    });

    it('should reject invalid school numbers', () => {
      const validate = schoolNumberValidator();
      expect(validate(new FormControl('abc'))).toBeTruthy();
      expect(validate(new FormControl('12345678901'))).toBeTruthy();
    });
  });

  describe('emailValidator', () => {
    it('should accept valid emails', () => {
      const validate = emailValidator();
      expect(validate(new FormControl('test@example.com'))).toBeNull();
      expect(validate(new FormControl('user.name@domain.co'))).toBeNull();
    });

    it('should reject invalid emails', () => {
      const validate = emailValidator();
      expect(validate(new FormControl('notanemail'))).toBeTruthy();
      expect(validate(new FormControl('@domain.com'))).toBeTruthy();
    });
  });

  describe('phoneValidator', () => {
    it('should accept valid phone numbers', () => {
      const validate = phoneValidator();
      expect(validate(new FormControl('05321234567'))).toBeNull();
      expect(validate(new FormControl('+905321234567'))).toBeNull();
    });

    it('should reject invalid phone numbers', () => {
      const validate = phoneValidator();
      expect(validate(new FormControl('123'))).toBeTruthy();
      expect(validate(new FormControl('invalid'))).toBeTruthy();
    });
  });

  describe('dateRangeValidator', () => {
    it('should accept valid date range', () => {
      const group = new FormGroup({
        startDate: new FormControl('2024-01-01'),
        endDate: new FormControl('2024-06-01'),
      }, { validators: dateRangeValidator() });
      expect(group.errors).toBeNull();
    });

    it('should reject end before start', () => {
      const group = new FormGroup({
        startDate: new FormControl('2024-06-01'),
        endDate: new FormControl('2024-01-01'),
      }, { validators: dateRangeValidator() });
      expect(group.errors).toBeTruthy();
    });
  });

  describe('uniqueCodeValidator', () => {
    it('should accept unique codes', async () => {
      const validate = uniqueCodeValidator(['ANG-T-01', 'ANG-T-02']);
      const result = await resolveAsync(validate(new FormControl('ANG-T-03')));
      expect(result).toBeNull();
    });

    it('should reject duplicate codes', async () => {
      const validate = uniqueCodeValidator(['ANG-T-01', 'ANG-T-02']);
      const result = await resolveAsync(validate(new FormControl('ANG-T-01')));
      expect(result).toEqual({ uniqueCode: true });
    });

    it('should allow empty values', async () => {
      const validate = uniqueCodeValidator(['ANG-T-01']);
      const result = await resolveAsync(validate(new FormControl('')));
      expect(result).toBeNull();
    });

    it('should allow the current code itself', async () => {
      const validate = uniqueCodeValidator(['ANG-T-01'], 'ANG-T-01');
      const result = await resolveAsync(validate(new FormControl('ANG-T-01')));
      expect(result).toBeNull();
    });
  });
});
