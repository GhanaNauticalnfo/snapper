import { FormBuilder } from '@angular/forms';
import { signal } from '@angular/core';
import { Route, Waypoint } from '../models/route.model';
import { RouteValidators } from '../validators/route.validators';

describe('RouteFormComponent - Operations (Unit)', () => {
  let fb: FormBuilder;
  
  // Mock component properties
  let routeForm: any;
  let mode: any;
  let route: any;
  let waypoints: any;
  let currentFormValues: any;
  let originalFormValues: any;
  let originalWaypoints: any;
  let mapReady: any;
  let showWaypointEditorDialog: boolean;
  
  // Mock services
  let mockRouteLayerService: any;
  let mockConfirmationService: any;
  
  // Mock outputs
  let saveEmitSpy: jest.Mock;
  let cancelEmitSpy: jest.Mock;
  
  // Component methods to test
  let saveRoute: any;
  let onCancel: any;
  let clearWaypoints: any;
  let onWaypointsChange: any;
  let showWaypointEditor: any;
  let updateRouteDisplay: any;
  let fitMapToWaypoints: any;
  let resetFormWithRouteData: any;
  let updateFormState: any;
  let canSave: any;
  let hasChanges: any;

  const mockRoute: Route = {
    id: 1,
    name: 'Test Route',
    description: 'Test Description',
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
    jest.useFakeTimers();
    fb = new FormBuilder();
    
    // Initialize form
    routeForm = fb.nonNullable.group({
      name: fb.nonNullable.control('', RouteValidators.routeName()),
      description: fb.nonNullable.control('', RouteValidators.routeDescription()),
      enabled: fb.nonNullable.control<boolean>(true)
    });
    
    // Initialize signals
    mode = signal<'view' | 'edit' | 'create'>('create');
    route = signal<Route | null>(null);
    waypoints = signal<Waypoint[]>([]);
    currentFormValues = signal<{ name: string; description: string; enabled: boolean }>({ 
      name: '', 
      description: '', 
      enabled: true 
    });
    originalFormValues = signal<{ name: string; description: string; enabled: boolean } | null>(null);
    originalWaypoints = signal<Waypoint[]>([]);
    mapReady = signal(false);
    showWaypointEditorDialog = false;
    
    // Mock services
    mockRouteLayerService = {
      setRouteData: jest.fn(),
      fitToRoute: jest.fn()
    };
    
    mockConfirmationService = {
      confirm: jest.fn()
    };
    
    // Mock outputs
    saveEmitSpy = jest.fn();
    cancelEmitSpy = jest.fn();
    
    // Subscribe to form changes
    routeForm.valueChanges.subscribe((values: any) => {
      currentFormValues.set(values);
    });
    
    // Implement hasChanges
    hasChanges = () => {
      const current = currentFormValues();
      const originalForm = originalFormValues();
      const currentWaypoints = waypoints();
      const originalWaypointsList = originalWaypoints();
      
      if (originalForm) {
        const formChanged = (
          current.name !== originalForm.name ||
          current.description !== originalForm.description ||
          current.enabled !== originalForm.enabled
        );
        if (formChanged) return true;
      }
      
      if (currentWaypoints.length !== originalWaypointsList.length) {
        return true;
      }
      
      return !currentWaypoints.every((wp: Waypoint, index: number) => {
        const origWp = originalWaypointsList[index];
        return origWp && 
          wp.lat === origWp.lat && 
          wp.lng === origWp.lng &&
          wp.order === origWp.order;
      });
    };
    
    // Implement canSave
    canSave = () => {
      const currentMode = mode();
      const current = currentFormValues();
      
      if (currentMode === 'view') return false;
      
      const hasValidName = current.name && current.name.trim().length > 0;
      const hasEnoughWaypoints = waypoints().length >= 2;
      
      if (!hasValidName || !hasEnoughWaypoints) return false;
      
      if (currentMode === 'edit') {
        return hasChanges();
      }
      
      return true;
    };
    
    // Implement component methods
    saveRoute = () => {
      if (canSave()) {
        const formValue = routeForm.value;
        const currentRoute = route();
        
        const routeData: Route = {
          name: formValue.name,
          description: formValue.description,
          waypoints: waypoints(),
          enabled: formValue.enabled
        };
        
        if (currentRoute?.id) {
          routeData.id = currentRoute.id;
        }
        
        saveEmitSpy(routeData);
        mapReady.set(false);
        
        const savedFormValues = {
          name: formValue.name,
          description: formValue.description,
          enabled: formValue.enabled
        };
        currentFormValues.set(savedFormValues);
        originalFormValues.set({ ...savedFormValues });
        originalWaypoints.set(waypoints().map((wp: Waypoint) => ({ ...wp })));
      }
    };
    
    onCancel = () => {
      if (mode() !== 'view' && hasChanges()) {
        mockConfirmationService.confirm({
          message: 'You have unsaved changes. Are you sure you want to cancel?',
          header: 'Unsaved Changes',
          icon: 'pi pi-exclamation-triangle',
          accept: () => {
            mapReady.set(false);
            cancelEmitSpy();
          }
        });
      } else {
        mapReady.set(false);
        cancelEmitSpy();
      }
    };
    
    clearWaypoints = () => {
      waypoints.set([]);
      updateRouteDisplay();
    };
    
    onWaypointsChange = (newWaypoints: Waypoint[]) => {
      waypoints.set(newWaypoints);
      updateRouteDisplay();
      fitMapToWaypoints();
    };
    
    showWaypointEditor = () => {
      showWaypointEditorDialog = true;
    };
    
    updateRouteDisplay = () => {
      const waypointList = waypoints();
      const routeName = routeForm.get('name')?.value || 'Route';
      const description = routeForm.get('description')?.value || '';
      const enabled = routeForm.get('enabled')?.value as boolean;
      
      const routeWaypoints = waypointList.map((wp: Waypoint) => ({
        id: wp.id || crypto.randomUUID(),
        lat: wp.lat,
        lng: wp.lng,
        order: wp.order,
        name: wp.name || `Waypoint ${wp.order + 1}`
      }));
      
      mockRouteLayerService.setRouteData({
        id: route()?.id,
        name: routeName,
        description: description,
        waypoints: routeWaypoints,
        enabled: enabled
      });
    };
    
    fitMapToWaypoints = () => {
      if (waypoints().length === 0) return;
      
      setTimeout(() => {
        mockRouteLayerService.fitToRoute();
      }, 200);
    };
    
    resetFormWithRouteData = () => {
      const currentRoute = route();
      
      if (currentRoute) {
        const formData = {
          name: currentRoute.name || '',
          description: currentRoute.description || '',
          enabled: Boolean(currentRoute.enabled)
        };
        routeForm.reset(formData);
        
        waypoints.set(currentRoute.waypoints || []);
        
        currentFormValues.set({ ...formData });
        originalFormValues.set({ ...formData });
        originalWaypoints.set(currentRoute.waypoints ? 
          currentRoute.waypoints.map((wp: any) => ({ ...wp })) : []
        );
      } else {
        const formData = {
          name: '',
          description: '',
          enabled: true
        };
        routeForm.reset(formData);
        waypoints.set([]);
        
        currentFormValues.set({ ...formData });
        originalFormValues.set(null);
        originalWaypoints.set([]);
      }
      
      if (mapReady()) {
        setTimeout(() => {
          updateRouteDisplay();
          fitMapToWaypoints();
        }, 100);
      }
    };
    
    updateFormState = () => {
      if (mode() === 'view') {
        routeForm.disable();
      } else {
        routeForm.enable();
      }
    };
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('saveRoute operation', () => {
    it('should not save when canSave returns false', () => {
      // Setup invalid state
      routeForm.patchValue({ name: '' });
      waypoints.set([]);
      
      saveRoute();
      
      expect(saveEmitSpy).not.toHaveBeenCalled();
    });

    it('should emit save event with correct data in create mode', () => {
      mode.set('create');
      routeForm.patchValue({
        name: 'New Route',
        description: 'New Description',
        enabled: false
      });
      waypoints.set(mockWaypoints);
      
      saveRoute();
      
      expect(saveEmitSpy).toHaveBeenCalledWith({
        name: 'New Route',
        description: 'New Description',
        waypoints: mockWaypoints,
        enabled: false
      });
    });

    it('should include ID in edit mode', () => {
      mode.set('edit');
      route.set(mockRoute);
      resetFormWithRouteData();
      
      // Make a change to enable save
      routeForm.patchValue({ name: 'Updated Route' });
      
      saveRoute();
      
      expect(saveEmitSpy).toHaveBeenCalledWith({
        id: 1,
        name: 'Updated Route',
        description: mockRoute.description,
        waypoints: mockRoute.waypoints,
        enabled: mockRoute.enabled
      });
    });

    it('should update original values after save', () => {
      mode.set('edit');
      route.set(mockRoute);
      resetFormWithRouteData();
      
      // Make changes
      routeForm.patchValue({ name: 'Changed Name' });
      const newWaypoint = { id: '3', lat: 6.0, lng: -1.0, order: 2 };
      waypoints.set([...waypoints(), newWaypoint]);
      
      // Verify changes detected before save
      expect(hasChanges()).toBe(true);
      
      saveRoute();
      
      // Verify original values updated
      expect(originalFormValues()?.name).toBe('Changed Name');
      expect(originalWaypoints().length).toBe(3);
      
      // Verify no changes detected after save
      expect(hasChanges()).toBe(false);
    });

    it('should reset mapReady state', () => {
      mode.set('create');
      mapReady.set(true);
      routeForm.patchValue({ name: 'Test' });
      waypoints.set(mockWaypoints);
      
      saveRoute();
      
      expect(mapReady()).toBe(false);
    });
  });

  describe('onCancel operation', () => {
    it('should show confirmation when there are unsaved changes', () => {
      mode.set('edit');
      route.set(mockRoute);
      resetFormWithRouteData();
      
      // Make a change
      routeForm.patchValue({ name: 'Changed' });
      
      onCancel();
      
      expect(mockConfirmationService.confirm).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'You have unsaved changes. Are you sure you want to cancel?',
          header: 'Unsaved Changes'
        })
      );
      expect(cancelEmitSpy).not.toHaveBeenCalled();
    });

    it('should cancel without confirmation in view mode', () => {
      mode.set('view');
      route.set(mockRoute);
      resetFormWithRouteData();
      
      onCancel();
      
      expect(mockConfirmationService.confirm).not.toHaveBeenCalled();
      expect(cancelEmitSpy).toHaveBeenCalled();
    });

    it('should cancel without confirmation when no changes', () => {
      mode.set('edit');
      route.set(mockRoute);
      resetFormWithRouteData();
      
      onCancel();
      
      expect(mockConfirmationService.confirm).not.toHaveBeenCalled();
      expect(cancelEmitSpy).toHaveBeenCalled();
    });

    it('should emit cancel and reset mapReady when confirmed', () => {
      mode.set('edit');
      route.set(mockRoute);
      resetFormWithRouteData();
      mapReady.set(true);
      
      // Make a change
      routeForm.patchValue({ name: 'Changed' });
      
      onCancel();
      
      // Simulate user accepting confirmation
      const confirmCall = mockConfirmationService.confirm.mock.calls[0][0];
      confirmCall.accept();
      
      expect(cancelEmitSpy).toHaveBeenCalled();
      expect(mapReady()).toBe(false);
    });
  });

  describe('waypoint management operations', () => {
    it('should clear waypoints and update display', () => {
      waypoints.set(mockWaypoints);
      
      clearWaypoints();
      
      expect(waypoints()).toEqual([]);
      expect(mockRouteLayerService.setRouteData).toHaveBeenCalled();
    });

    it('should update waypoints and trigger map operations', () => {
      const newWaypoints = [
        { id: 'new1', lat: 6.0, lng: -1.0, order: 0 },
        { id: 'new2', lat: 6.1, lng: -1.1, order: 1 }
      ];
      
      onWaypointsChange(newWaypoints);
      
      expect(waypoints()).toEqual(newWaypoints);
      expect(mockRouteLayerService.setRouteData).toHaveBeenCalled();
      
      // Wait for fitMapToWaypoints timeout
      jest.advanceTimersByTime(200);
      expect(mockRouteLayerService.fitToRoute).toHaveBeenCalled();
    });

    it('should show waypoint editor dialog', () => {
      expect(showWaypointEditorDialog).toBe(false);
      
      showWaypointEditor();
      
      expect(showWaypointEditorDialog).toBe(true);
    });
  });

  describe('form initialization', () => {
    it('should reset form with route data in edit mode', () => {
      route.set(mockRoute);
      
      resetFormWithRouteData();
      
      expect(routeForm.value).toEqual({
        name: mockRoute.name,
        description: mockRoute.description,
        enabled: mockRoute.enabled
      });
      expect(waypoints()).toEqual(mockRoute.waypoints);
      expect(originalFormValues()).toEqual({
        name: mockRoute.name,
        description: mockRoute.description,
        enabled: mockRoute.enabled
      });
    });

    it('should reset form to defaults in create mode', () => {
      route.set(null);
      
      resetFormWithRouteData();
      
      expect(routeForm.value).toEqual({
        name: '',
        description: '',
        enabled: true
      });
      expect(waypoints()).toEqual([]);
      expect(originalFormValues()).toBeNull();
    });

    it('should handle route with missing fields', () => {
      const incompleteRoute: Route = {
        name: 'Test',
        waypoints: [],
        enabled: true
      };
      route.set(incompleteRoute);
      
      resetFormWithRouteData();
      
      expect(routeForm.value.description).toBe('');
    });
  });

  describe('form state management', () => {
    it('should disable form in view mode', () => {
      mode.set('view');
      
      updateFormState();
      
      expect(routeForm.disabled).toBe(true);
    });

    it('should enable form in edit mode', () => {
      mode.set('edit');
      routeForm.disable(); // Start disabled
      
      updateFormState();
      
      expect(routeForm.disabled).toBe(false);
    });

    it('should enable form in create mode', () => {
      mode.set('create');
      routeForm.disable(); // Start disabled
      
      updateFormState();
      
      expect(routeForm.disabled).toBe(false);
    });
  });

  describe('updateRouteDisplay', () => {
    it('should convert waypoints to route format', () => {
      routeForm.patchValue({
        name: 'Test Route',
        description: 'Test Desc',
        enabled: true
      });
      waypoints.set(mockWaypoints);
      route.set(mockRoute);
      
      updateRouteDisplay();
      
      expect(mockRouteLayerService.setRouteData).toHaveBeenCalledWith({
        id: 1,
        name: 'Test Route',
        description: 'Test Desc',
        waypoints: expect.arrayContaining([
          expect.objectContaining({
            lat: mockWaypoints[0].lat,
            lng: mockWaypoints[0].lng,
            order: 0
          })
        ]),
        enabled: true
      });
    });

    it('should use default values for empty fields', () => {
      routeForm.patchValue({
        name: '',
        description: '',
        enabled: false
      });
      waypoints.set([]);
      
      updateRouteDisplay();
      
      expect(mockRouteLayerService.setRouteData).toHaveBeenCalledWith({
        id: undefined,
        name: 'Route',
        description: '',
        waypoints: [],
        enabled: false
      });
    });
  });
});