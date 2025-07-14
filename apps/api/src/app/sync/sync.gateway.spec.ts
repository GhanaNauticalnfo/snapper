import { Test, TestingModule } from '@nestjs/testing';
import { Server, Socket } from 'socket.io';
import { SyncGateway } from './sync.gateway';

describe('SyncGateway', () => {
  let gateway: SyncGateway;
  let mockServer: Partial<Server>;
  let mockSocket: Partial<Socket>;

  beforeEach(async () => {
    mockServer = {
      emit: jest.fn(),
      to: jest.fn().mockReturnThis(),
    };

    mockSocket = {
      id: 'test-socket-id',
      join: jest.fn(),
      leave: jest.fn(),
      emit: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [SyncGateway],
    }).compile();

    gateway = module.get<SyncGateway>(SyncGateway);
    gateway.server = mockServer as Server;
  });

  it('should be defined', () => {
    expect(gateway).toBeDefined();
  });

  describe('afterInit', () => {
    it('should log initialization', () => {
      const logSpy = jest.spyOn(console, 'log').mockImplementation();
      gateway.afterInit(mockServer as Server);
      expect(logSpy).toHaveBeenCalledWith('Sync WebSocket Gateway initialized');
      logSpy.mockRestore();
    });
  });

  describe('handleConnection', () => {
    it('should log client connection and join sync room', () => {
      const logSpy = jest.spyOn(console, 'log').mockImplementation();
      gateway.handleConnection(mockSocket as Socket);
      
      expect(mockSocket.join).toHaveBeenCalledWith('sync-updates');
      expect(logSpy).toHaveBeenCalledWith(`Sync client connected: ${mockSocket.id}`);
      logSpy.mockRestore();
    });
  });

  describe('handleDisconnect', () => {
    it('should log client disconnection', () => {
      const logSpy = jest.spyOn(console, 'log').mockImplementation();
      gateway.handleDisconnect(mockSocket as Socket);
      
      expect(logSpy).toHaveBeenCalledWith(`Sync client disconnected: ${mockSocket.id}`);
      logSpy.mockRestore();
    });
  });

  describe('emitSyncUpdate', () => {
    it('should emit sync update to all connected clients', () => {
      const majorVersion = 1;
      const minorVersion = 123;
      
      gateway.emitSyncUpdate(majorVersion, minorVersion);
      
      expect(mockServer.to).toHaveBeenCalledWith('sync-updates');
      expect(mockServer.emit).toHaveBeenCalledWith('sync-update', {
        major_version: majorVersion,
        minor_version: minorVersion,
        timestamp: expect.any(Date)
      });
    });

    it('should log the sync update', () => {
      const logSpy = jest.spyOn(console, 'log').mockImplementation();
      const majorVersion = 2;
      const minorVersion = 456;
      
      gateway.emitSyncUpdate(majorVersion, minorVersion);
      
      expect(logSpy).toHaveBeenCalledWith(
        `Emitting sync update: v${majorVersion}.${minorVersion}`
      );
      logSpy.mockRestore();
    });

    it('should handle missing server gracefully', () => {
      gateway.server = undefined;
      
      // Should not throw
      expect(() => gateway.emitSyncUpdate(1, 1)).not.toThrow();
    });
  });

  describe('WebSocket subscription messages', () => {
    it('should handle subscribe-sync message', () => {
      const handler = gateway.handleSubscribeSync(mockSocket as Socket);
      
      expect(mockSocket.join).toHaveBeenCalledWith('sync-updates');
      expect(handler).toEqual({ event: 'subscribed', data: 'sync-updates' });
    });

    it('should handle unsubscribe-sync message', () => {
      const handler = gateway.handleUnsubscribeSync(mockSocket as Socket);
      
      expect(mockSocket.leave).toHaveBeenCalledWith('sync-updates');
      expect(handler).toEqual({ event: 'unsubscribed', data: 'sync-updates' });
    });
  });
});