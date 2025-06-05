import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { DeviceAuthService } from './device-auth.service';

@Injectable()
export class DeviceAuthGuard implements CanActivate {
  constructor(private deviceAuthService: DeviceAuthService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const authHeader = request.headers['authorization'];

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return false;
    }

    const token = authHeader.substring(7);
    
    try {
      const device = await this.deviceAuthService.validateDevice(token);
      request.device = device;
      return true;
    } catch {
      return false;
    }
  }
}