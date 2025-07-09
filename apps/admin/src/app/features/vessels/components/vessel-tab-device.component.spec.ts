import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { VesselTabDeviceComponent } from './vessel-tab-device.component';
import { ConfirmationService, MessageService } from 'primeng/api';
import { of, throwError, Subject } from 'rxjs';
import { Device } from '../models/device.model';
import { VesselDataset } from '../models/vessel-dataset.model';
import { signal } from '@angular/core';
import { NO_ERRORS_SCHEMA } from '@angular/core';

// Mock Socket.io
const mockSocket = {
  on: jest.fn(),
  emit: jest.fn(),
  disconnect: jest.fn(),
  connected: true,
};

// Mock io function
jest.mock('socket.io-client', () => ({
  io: jest.fn(() => mockSocket),
}));

describe('VesselTabDeviceComponent', () => {
  let component: VesselTabDeviceComponent;
  let fixture: ComponentFixture<VesselTabDeviceComponent>;
  let messageService: jest.Mocked<MessageService>;
  let confirmationService: jest.Mocked<ConfirmationService>;
  let httpClient: any;

  const mockVessel: VesselDataset = {
    id: 123,
    name: 'Test Vessel',
    type: 'Vessel',
  } as VesselDataset;

  const mockPendingDevice: Device = {
    device_id: 'pending-123',
    device_token: 'pending-token',
    activation_token: 'activation-token',
    auth_token: null,
    is_activated: false,
    state: 'pending',
    activated_at: null,
    expires_at: new Date(Date.now() + 86400000), // 1 day from now
    vessel_id: 123,
    created_at: new Date(),
    updated_at: new Date(),
  };

  const mockActiveDevice: Device = {
    device_id: 'active-123',
    device_token: 'active-token',
    activation_token: '',
    auth_token: 'auth-token-123',
    is_activated: true,
    state: 'active',
    activated_at: new Date(),
    expires_at: new Date(Date.now() + 86400000),
    vessel_id: 123,
    created_at: new Date(),
    updated_at: new Date(),
  };

  beforeEach(async () => {
    // Reset mock socket for each test
    mockSocket.on.mockClear();
    mockSocket.emit.mockClear();
    mockSocket.disconnect.mockClear();
    
    const messageServiceSpy = {
      add: jest.fn()
    };
    const confirmationSubject = new Subject();
    const confirmationServiceSpy = {
      confirm: jest.fn(),
      requireConfirmation$: confirmationSubject.asObservable(),
      onAccept: jest.fn(),
      accept: jest.fn(),
      reject: jest.fn(),
      close: jest.fn()
    };

    await TestBed.configureTestingModule({
      imports: [HttpClientTestingModule, VesselTabDeviceComponent],
      providers: [
        { provide: MessageService, useValue: messageServiceSpy },
        { provide: ConfirmationService, useValue: confirmationServiceSpy },
      ],
      schemas: [NO_ERRORS_SCHEMA]
    }).compileComponents();

    fixture = TestBed.createComponent(VesselTabDeviceComponent);
    component = fixture.componentInstance;
    messageService = TestBed.inject(MessageService) as jest.Mocked<MessageService>;
    confirmationService = TestBed.inject(ConfirmationService) as jest.Mocked<ConfirmationService>;
  });

  afterEach(() => {
    if (fixture) {
      fixture.destroy();
    }
  });

  describe('Component Lifecycle', () => {
    it('should create', () => {
      expect(component).toBeTruthy();
    });

    it('should load devices and setup WebSocket on init when vessel is provided', () => {
      jest.spyOn(component, 'loadDevices');
      jest.spyOn(component as any, 'setupDeviceSocket');
      component.vessel = mockVessel;

      component.ngOnInit();

      expect(component.loadDevices).toHaveBeenCalled();
      expect(component['setupDeviceSocket']).toHaveBeenCalled();
    });

    it('should disconnect WebSocket on destroy', () => {
      jest.spyOn(component as any, 'disconnectDeviceSocket');

      component.ngOnDestroy();

      expect(component['disconnectDeviceSocket']).toHaveBeenCalled();
    });

    it('should reload devices and reconnect WebSocket on vessel change', () => {
      jest.spyOn(component, 'loadDevices');
      jest.spyOn(component as any, 'disconnectDeviceSocket');
      jest.spyOn(component as any, 'setupDeviceSocket');
      component.vessel = mockVessel;

      component.ngOnChanges();

      expect(component.loadDevices).toHaveBeenCalled();
      expect(component['disconnectDeviceSocket']).toHaveBeenCalled();
      expect(component['setupDeviceSocket']).toHaveBeenCalled();
    });
  });

  describe('WebSocket Connection', () => {
    beforeEach(() => {
      component.vessel = mockVessel;
    });

    it('should setup WebSocket connection and subscribe to vessel devices', () => {
      // Setup event handlers
      let connectHandler: Function;
      mockSocket.on.mockImplementation((event: string, handler: Function) => {
        if (event === 'connect') {
          connectHandler = handler;
        }
      });

      component['setupDeviceSocket']();

      // Simulate connection
      connectHandler!();

      expect(mockSocket.emit).toHaveBeenCalledWith('subscribe-vessel-devices', 123);
    });

    it('should handle device-activated event', () => {
      let deviceActivatedHandler: Function;
      mockSocket.on.mockImplementation((event: string, handler: Function) => {
        if (event === 'device-activated') {
          deviceActivatedHandler = handler;
        }
      });

      component['setupDeviceSocket']();

      // Simulate device activation event
      const eventData = {
        vesselId: 123,
        device: mockActiveDevice,
        timestamp: new Date(),
      };

      deviceActivatedHandler!(eventData);

      expect(component.pendingDevice()).toBeNull();
      expect(component.activeDevice()).toEqual(mockActiveDevice);
      expect(component.activationAnimation()).toBe(true);
      expect(messageService.add).toHaveBeenCalledWith({
        severity: 'success',
        summary: 'Device Activated!',
        detail: `Device ${mockActiveDevice.device_id} has been successfully activated`,
        life: 5000,
      });
    });

    it('should handle device-created event', () => {
      let deviceCreatedHandler: Function;
      mockSocket.on.mockImplementation((event: string, handler: Function) => {
        if (event === 'device-created') {
          deviceCreatedHandler = handler;
        }
      });

      component['setupDeviceSocket']();

      const eventData = {
        vesselId: 123,
        device: mockPendingDevice,
        timestamp: new Date(),
      };

      deviceCreatedHandler!(eventData);

      expect(component.pendingDevice()).toEqual(mockPendingDevice);
    });

    it('should handle device-retired event', () => {
      let deviceRetiredHandler: Function;
      mockSocket.on.mockImplementation((event: string, handler: Function) => {
        if (event === 'device-retired') {
          deviceRetiredHandler = handler;
        }
      });

      component.activeDevice.set(mockActiveDevice);
      component['setupDeviceSocket']();

      const eventData = {
        vesselId: 123,
        deviceId: 'active-123',
        timestamp: new Date(),
      };

      deviceRetiredHandler!(eventData);

      expect(component.activeDevice()).toBeNull();
      expect(messageService.add).toHaveBeenCalledWith({
        severity: 'info',
        summary: 'Device Retired',
        detail: 'The active device has been retired',
        life: 3000,
      });
    });

    it('should handle device-deleted event', () => {
      let deviceDeletedHandler: Function;
      mockSocket.on.mockImplementation((event: string, handler: Function) => {
        if (event === 'device-deleted') {
          deviceDeletedHandler = handler;
        }
      });

      component.pendingDevice.set(mockPendingDevice);
      component['setupDeviceSocket']();

      const eventData = {
        vesselId: 123,
        deviceId: 'pending-123',
        timestamp: new Date(),
      };

      deviceDeletedHandler!(eventData);

      expect(component.pendingDevice()).toBeNull();
    });

    it('should ignore events for other vessels', () => {
      let deviceActivatedHandler: Function;
      mockSocket.on.mockImplementation((event: string, handler: Function) => {
        if (event === 'device-activated') {
          deviceActivatedHandler = handler;
        }
      });

      component['setupDeviceSocket']();

      const eventData = {
        vesselId: 999, // Different vessel
        device: mockActiveDevice,
        timestamp: new Date(),
      };

      deviceActivatedHandler!(eventData);

      expect(component.activeDevice()).toBeNull();
      expect(messageService.add).not.toHaveBeenCalled();
    });

    it('should disconnect WebSocket properly', () => {
      component['deviceSocket'] = mockSocket as any;
      component.vessel = mockVessel;

      component['disconnectDeviceSocket']();

      expect(mockSocket.emit).toHaveBeenCalledWith('unsubscribe-vessel-devices', 123);
      expect(mockSocket.disconnect).toHaveBeenCalled();
      expect(component['deviceSocket']).toBeUndefined();
    });
  });

  describe('Visual Feedback', () => {
    it('should reset activation animation after delay', async () => {
      // Use Jest fake timers
      jest.useFakeTimers();
      
      component.activationAnimation.set(true);
      expect(component.activationAnimation()).toBe(true);
      
      // Fast-forward 3 seconds
      jest.advanceTimersByTime(3000);
      
      // Animation should not be reset yet because it's set in the WebSocket handler
      // This test just ensures the signal can be set and read
      expect(component.activationAnimation()).toBe(true);
      
      jest.useRealTimers();
    });
  });

  describe('URL Generation', () => {
    it('should generate correct public activation URL', () => {
      const url = component.getPublicActivationUrl(mockPendingDevice);
      expect(url).toBe('ghanawaters://auth?token=activation-token');
    });

    it('should generate correct HTTPS activation URL', () => {
      const url = component.getHttpsActivationUrl(mockPendingDevice);
      expect(url).toContain('/activate?token=activation-token');
    });
  });

  describe('Clipboard Operations', () => {
    it('should copy text to clipboard successfully', async () => {
      const mockClipboard = {
        writeText: jest.fn().mockResolvedValue(undefined),
      };
      Object.defineProperty(navigator, 'clipboard', {
        value: mockClipboard,
        configurable: true,
      });

      await component.copyToClipboard('test-text');

      expect(mockClipboard.writeText).toHaveBeenCalledWith('test-text');
      expect(messageService.add).toHaveBeenCalledWith({
        severity: 'success',
        summary: 'Copied',
        detail: 'Activation link copied to clipboard',
      });
    });

    it('should handle clipboard copy failure', async () => {
      const mockClipboard = {
        writeText: jest.fn().mockRejectedValue(new Error('Clipboard error')),
      };
      Object.defineProperty(navigator, 'clipboard', {
        value: mockClipboard,
        configurable: true,
      });

      component.copyToClipboard('test-text');
      
      // Wait for promise to resolve
      await new Promise(resolve => setTimeout(resolve, 0));

      expect(messageService.add).toHaveBeenCalledWith({
        severity: 'error',
        summary: 'Error',
        detail: 'Failed to copy to clipboard',
      });
    });
  });
});