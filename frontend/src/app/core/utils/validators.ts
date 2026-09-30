import { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';

/** Mirrors the backend rules in ValidationPatterns.java. */
export const PHONE_PATTERN = /^\+?[0-9][0-9\s-]{8,18}[0-9]$/;
export const PASSWORD_PATTERN = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,72}$/;
export const PASSWORD_HINT = 'At least 8 characters with an uppercase letter, a lowercase letter and a number.';

/** Group validator: the two named controls must match. */
export function matchFields(field: string, confirmField: string): ValidatorFn {
  return (group: AbstractControl): ValidationErrors | null => {
    const a = group.get(field)?.value;
    const b = group.get(confirmField)?.value;
    return a && b && a !== b ? { mismatch: true } : null;
  };
}

/** Applies server-side field errors to matching form controls. */
export function applyServerErrors(form: AbstractControl, errors: Record<string, string>): void {
  for (const [field, message] of Object.entries(errors)) {
    const control = form.get(field);
    if (control) {
      control.setErrors({ server: message });
      control.markAsTouched();
    }
  }
}
