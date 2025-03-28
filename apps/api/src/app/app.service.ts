import { Injectable } from '@nestjs/common';

// NICE
@Injectable()
export class AppService {
  getData(): { message: string } {
    return { message: 'Hello API' };
  }
}
