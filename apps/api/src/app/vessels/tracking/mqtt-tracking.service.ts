import { Injectable, OnModuleInit } from '@nestjs/common';
import { connect, MqttClient } from 'mqtt';
import { TrackingService } from './tracking.service';
import { VesselService } from '../vessel.service';
import { VesselTelemetryInputDto } from './dto/vessel-telemetry-input.dto';
import { GeoPoint } from '@ghanawaters/shared-models';

@Injectable()
export class MqttTrackingService implements OnModuleInit {
  private client: MqttClient;

  constructor(
    private trackingService: TrackingService,
    private vesselService: VesselService
  ) {}

  async onModuleInit() {
    // Connect to MQTT broker
    this.client = connect('mqtt://localhost:1883', {
      username: process.env.ARTEMIS_USER || 'artemis',
      password: process.env.ARTEMIS_PASSWORD || 'artemis_password',
      clientId: `nestjs-tracking-${Date.now()}`
    });

    this.client.on('connect', () => {
      console.log('Connected to MQTT broker');
      
      // Subscribe to vessel tracking topics
      this.client.subscribe('vessels/+/track');
    });

    this.client.on('message', async (topic, payload) => {
      try {
        // Extract vessel ID from topic (e.g., 'vessels/123/track' → 123)
        const match = topic.match(/vessels\/(\d+)\/track/);
        const vesselId = match ? parseInt(match[1], 10) : null;
        
        if (!vesselId) {
          console.warn('Invalid topic format:', topic);
          return;
        }

        // Check if vessel exists
        const vessel = await this.vesselService.findOne(vesselId);
        if (!vessel) {
          console.warn(`Received data for unknown vessel ID: ${vesselId}`);
          return;
        }

        // Parse position data
        const data = JSON.parse(payload.toString());
        
        // Validate position data
        if (!data.position || !data.position.coordinates || data.position.coordinates.length !== 2) {
          console.error('Invalid position format in MQTT message');
          return;
        }
        
        // Create tracking point
        const trackingData: VesselTelemetryInputDto = {
          timestamp: data.timestamp,
          position: data.position as GeoPoint,
          speed_knots: data.speed_knots,
          heading_degrees: data.heading_degrees,
          status: data.status || (data.speed_knots > 0.5 ? 'moving' : 'stationary')
        };
        
        await this.trackingService.create(vesselId, trackingData, data.device_id);
        console.log(`Recorded position for vessel ${vesselId}`);
      } catch (error) {
        console.error('Error processing MQTT message:', error);
      }
    });

    this.client.on('error', (error) => {
      console.error('MQTT Error:', error);
    });
  }
}