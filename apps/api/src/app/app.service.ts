import { Injectable } from '@nestjs/common';

//
@Injectable()
export class AppService {
  getData(): { message: string } {
    return { message: 'Hello API' };
  }
}
// Updated Tir 10 Jun 2025 12:42:01 CEST
