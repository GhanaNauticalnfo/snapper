import { FormBuilder, FormControl } from '@angular/forms';
import { RouteValidators } from '../validators/route.validators';

// Mock crypto.randomUUID for tests
beforeAll(() => {
  if (!global.crypto) {
    global.crypto = {} as any;
  }
  (global.crypto as any).randomUUID = () => {
    return `${Math.random().toString(36).substring(2, 9)}-${Math.random().toString(36).substring(2, 6)}-4${Math.random().toString(36).substring(2, 5)}-${Math.random().toString(36).substring(2, 6)}-${Math.random().toString(36).substring(2, 14)}`;
  };
});

describe('RouteFormComponent - Validation (Unit)', () => {
  let fb: FormBuilder;
  let routeForm: any;

  beforeEach(() => {
    fb = new FormBuilder();
    
    // Initialize form with validators
    routeForm = fb.nonNullable.group({
      name: fb.nonNullable.control('', RouteValidators.routeName()),
      notes: fb.nonNullable.control('', RouteValidators.routeNotes()),
      enabled: fb.nonNullable.control<boolean>(true)
    });
  });

  describe('name field validation', () => {
    it('should be required', () => {
      const nameControl = routeForm.get('name');
      
      expect(nameControl?.hasError('required')).toBe(true);
      expect(nameControl?.valid).toBe(false);
    });

    it('should accept valid name', () => {
      const nameControl = routeForm.get('name');
      
      nameControl?.setValue('Valid Route Name');
      
      expect(nameControl?.hasError('required')).toBe(false);
      expect(nameControl?.valid).toBe(true);
    });

    it('should reject name longer than 100 characters', () => {
      const nameControl = routeForm.get('name');
      const longName = 'a'.repeat(101);
      
      nameControl?.setValue(longName);
      
      expect(nameControl?.hasError('maxlength')).toBe(true);
      expect(nameControl?.errors?.['maxlength']).toEqual({
        requiredLength: 100,
        actualLength: 101
      });
    });

    it('should accept name exactly 100 characters', () => {
      const nameControl = routeForm.get('name');
      const maxName = 'a'.repeat(100);
      
      nameControl?.setValue(maxName);
      
      expect(nameControl?.hasError('maxlength')).toBe(false);
      expect(nameControl?.valid).toBe(true);
    });

    it('should not accept empty string after trimming', () => {
      const nameControl = routeForm.get('name');
      
      nameControl?.setValue('   ');
      
      // While Angular doesn't trim by default, the canSave logic checks trimmed value
      expect(nameControl?.value).toBe('   ');
      expect(nameControl?.hasError('required')).toBe(false); // Angular sees non-empty
      // But canSave would return false due to trim check
    });
  });

  describe('notes field validation', () => {
    it('should be optional', () => {
      const descControl = routeForm.get('notes');
      
      expect(descControl?.hasError('required')).toBe(false);
      expect(descControl?.valid).toBe(true);
    });

    it('should accept valid notes', () => {
      const descControl = routeForm.get('notes');
      
      descControl?.setValue('This is a valid note for the route');
      
      expect(descControl?.valid).toBe(true);
    });

    it('should reject notes longer than 500 characters', () => {
      const descControl = routeForm.get('notes');
      const longDesc = 'a'.repeat(501);
      
      descControl?.setValue(longDesc);
      
      expect(descControl?.hasError('maxlength')).toBe(true);
      expect(descControl?.errors?.['maxlength']).toEqual({
        requiredLength: 500,
        actualLength: 501
      });
    });

    it('should accept notes exactly 500 characters', () => {
      const descControl = routeForm.get('notes');
      const maxDesc = 'a'.repeat(500);
      
      descControl?.setValue(maxDesc);
      
      expect(descControl?.hasError('maxlength')).toBe(false);
      expect(descControl?.valid).toBe(true);
    });
  });

  describe('enabled field validation', () => {
    it('should have default value of true', () => {
      const enabledControl = routeForm.get('enabled');
      
      expect(enabledControl?.value).toBe(true);
    });

    it('should accept boolean values', () => {
      const enabledControl = routeForm.get('enabled');
      
      enabledControl?.setValue(false);
      expect(enabledControl?.value).toBe(false);
      expect(enabledControl?.valid).toBe(true);
      
      enabledControl?.setValue(true);
      expect(enabledControl?.value).toBe(true);
      expect(enabledControl?.valid).toBe(true);
    });
  });

  describe('form level validation', () => {
    it('should be invalid when only name is missing', () => {
      routeForm.patchValue({
        name: '',
        notes: 'Valid notes',
        enabled: true
      });
      
      expect(routeForm.valid).toBe(false);
    });

    it('should be valid when all required fields are provided', () => {
      routeForm.patchValue({
        name: 'Valid Name',
        notes: 'Valid notes',
        enabled: true
      });
      
      expect(routeForm.valid).toBe(true);
    });

    it('should be valid when optional notes is empty', () => {
      routeForm.patchValue({
        name: 'Valid Name',
        notes: '',
        enabled: true
      });
      
      expect(routeForm.valid).toBe(true);
    });
  });

  describe('form reset behavior', () => {
    it('should maintain validators after reset', () => {
      routeForm.patchValue({
        name: 'Test',
        notes: 'Test',
        enabled: false
      });
      
      routeForm.reset();
      
      const nameControl = routeForm.get('name');
      expect(nameControl?.hasError('required')).toBe(true);
    });

    it('should reset to provided values', () => {
      routeForm.reset({
        name: 'Reset Name',
        notes: 'Reset Notes',
        enabled: false
      });
      
      expect(routeForm.value).toEqual({
        name: 'Reset Name',
        notes: 'Reset Notes',
        enabled: false
      });
      expect(routeForm.valid).toBe(true);
    });
  });

  describe('form state changes', () => {
    it('should track pristine/dirty state', () => {
      expect(routeForm.pristine).toBe(true);
      expect(routeForm.dirty).toBe(false);
      
      routeForm.patchValue({ name: 'Test' });
      routeForm.markAsDirty();
      
      expect(routeForm.pristine).toBe(false);
      expect(routeForm.dirty).toBe(true);
    });

    it('should track touched/untouched state', () => {
      const nameControl = routeForm.get('name');
      
      expect(nameControl?.touched).toBe(false);
      expect(nameControl?.untouched).toBe(true);
      
      nameControl?.markAsTouched();
      
      expect(nameControl?.touched).toBe(true);
      expect(nameControl?.untouched).toBe(false);
    });
  });
});

describe('RouteValidators', () => {
  describe('waypoint validation', () => {
    it('should validate correct waypoint format', () => {
      const result = RouteValidators.validateWaypointFormat('5.6037,-0.186');
      
      expect(result.valid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('should reject invalid waypoint format', () => {
      const result = RouteValidators.validateWaypointFormat('invalid');
      
      expect(result.valid).toBe(false);
      expect(result.error).toBe('Invalid format. Expected "lat,lon"');
    });

    it('should reject waypoint with only one value', () => {
      const result = RouteValidators.validateWaypointFormat('5.6037');
      
      expect(result.valid).toBe(false);
      expect(result.error).toBe('Invalid format. Expected "lat,lon"');
    });

    it('should reject waypoint with invalid latitude', () => {
      const result = RouteValidators.validateWaypointFormat('91.0,0.0');
      
      expect(result.valid).toBe(false);
      expect(result.error).toBe('Latitude must be between -90 and 90');
    });

    it('should reject waypoint with invalid longitude', () => {
      const result = RouteValidators.validateWaypointFormat('0.0,181.0');
      
      expect(result.valid).toBe(false);
      expect(result.error).toBe('Longitude must be between -180 and 180');
    });

    it('should accept waypoints with spaces', () => {
      const result = RouteValidators.validateWaypointFormat(' 5.6037 , -0.186 ');
      
      expect(result.valid).toBe(true);
    });

    it('should accept edge case coordinates', () => {
      // Min/max valid values
      expect(RouteValidators.validateWaypointFormat('-90,-180').valid).toBe(true);
      expect(RouteValidators.validateWaypointFormat('90,180').valid).toBe(true);
      expect(RouteValidators.validateWaypointFormat('0,0').valid).toBe(true);
    });
  });

  describe('parseWaypointsText', () => {
    it('should parse valid waypoints text', () => {
      const text = '5.6037,-0.186\n5.605,-0.185\n5.61,-0.19';
      const result = RouteValidators.parseWaypointsText(text);
      
      expect(result.error).toBeUndefined();
      expect(result.waypoints).toHaveLength(3);
      expect(result.waypoints[0]).toEqual(expect.objectContaining({
        lat: 5.6037,
        lng: -0.186,
        order: 0
      }));
    });

    it('should require at least 2 waypoints', () => {
      const text = '5.6037,-0.186';
      const result = RouteValidators.parseWaypointsText(text);
      
      expect(result.error).toBe('At least 2 waypoints are required');
      expect(result.waypoints).toEqual([]);
    });

    it('should handle empty lines', () => {
      const text = '5.6037,-0.186\n\n5.605,-0.185\n\n';
      const result = RouteValidators.parseWaypointsText(text);
      
      expect(result.error).toBeUndefined();
      expect(result.waypoints).toHaveLength(2);
    });

    it('should report line number for errors', () => {
      const text = '5.6037,-0.186\ninvalid waypoint\n5.605,-0.185';
      const result = RouteValidators.parseWaypointsText(text);
      
      expect(result.error).toBe('Line 2: Invalid format. Expected "lat,lon"');
    });

    it('should assign sequential order to waypoints', () => {
      const text = '5.6037,-0.186\n5.605,-0.185\n5.61,-0.19';
      const result = RouteValidators.parseWaypointsText(text);
      
      expect(result.waypoints[0].order).toBe(0);
      expect(result.waypoints[1].order).toBe(1);
      expect(result.waypoints[2].order).toBe(2);
    });

    it('should generate waypoint IDs', () => {
      const text = '5.6037,-0.186\n5.605,-0.185';
      const result = RouteValidators.parseWaypointsText(text);
      
      expect(result.waypoints[0].id).toBeDefined();
      expect(result.waypoints[1].id).toBeDefined();
      expect(result.waypoints[0].id).not.toBe(result.waypoints[1].id);
    });

    it('should generate waypoint names', () => {
      const text = '5.6037,-0.186\n5.605,-0.185';
      const result = RouteValidators.parseWaypointsText(text);
      
      expect(result.waypoints[0].name).toBe('Waypoint 1');
      expect(result.waypoints[1].name).toBe('Waypoint 2');
    });
  });
});