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
import { VesselTelemetry } from './vessel-telemetry.entity';
import { Vessel } from '../vessel.entity';
import { GeoPoint, isGeoPoint } from '@ghanawaters/shared-models';

interface PositionUpdate {
  vesselId: number;
  vesselName: string;
  vesselType: string;
  lat: number;
  lng: number;
  heading: number | null;
  speed: number | null;
  status: string | null;
  timestamp: Date;
}

@WebSocketGateway({
  namespace: '/tracking',
  cors: {
    origin: true,
    credentials: true,
  },
})
export class TrackingGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server: Server;

  private logger = new Logger('TrackingGateway');

  afterInit(server: Server) {
    this.logger.log('WebSocket Gateway initialized');
  }

  handleConnection(client: Socket) {
    this.logger.log(`Client connected: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Client disconnected: ${client.id}`);
  }

  @SubscribeMessage('subscribe-all')
  handleSubscribeAll(@ConnectedSocket() client: Socket) {
    client.join('all-vessels');
    this.logger.log(`Client ${client.id} subscribed to all vessels`);
    return { event: 'subscribed', data: 'all-vessels' };
  }

  @SubscribeMessage('unsubscribe-all')
  handleUnsubscribeAll(@ConnectedSocket() client: Socket) {
    client.leave('all-vessels');
    this.logger.log(`Client ${client.id} unsubscribed from all vessels`);
    return { event: 'unsubscribed', data: 'all-vessels' };
  }

  @SubscribeMessage('subscribe-vessel')
  handleSubscribeVessel(
    @MessageBody() vesselId: number,
    @ConnectedSocket() client: Socket,
  ) {
    client.join(`vessel-${vesselId}`);
    this.logger.log(`Client ${client.id} subscribed to vessel ${vesselId}`);
    return { event: 'subscribed', data: `vessel-${vesselId}` };
  }

  @SubscribeMessage('unsubscribe-vessel')
  handleUnsubscribeVessel(
    @MessageBody() vesselId: number,
    @ConnectedSocket() client: Socket,
  ) {
    client.leave(`vessel-${vesselId}`);
    this.logger.log(`Client ${client.id} unsubscribed from vessel ${vesselId}`);
    return { event: 'unsubscribed', data: `vessel-${vesselId}` };
  }

  // Called by tracking service when new position is saved
  broadcastPosition(trackingPoint: VesselTelemetry, vessel: Vessel, position: GeoPoint) {
    const [lng, lat] = position.coordinates;
    const update: PositionUpdate = {
      vesselId: vessel.id,
      vesselName: vessel.name,
      vesselType: vessel.vessel_type?.name || 'Unknown',
      lat: lat,
      lng: lng,
      heading: trackingPoint.heading_degrees,
      speed: trackingPoint.speed_knots,
      status: trackingPoint.status,
      timestamp: trackingPoint.timestamp,
    };

    // Broadcast to all vessels room
    this.server.to('all-vessels').emit('position-update', update);
    
    // Broadcast to specific vessel room
    this.server.to(`vessel-${vessel.id}`).emit('position-update', update);
    
    this.logger.log(`Broadcasted position update for vessel ${vessel.id} at ${lng}, ${lat}`);
  }

  // Broadcast multiple position updates (e.g., initial load)
  broadcastPositions(positions: Array<{ trackingPoint: VesselTelemetry; vessel: Vessel }>) {
    const updates: PositionUpdate[] = [];
    
    for (const { trackingPoint, vessel } of positions) {
      let lat: number, lng: number;
      
      if (trackingPoint.position) {
        // Handle raw PostGIS WKT format or GeoJSON format
        if (typeof trackingPoint.position === 'string') {
          // PostGIS returns WKT format like "POINT(-0.1225 5.6037)"
          const match = (trackingPoint.position as any).match(/POINT\(([^ ]+) ([^ ]+)\)/);
          if (match) {
            lng = parseFloat(match[1]);
            lat = parseFloat(match[2]);
          } else {
            continue;
          }
        } else if (isGeoPoint(trackingPoint.position)) {
          // Proper GeoJSON Point format
          [lng, lat] = trackingPoint.position.coordinates;
        } else {
          continue;
        }
      } else {
        continue;
      }

      updates.push({
        vesselId: vessel.id,
        vesselName: vessel.name,
        vesselType: vessel.vessel_type?.name || 'Unknown',
        lat: lat,
        lng: lng,
        heading: trackingPoint.heading_degrees,
        speed: trackingPoint.speed_knots,
        status: trackingPoint.status,
        timestamp: trackingPoint.timestamp,
      });
    }

    if (updates.length > 0) {
      this.server.to('all-vessels').emit('positions-batch', updates);
      this.logger.log(`Broadcasted ${updates.length} position updates`);
    }
  }
}