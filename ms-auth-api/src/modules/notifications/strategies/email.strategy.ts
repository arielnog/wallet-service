import { MailerService } from '@nestjs-modules/mailer';
import { Injectable } from '@nestjs/common';
import { NotificationPayloadDto } from '../dto/notification-payload.dto';
import { NotificationStrategy } from './notification.strategy';

@Injectable()
export class EmailStrategy extends NotificationStrategy {
  constructor(private readonly mailerService: MailerService) {
    super();
  }

  async sendMessage({ to, subject, body }: NotificationPayloadDto): Promise<void> {
    await this.mailerService.sendMail({
      to,
      subject,
      html: body,
    });
  }
}
