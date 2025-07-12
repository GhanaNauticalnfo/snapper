import { MqttClient } from 'mqtt';
import { EventEmitter } from 'events';

/**
 * Mock MQTT Client for testing
 */
export class MockMqttClient extends EventEmitter implements Partial<MqttClient> {
  public connected = false;
  public subscriptions = new Set<string>();
  public publishedMessages: Array<{ topic: string; message: string; options?: any }> = [];

  constructor() {
    super();
  }

  connect(): this {
    setTimeout(() => {
      this.connected = true;
      this.emit('connect');
    }, 0);
    return this;
  }

  subscribe(topic: string | string[], callback?: (err: Error | null) => void): this {
    const topics = Array.isArray(topic) ? topic : [topic];
    topics.forEach(t => this.subscriptions.add(t));
    
    if (callback) {
      setTimeout(() => callback(null), 0);
    }
    return this;
  }

  unsubscribe(topic: string | string[], callback?: (err: Error | null) => void): this {
    const topics = Array.isArray(topic) ? topic : [topic];
    topics.forEach(t => this.subscriptions.delete(t));
    
    if (callback) {
      setTimeout(() => callback(null), 0);
    }
    return this;
  }

  publish(
    topic: string,
    message: string | Buffer,
    options?: any,
    callback?: (err?: Error) => void
  ): this {
    this.publishedMessages.push({
      topic,
      message: message.toString(),
      options,
    });

    if (callback) {
      setTimeout(() => callback(), 0);
    }
    return this;
  }

  end(force?: boolean, callback?: () => void): this {
    this.connected = false;
    this.emit('close');
    
    if (callback) {
      setTimeout(callback, 0);
    }
    return this;
  }

  /**
   * Simulate receiving a message
   */
  simulateMessage(topic: string, payload: string | Buffer): void {
    this.emit('message', topic, Buffer.from(payload));
  }

  /**
   * Simulate an error
   */
  simulateError(error: Error): void {
    this.emit('error', error);
  }

  /**
   * Simulate going offline
   */
  simulateOffline(): void {
    this.connected = false;
    this.emit('offline');
  }

  /**
   * Simulate reconnecting
   */
  simulateReconnect(): void {
    this.emit('reconnect');
  }

  /**
   * Clear all recorded data
   */
  reset(): void {
    this.publishedMessages = [];
    this.subscriptions.clear();
    this.removeAllListeners();
  }
}

/**
 * Create a mock MQTT module for jest
 */
export function createMockMqttModule() {
  const mockClient = new MockMqttClient();
  
  return {
    connect: jest.fn(() => mockClient),
    mockClient,
  };
}

/**
 * Helper to wait for MQTT events in tests
 */
export async function waitForMqttEvent(
  client: MockMqttClient,
  event: string,
  timeout = 1000
): Promise<any> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error(`Timeout waiting for MQTT event: ${event}`));
    }, timeout);

    client.once(event, (...args) => {
      clearTimeout(timer);
      resolve(args);
    });
  });
}

/**
 * Helper to create a test MQTT message
 */
export function createMqttMessage(data: any): Buffer {
  return Buffer.from(JSON.stringify(data));
}

/**
 * Helper to verify MQTT authentication request format
 */
export function parseMqttAuthRequest(body: string): Record<string, string> {
  const params = new URLSearchParams(body);
  const result: Record<string, string> = {};
  
  params.forEach((value, key) => {
    result[key] = value;
  });
  
  return result;
}

/**
 * Mock DeviceAuthService for MQTT tests
 */
export class MockDeviceAuthService {
  private devices = new Map<string, any>();

  addDevice(token: string, device: any): void {
    this.devices.set(token, device);
  }

  async validateDevice(token: string): Promise<any> {
    const device = this.devices.get(token);
    if (!device) {
      throw new Error('Invalid device token');
    }
    return device;
  }

  reset(): void {
    this.devices.clear();
  }
}

/**
 * Test data factory for MQTT messages
 */
export class MqttTestDataFactory {
  static createVesselPosition(overrides: Partial<any> = {}): any {
    return {
      timestamp: new Date().toISOString(),
      position: {
        type: 'Point',
        coordinates: [-0.5, 5.5],
      },
      speed_knots: 10.5,
      heading_degrees: 180,
      status: 'moving',
      device_id: 'test-device-123',
      ...overrides,
    };
  }

  static createSyncNotification(majorVersion: number, minorVersion: number): any {
    return {
      major_version: majorVersion,
      minor_version: minorVersion,
    };
  }

  static createDevice(vesselId: number, overrides: Partial<any> = {}): any {
    return {
      id: 1,
      device_id: `device-${vesselId}`,
      vessel_id: vesselId,
      state: 'active',
      auth_token: `token-${vesselId}`,
      activation_token: null,
      activated_at: new Date(),
      expires_at: null,
      created_at: new Date(),
      updated_at: new Date(),
      ...overrides,
    };
  }
}

/**
 * MQTT test environment setup
 */
export class MqttTestEnvironment {
  private originalEnv: Record<string, string | undefined> = {};

  setUp(config: {
    brokerUrl?: string;
    apiPassword?: string;
    enabled?: boolean;
  } = {}): void {
    // Save original values
    this.originalEnv.MQTT_BROKER_URL = process.env.MQTT_BROKER_URL;
    this.originalEnv.MQTT_API_PASSWORD = process.env.MQTT_API_PASSWORD;
    this.originalEnv.MQTT_ENABLED = process.env.MQTT_ENABLED;

    // Set test values
    process.env.MQTT_BROKER_URL = config.brokerUrl || 'mqtt://test-broker:1883';
    process.env.MQTT_API_PASSWORD = config.apiPassword || 'test-password';
    process.env.MQTT_ENABLED = config.enabled !== false ? 'true' : 'false';
  }

  tearDown(): void {
    // Restore original values
    Object.entries(this.originalEnv).forEach(([key, value]) => {
      if (value === undefined) {
        delete process.env[key];
      } else {
        process.env[key] = value;
      }
    });
  }
}

/**
 * Integration test helper for MQTT
 */
export class MqttIntegrationTestHelper {
  private mqttClient: MockMqttClient | null = null;
  private subscriptions: string[] = [];
  private receivedMessages: Array<{ topic: string; payload: any }> = [];

  async connect(options: {
    brokerUrl?: string;
    username?: string;
    password?: string;
    clientId?: string;
  } = {}): Promise<MockMqttClient> {
    this.mqttClient = new MockMqttClient();
    this.mqttClient.connect();
    
    await waitForMqttEvent(this.mqttClient, 'connect');
    
    this.mqttClient.on('message', (topic, payload) => {
      try {
        const data = JSON.parse(payload.toString());
        this.receivedMessages.push({ topic, payload: data });
      } catch (e) {
        this.receivedMessages.push({ topic, payload: payload.toString() });
      }
    });
    
    return this.mqttClient;
  }

  async subscribe(topics: string | string[]): Promise<void> {
    if (!this.mqttClient) {
      throw new Error('Not connected');
    }

    const topicArray = Array.isArray(topics) ? topics : [topics];
    this.subscriptions.push(...topicArray);
    
    return new Promise((resolve, reject) => {
      this.mqttClient!.subscribe(topics, (err) => {
        if (err) reject(err);
        else resolve();
      });
    });
  }

  async waitForMessage(
    filter?: (msg: { topic: string; payload: any }) => boolean,
    timeout = 5000
  ): Promise<{ topic: string; payload: any }> {
    const startTime = Date.now();
    
    while (Date.now() - startTime < timeout) {
      const message = filter
        ? this.receivedMessages.find(filter)
        : this.receivedMessages[0];
      
      if (message) {
        return message;
      }
      
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    throw new Error('Timeout waiting for message');
  }

  getReceivedMessages(): Array<{ topic: string; payload: any }> {
    return [...this.receivedMessages];
  }

  clearReceivedMessages(): void {
    this.receivedMessages = [];
  }

  async disconnect(): Promise<void> {
    if (this.mqttClient) {
      this.mqttClient.end();
      this.mqttClient = null;
    }
    this.subscriptions = [];
    this.receivedMessages = [];
  }
}