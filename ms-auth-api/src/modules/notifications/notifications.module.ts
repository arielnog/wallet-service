import { MailerModule } from '@nestjs-modules/mailer';
import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NOTIFICATIONS_QUEUE } from './notifications.constants';
import { NotificationsProcessor } from './notifications.processor';
import { NotificationsProducer } from './notifications.producer';
import { EmailStrategy } from './strategies/email.strategy';
import { NotificationStrategy } from './strategies/notification.strategy';

@Module({
  imports: [
    BullModule.registerQueue({ name: NOTIFICATIONS_QUEUE }),
    MailerModule.forRootAsync({
      useFactory: (config: ConfigService) => ({
        transport: {
          host: config.get<string>('MAIL_HOST'),
          port: config.get<number>('MAIL_PORT'),
          secure: config.get<boolean>('MAIL_SECURE'),
          auth: {
            user: config.get<string>('MAIL_USER'),
            pass: config.get<string>('MAIL_PASS'),
          },
        },
        defaults: {
          from: config.get<string>('MAIL_FROM'),
        },
      }),
      inject: [ConfigService],
    }),
  ],
  providers: [
    NotificationsProducer,
    NotificationsProcessor,
    EmailStrategy,
    {
      provide: NotificationStrategy,
      useExisting: EmailStrategy,
    },
  ],
  exports: [NotificationsProducer],
})
export class NotificationsModule {}
