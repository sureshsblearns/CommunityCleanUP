import { HttpErrorResponse } from '@angular/common/http';
import { FormControl, FormGroup } from '@angular/forms';
import { errorMessage, fieldErrors, toParams } from './http';
import { thumbnail } from './images';
import { homeRouteFor, label } from './labels';
import { matchFields, PASSWORD_PATTERN, PHONE_PATTERN } from './validators';

describe('labels', () => {
  it('maps API enum values to readable labels', () => {
    expect(label('CLEANING_SCHEDULED')).toBe('Cleaning scheduled');
    expect(label('E_WASTE')).toBe('E-waste');
  });

  it('leaves free text such as names untouched', () => {
    expect(label('Arjun Kumar')).toBe('Arjun Kumar');
  });

  it('routes each role to its own dashboard', () => {
    expect(homeRouteFor('ADMIN')).toBe('/admin/dashboard');
    expect(homeRouteFor('NGO')).toBe('/ngo/dashboard');
    expect(homeRouteFor('VOLUNTEER')).toBe('/volunteer/dashboard');
    expect(homeRouteFor('RESIDENT')).toBe('/dashboard');
  });
});

describe('http helpers', () => {
  it('uses the API message instead of raw HTTP details', () => {
    const error = new HttpErrorResponse({ status: 409, error: { success: false, message: 'This event is full' } });
    expect(errorMessage(error)).toBe('This event is full');
  });

  it('explains network failures', () => {
    expect(errorMessage(new HttpErrorResponse({ status: 0 }))).toContain('Unable to reach the server');
  });

  it('extracts field errors', () => {
    const error = new HttpErrorResponse({ status: 400, error: { success: false, errors: { email: 'Invalid' } } });
    expect(fieldErrors(error)).toEqual({ email: 'Invalid' });
  });

  it('skips empty query parameters', () => {
    const params = toParams({ q: '', status: 'PENDING', page: 0, urgency: null });
    expect(params.keys()).toEqual(['status', 'page']);
  });
});

describe('thumbnail', () => {
  it('adds a Cloudinary transformation', () => {
    const url = 'https://res.cloudinary.com/demo/image/upload/v1/community-cleanup/reports/a.jpg';
    expect(thumbnail(url, 200, 100)).toBe(
      'https://res.cloudinary.com/demo/image/upload/c_fill,w_200,h_100,q_auto,f_auto/v1/community-cleanup/reports/a.jpg',
    );
  });

  it('returns other URLs unchanged', () => {
    expect(thumbnail('http://localhost:8080/uploads/reports/x.png')).toBe('http://localhost:8080/uploads/reports/x.png');
  });
});

describe('validators', () => {
  it('mirrors the backend password policy', () => {
    expect(PASSWORD_PATTERN.test('Passw0rd')).toBe(true);
    expect(PASSWORD_PATTERN.test('password')).toBe(false);
    expect(PASSWORD_PATTERN.test('Sh0rt')).toBe(false);
  });

  it('accepts common phone formats', () => {
    expect(PHONE_PATTERN.test('+91 98765 43210')).toBe(true);
    expect(PHONE_PATTERN.test('12345')).toBe(false);
  });

  it('flags mismatched password confirmation', () => {
    const form = new FormGroup(
      { password: new FormControl('Passw0rd'), confirm: new FormControl('Passw0rd!') },
      { validators: matchFields('password', 'confirm') },
    );
    expect(form.hasError('mismatch')).toBe(true);
    form.controls.confirm.setValue('Passw0rd');
    expect(form.hasError('mismatch')).toBe(false);
  });
});
