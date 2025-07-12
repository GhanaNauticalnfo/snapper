import { Controller, Post, Body, HttpCode, UnauthorizedException, Logger } from '@nestjs/common';
import { DeviceAuthService } from '../device/device-auth.service';
import { Public } from '../../auth/decorators';

@Controller('mqtt')
export class MqttAuthController {
  private readonly logger = new Logger(MqttAuthController.name);

  constructor(private deviceAuthService: DeviceAuthService) {}

  @Public()
  @Post('auth')
  @HttpCode(200) // Always return 200 for success, NanoMQ expects this
  async authenticate(
    @Body('clientid') clientId: string,
    @Body('username') username: string,
    @Body('password') password: string,
  ): Promise<void> {
    this.logger.debug(`MQTT auth request - clientid: ${clientId}, username: ${username}`);

    // Special case for API user
    if (username === 'api') {
      const expectedPassword = process.env.MQTT_API_PASSWORD || 'mqtt_api_password';
      if (password === expectedPassword) {
        this.logger.debug('API user authenticated successfully');
        return; // 200 OK
      }
      this.logger.warn('API user authentication failed - invalid password');
      throw new UnauthorizedException();
    }

    // For vessels: username should be vessel ID, password is device token
    try {
      const device = await this.deviceAuthService.validateDevice(password);
      
      // Verify device belongs to the vessel ID in username
      if (device.vessel_id?.toString() !== username) {
        this.logger.warn(`Device vessel_id (${device.vessel_id}) does not match username (${username})`);
        throw new UnauthorizedException();
      }
      
      this.logger.debug(`Device authenticated successfully for vessel ${username}`);
      return; // 200 OK
    } catch (error) {
      this.logger.warn(`Device authentication failed: ${error.message}`);
      throw new UnauthorizedException();
    }
  }
}