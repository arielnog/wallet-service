import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { NotificationPayloadDto } from './dto/notification-payload.dto';
import { NOTIFICATIONS_QUEUE } from './notifications.constants';
import { NotificationStrategy } from './strategies/notification.strategy';

@Processor(NOTIFICATIONS_QUEUE)
export class NotificationsProcessor extends WorkerHost {
  private readonly logger = new Logger(NotificationsProcessor.name);

  constructor(private readonly strategy: NotificationStrategy) {
    super();
  }

  async process(job: Job<NotificationPayloadDto>): Promise<void> {
    this.logger.log(`Processing job ${job.id} — to: ${job.data.to}`);
    await this.strategy.sendMessage(job.data);
  }
}
