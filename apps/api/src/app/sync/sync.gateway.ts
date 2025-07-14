import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayInit,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger } from '@nestjs/common';
import { SyncNotification } from './mqtt-sync.service';

@WebSocketGateway({
  namespace: '/sync',
  cors: {
    origin: true,
    credentials: true,
  },
})
export class SyncGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server: Server;

  private logger = new Logger('SyncGateway');

  afterInit(server: Server) {
    this.logger.log('Sync WebSocket Gateway initialized');
  }

  handleConnection(client: Socket) {
    this.logger.log(`Client connected to sync namespace: ${client.id}`);
    // All clients automatically receive all sync updates - no subscription needed
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Client disconnected from sync namespace: ${client.id}`);
  }

  /**
   * Emit sync update notification to all connected clients
   * This is a fire-and-forget operation - failures don't affect sync
   */
  emitSyncUpdate(majorVersion: number, minorVersion: number): void {
    try {
      const notification: SyncNotification = {
        major_version: majorVersion,
        minor_version: minorVersion,
      };

      // Emit to all connected clients
      this.server.emit('sync-update', {
        ...notification,
        timestamp: new Date(),
      });

      this.logger.debug(`Emitted sync update: v${majorVersion}.${minorVersion}`);
    } catch (error) {
      // Log error but don't throw - sync should continue even if WebSocket fails
      this.logger.error('Error emitting sync update:', error);
    }
  }
}