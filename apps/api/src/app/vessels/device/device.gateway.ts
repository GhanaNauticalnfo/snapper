import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
  OnGatewayInit,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger } from '@nestjs/common';
import { Device } from './device.entity';
import { DeviceResponseDto } from './dto/device-response.dto';

@WebSocketGateway({
  namespace: '/devices',
  cors: {
    origin: true,
    credentials: true,
  },
})
export class DeviceGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server: Server;

  private logger = new Logger('DeviceGateway');

  afterInit(server: Server) {
    this.logger.log('Device WebSocket Gateway initialized');
  }

  handleConnection(client: Socket) {
    this.logger.log(`Client connected to devices namespace: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Client disconnected from devices namespace: ${client.id}`);
  }

  @SubscribeMessage('subscribe-vessel-devices')
  handleSubscribeVesselDevices(
    @MessageBody() vesselId: number,
    @ConnectedSocket() client: Socket,
  ) {
    const room = `vessel-devices-${vesselId}`;
    client.join(room);
    this.logger.log(`Client ${client.id} subscribed to vessel ${vesselId} device updates`);
    return { event: 'subscribed', data: room };
  }

  @SubscribeMessage('unsubscribe-vessel-devices')
  handleUnsubscribeVesselDevices(
    @MessageBody() vesselId: number,
    @ConnectedSocket() client: Socket,
  ) {
    const room = `vessel-devices-${vesselId}`;
    client.leave(room);
    this.logger.log(`Client ${client.id} unsubscribed from vessel ${vesselId} device updates`);
    return { event: 'unsubscribed', data: room };
  }

  /**
   * Emit when a device is activated
   */
  emitDeviceActivated(vesselId: number, device: Device) {
    const room = `vessel-devices-${vesselId}`;
    const deviceDto = device.toResponseDto();
    
    this.server.to(room).emit('device-activated', {
      vesselId,
      device: deviceDto,
      timestamp: new Date()
    });
    
    this.logger.log(`Emitted device-activated event for vessel ${vesselId}, device ${device.device_id}`);
  }

  /**
   * Emit when a device is retired
   */
  emitDeviceRetired(vesselId: number, deviceId: string) {
    const room = `vessel-devices-${vesselId}`;
    
    this.server.to(room).emit('device-retired', {
      vesselId,
      deviceId,
      timestamp: new Date()
    });
    
    this.logger.log(`Emitted device-retired event for vessel ${vesselId}, device ${deviceId}`);
  }

  /**
   * Emit when a device is created
   */
  emitDeviceCreated(vesselId: number, device: Device) {
    const room = `vessel-devices-${vesselId}`;
    const deviceDto = device.toResponseDto(true); // Include activation URL
    
    this.server.to(room).emit('device-created', {
      vesselId,
      device: deviceDto,
      timestamp: new Date()
    });
    
    this.logger.log(`Emitted device-created event for vessel ${vesselId}, device ${device.device_id}`);
  }

  /**
   * Emit when a device is deleted (pending devices)
   */
  emitDeviceDeleted(vesselId: number, deviceId: string) {
    const room = `vessel-devices-${vesselId}`;
    
    this.server.to(room).emit('device-deleted', {
      vesselId,
      deviceId,
      timestamp: new Date()
    });
    
    this.logger.log(`Emitted device-deleted event for vessel ${vesselId}, device ${deviceId}`);
  }
}