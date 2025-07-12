import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { connect, MqttClient } from 'mqtt';

export interface SyncNotification {
  major_version: number;
  minor_version: number;
}

@Injectable()
export class MqttSyncService implements OnModuleInit, OnModuleDestroy {
  private client: MqttClient | null = null;
  private readonly logger = new Logger(MqttSyncService.name);
  private isConnected = false;

  async onModuleInit() {
    // Only connect if MQTT is enabled
    if (process.env.MQTT_ENABLED === 'false') {
      this.logger.log('MQTT is disabled, skipping connection');
      return;
    }

    this.connectToMqtt();
  }

  async onModuleDestroy() {
    if (this.client) {
      this.client.end();
    }
  }

  private connectToMqtt() {
    const brokerUrl = process.env.MQTT_BROKER_URL || 'mqtt://localhost:1883';
    const apiPassword = process.env.MQTT_API_PASSWORD || 'mqtt_api_password';

    this.logger.log(`Connecting to MQTT broker at ${brokerUrl}`);

    this.client = connect(brokerUrl, {
      username: 'api',
      password: apiPassword,
      clientId: `api-sync-${Date.now()}`,
      reconnectPeriod: 5000, // Reconnect every 5 seconds if connection lost
    });

    this.client.on('connect', () => {
      this.isConnected = true;
      this.logger.log('Connected to MQTT broker');
    });

    this.client.on('error', (error) => {
      this.logger.error('MQTT connection error:', error);
      this.isConnected = false;
    });

    this.client.on('close', () => {
      this.logger.warn('MQTT connection closed');
      this.isConnected = false;
    });

    this.client.on('offline', () => {
      this.logger.warn('MQTT client is offline');
      this.isConnected = false;
    });

    this.client.on('reconnect', () => {
      this.logger.log('Attempting to reconnect to MQTT broker');
    });
  }

  /**
   * Publish sync notification to MQTT
   * This is a fire-and-forget operation - failures don't affect sync
   */
  async publishSyncNotification(majorVersion: number, minorVersion: number): Promise<void> {
    // Skip if MQTT is disabled or not connected
    if (!this.client || !this.isConnected) {
      this.logger.debug('MQTT not available, skipping sync notification');
      return;
    }

    try {
      const notification: SyncNotification = {
        major_version: majorVersion,
        minor_version: minorVersion,
      };

      const message = JSON.stringify(notification);
      
      // Publish with QoS 0 (fire and forget)
      this.client.publish('/sync', message, { qos: 0 }, (error) => {
        if (error) {
          this.logger.error('Failed to publish sync notification:', error);
        } else {
          this.logger.debug(`Published sync notification: v${majorVersion}.${minorVersion}`);
        }
      });
    } catch (error) {
      // Log error but don't throw - sync should continue even if MQTT fails
      this.logger.error('Error publishing sync notification:', error);
    }
  }
}