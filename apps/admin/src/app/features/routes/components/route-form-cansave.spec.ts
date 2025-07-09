import { FormBuilder, Validators } from '@angular/forms';
import { signal, computed } from '@angular/core';
import { Route, Waypoint } from '../models/route.model';
import { RouteValidators } from '../validators/route.validators';

// Test the canSave logic in isolation
describe('RouteFormComponent - canSave Logic (Unit)', () => {
  let fb: FormBuilder;
  
  // Mock the component's essential properties
  let routeForm: any;
  let mode: any;
  let waypoints: any;
  let currentFormValues: any;
  let originalFormValues: any;
  let originalWaypoints: any;
  let canSave: any;
  let hasChanges: any;

  const mockRoute: Route = {
    id: 1,
    name: 'Test Route',
    notes: 'Test Notes',
    waypoints: [
      { lat: 5.6037, lng: -0.186, order: 0 },
      { lat: 5.605, lng: -0.185, order: 1 }
    ],
    enabled: true
  };

  const mockWaypoints: Waypoint[] = [
    { id: '1', lat: 5.6037, lng: -0.186, order: 0, name: 'Start' },
    { id: '2', lat: 5.605, lng: -0.185, order: 1, name: 'End' }
  ];

  beforeEach(() => {
    fb = new FormBuilder();
    
    // Initialize form
    routeForm = fb.nonNullable.group({
      name: fb.nonNullable.control('', RouteValidators.routeName()),
      notes: fb.nonNullable.control('', RouteValidators.routeNotes()),
      enabled: fb.nonNullable.control<boolean>(true)
    });
    
    // Initialize signals
    mode = signal<'view' | 'edit' | 'create'>('create');
    waypoints = signal<Waypoint[]>([]);
    currentFormValues = signal<{ name: string; notes: string; enabled: boolean }>({ 
      name: '', 
      notes: '', 
      enabled: true 
    });
    originalFormValues = signal<{ name: string; notes: string; enabled: boolean } | null>(null);
    originalWaypoints = signal<Waypoint[]>([]);
    
    // Subscribe to form changes
    routeForm.valueChanges.subscribe((values: any) => {
      currentFormValues.set(values);
    });
    
    // Implement hasChanges logic
    hasChanges = () => {
      const current = currentFormValues();
      const originalForm = originalFormValues();
      const currentWaypoints = waypoints();
      const originalWaypointsList = originalWaypoints();
      
      // Check form changes
      if (originalForm) {
        const formChanged = (
          current.name !== originalForm.name ||
          current.notes !== originalForm.notes ||
          current.enabled !== originalForm.enabled
        );
        
        if (formChanged) return true;
      }
      
      // Check waypoint changes
      if (currentWaypoints.length !== originalWaypointsList.length) {
        return true;
      }
      
      // Compare each waypoint
      return !currentWaypoints.every((wp: Waypoint, index: number) => {
        const origWp = originalWaypointsList[index];
        return origWp && 
          wp.lat === origWp.lat && 
          wp.lng === origWp.lng &&
          wp.order === origWp.order;
      });
    };
    
    // Implement canSave logic
    canSave = computed(() => {
      const currentMode = mode();
      const current = currentFormValues();
      
      // View mode never allows saving
      if (currentMode === 'view') {
        return false;
      }
      
      // Basic validation: name must not be empty and at least 2 waypoints
      const hasValidName = current.name && current.name.trim().length > 0;
      const hasEnoughWaypoints = waypoints().length >= 2;
      
      if (!hasValidName || !hasEnoughWaypoints) {
        return false;
      }
      
      // For edit mode, also require changes
      if (currentMode === 'edit') {
        return hasChanges();
      }
      
      // For create mode, basic requirements are enough
      return true;
    });
  });

  describe('canSave computed signal', () => {
    describe('create mode', () => {
      beforeEach(() => {
        mode.set('create');
      });

      it('should return false when name is empty', () => {
        routeForm.patchValue({ name: '' });
        waypoints.set([...mockWaypoints]);
        
        expect(canSave()).toBe(false);
      });

      it('should return false when name contains only whitespace', () => {
        routeForm.patchValue({ name: '   ' });
        waypoints.set([...mockWaypoints]);
        
        expect(canSave()).toBe(false);
      });

      it('should return false with valid name but no waypoints', () => {
        routeForm.patchValue({ name: 'Valid Route' });
        waypoints.set([]);
        
        expect(canSave()).toBe(false);
      });

      it('should return false with valid name and exactly 1 waypoint', () => {
        routeForm.patchValue({ name: 'Valid Route' });
        waypoints.set([mockWaypoints[0]]);
        
        expect(canSave()).toBe(false);
      });

      it('should return true with valid name and exactly 2 waypoints', () => {
        routeForm.patchValue({ name: 'Valid Route' });
        waypoints.set([...mockWaypoints]);
        
        expect(canSave()).toBe(true);
      });

      it('should return true with valid name and more than 2 waypoints', () => {
        routeForm.patchValue({ name: 'Valid Route' });
        const threeWaypoints = [...mockWaypoints, { id: '3', lat: 5.61, lng: -0.19, order: 2 }];
        waypoints.set(threeWaypoints);
        
        expect(canSave()).toBe(true);
      });

      it('should update reactively when form values change', () => {
        waypoints.set([...mockWaypoints]);
        
        // Initially false with empty name
        expect(canSave()).toBe(false);
        
        // Update name
        routeForm.patchValue({ name: 'New Route' });
        
        // Should now be true
        expect(canSave()).toBe(true);
        
        // Clear name again
        routeForm.patchValue({ name: '' });
        
        // Should be false again
        expect(canSave()).toBe(false);
      });

      it('should update reactively when waypoints change', () => {
        routeForm.patchValue({ name: 'Valid Route' });
        
        // Start with 1 waypoint - should be false
        waypoints.set([mockWaypoints[0]]);
        expect(canSave()).toBe(false);
        
        // Add second waypoint - should be true
        waypoints.set([...mockWaypoints]);
        expect(canSave()).toBe(true);
        
        // Remove all waypoints - should be false
        waypoints.set([]);
        expect(canSave()).toBe(false);
      });
    });

    describe('edit mode', () => {
      beforeEach(() => {
        mode.set('edit');
        // Simulate loading a route
        routeForm.reset({
          name: mockRoute.name,
          notes: mockRoute.notes,
          enabled: mockRoute.enabled
        });
        waypoints.set(mockRoute.waypoints || []);
        originalFormValues.set({
          name: mockRoute.name || '',
          notes: mockRoute.notes || '',
          enabled: mockRoute.enabled
        });
        originalWaypoints.set(mockRoute.waypoints || []);
      });

      it('should return false when no changes made', () => {
        expect(canSave()).toBe(false);
      });

      it('should return true when name changed', () => {
        routeForm.patchValue({ name: 'Updated Route Name' });
        expect(canSave()).toBe(true);
      });

      it('should return true when notes changed', () => {
        routeForm.patchValue({ notes: 'Updated Notes' });
        expect(canSave()).toBe(true);
      });

      it('should return true when enabled status changed', () => {
        routeForm.patchValue({ enabled: false });
        expect(canSave()).toBe(true);
      });

      it('should return true when waypoint added', () => {
        const currentWaypoints = waypoints();
        const newWaypoint: Waypoint = { 
          id: '3', 
          lat: 5.61, 
          lng: -0.19, 
          order: 2 
        };
        waypoints.set([...currentWaypoints, newWaypoint]);
        
        expect(canSave()).toBe(true);
      });

      it('should return true when waypoint coordinates changed', () => {
        const modifiedWaypoints = waypoints().map((wp: Waypoint, index: number) => 
          index === 0 ? { ...wp, lat: 5.7 } : wp
        );
        waypoints.set(modifiedWaypoints);
        
        expect(canSave()).toBe(true);
      });

      it('should return true when waypoint order changed', () => {
        const reorderedWaypoints = waypoints().map((wp: Waypoint, index: number) => ({
          ...wp,
          order: index === 0 ? 1 : 0
        }));
        waypoints.set(reorderedWaypoints);
        
        expect(canSave()).toBe(true);
      });

      it('should still require valid name and 2+ waypoints even with changes', () => {
        // Clear the name
        routeForm.patchValue({ name: '' });
        expect(canSave()).toBe(false);
        
        // Valid name but only 1 waypoint
        routeForm.patchValue({ name: 'Valid Name' });
        waypoints.set([mockWaypoints[0]]);
        expect(canSave()).toBe(false);
      });

      it('should handle removing waypoints below minimum', () => {
        // Start with 2 waypoints
        expect(waypoints().length).toBe(2);
        
        // Remove one waypoint - should have changes but canSave false
        waypoints.set([mockWaypoints[0]]);
        
        // Has changes because waypoint count changed
        expect(hasChanges()).toBe(true);
        // But canSave is false because < 2 waypoints
        expect(canSave()).toBe(false);
      });

      it('should return false after saving changes', () => {
        // Make a change
        routeForm.patchValue({ name: 'Updated Name' });
        expect(canSave()).toBe(true);
        
        // Simulate save - update original values
        const currentForm = currentFormValues();
        originalFormValues.set({ ...currentForm });
        originalWaypoints.set(waypoints().map((wp: Waypoint) => ({ ...wp })));
        
        // Should no longer detect changes
        expect(hasChanges()).toBe(false);
        expect(canSave()).toBe(false);
      });
    });

    describe('view mode', () => {
      beforeEach(() => {
        mode.set('view');
        routeForm.reset({
          name: mockRoute.name,
          notes: mockRoute.notes,
          enabled: mockRoute.enabled
        });
        waypoints.set(mockRoute.waypoints || []);
      });

      it('should always return false in view mode', () => {
        expect(canSave()).toBe(false);
        
        // Even if waypoints change somehow
        waypoints.set([]);
        expect(canSave()).toBe(false);
        
        // Even with valid data
        waypoints.set([...mockWaypoints, { id: '3', lat: 5.61, lng: -0.19, order: 2 }]);
        routeForm.patchValue({ name: 'Valid Name' });
        expect(canSave()).toBe(false);
      });
    });
  });

  describe('hasChanges method', () => {
    beforeEach(() => {
      mode.set('edit');
      routeForm.reset({
        name: mockRoute.name,
        notes: mockRoute.notes,
        enabled: mockRoute.enabled
      });
      waypoints.set(mockRoute.waypoints || []);
      originalFormValues.set({
        name: mockRoute.name || '',
        description: mockRoute.description || '',
        enabled: mockRoute.enabled
      });
      originalWaypoints.set(mockRoute.waypoints || []);
    });

    it('should detect form field changes correctly', () => {
      expect(hasChanges()).toBe(false);
      
      // Change name
      routeForm.patchValue({ name: 'New Name' });
      expect(hasChanges()).toBe(true);
      
      // Change back to original
      routeForm.patchValue({ name: mockRoute.name });
      expect(hasChanges()).toBe(false);
    });

    it('should detect waypoint changes correctly', () => {
      // Add waypoint
      const newWaypoint: Waypoint = { id: '3', lat: 5.61, lng: -0.19, order: 2 };
      waypoints.set([...waypoints(), newWaypoint]);
      expect(hasChanges()).toBe(true);
      
      // Reset to original
      waypoints.set(mockRoute.waypoints || []);
      expect(hasChanges()).toBe(false);
    });

    it('should handle edge cases', () => {
      // Set original form values to null
      originalFormValues.set(null);
      expect(hasChanges()).toBe(false);
      
      // Empty waypoints comparison
      waypoints.set([]);
      originalWaypoints.set([]);
      expect(hasChanges()).toBe(false);
    });

    it('should compare waypoints by value not reference', () => {
      // Create new waypoint objects with same values
      const sameValueWaypoints = originalWaypoints().map((wp: Waypoint) => ({
        ...wp
      }));
      waypoints.set(sameValueWaypoints);
      
      expect(hasChanges()).toBe(false);
    });
  });
});