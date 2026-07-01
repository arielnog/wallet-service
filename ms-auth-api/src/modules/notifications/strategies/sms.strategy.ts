import { Injectable, Logger } from '@nestjs/common';
import { NotificationPayloadDto } from '../dto/notification-payload.dto';
import { NotificationStrategy } from './notification.strategy';

@Injectable()
export class SmsStrategy extends NotificationStrategy {
  private readonly logger = new Logger(SmsStrategy.name);

  async sendMessage({ to, body }: NotificationPayloadDto): Promise<void> {
    // TODO: integrar com provedor SMS (ex: Twilio, AWS SNS)
    this.logger.log(`[sms] to=${to} body="${body}"`);
  }
}
