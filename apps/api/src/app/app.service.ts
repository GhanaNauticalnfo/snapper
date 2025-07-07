import { Injectable } from '@nestjs/common';

@Injectable()
export class AppService {
  getData(): { message: string; buildTime?: string; tag?: string } {
    return { 
      message: 'Hello API!',
      buildTime: process.env.BUILD_TIME || 'unknown',
      tag: process.env.BUILD_TAG || 'unknown'
    };
  }
}
