import { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';

/**
 * Validator for latitude values.
 * Latitude must be between -90 and 90 degrees.
 */
export function latitudeValidator(): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    if (control.value === null || control.value === undefined || control.value === '') {
      return null; // Let required validator handle empty values
    }
    
    const value = Number(control.value);
    if (isNaN(value)) {
      return { latitude: { message: 'Latitude must be a valid number' } };
    }
    
    if (value < -90 || value > 90) {
      return { latitude: { message: 'Latitude must be between -90 and 90' } };
    }
    
    return null;
  };
}

/**
 * Validator for longitude values.
 * Longitude must be between -180 and 180 degrees.
 */
export function longitudeValidator(): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    if (control.value === null || control.value === undefined || control.value === '') {
      return null; // Let required validator handle empty values
    }
    
    const value = Number(control.value);
    if (isNaN(value)) {
      return { longitude: { message: 'Longitude must be a valid number' } };
    }
    
    if (value < -180 || value > 180) {
      return { longitude: { message: 'Longitude must be between -180 and 180' } };
    }
    
    return null;
  };
}

/**
 * Combined validator for a coordinate pair.
 * Validates both latitude and longitude in a form group.
 */
export function coordinateValidator(): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const lat = control.get('latitude')?.value;
    const lng = control.get('longitude')?.value;
    
    if ((lat === null || lat === undefined) && (lng === null || lng === undefined)) {
      return null; // Both empty is valid for this validator
    }
    
    if ((lat !== null && lat !== undefined) && (lng === null || lng === undefined)) {
      return { coordinate: { message: 'Both latitude and longitude are required' } };
    }
    
    if ((lat === null || lat === undefined) && (lng !== null && lng !== undefined)) {
      return { coordinate: { message: 'Both latitude and longitude are required' } };
    }
    
    return null;
  };
}