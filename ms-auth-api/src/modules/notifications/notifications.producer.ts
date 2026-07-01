import { InjectQueue } from '@nestjs/bullmq';
import { Injectable } from '@nestjs/common';
import { Queue } from 'bullmq';
import { NotificationPayloadDto } from './dto/notification-payload.dto';
import { NOTIFICATION_JOB_OPTIONS, NOTIFICATIONS_QUEUE, SEND_NOTIFICATION_JOB } from './notifications.constants';

@Injectable()
export class NotificationsProducer {
  constructor(
    @InjectQueue(NOTIFICATIONS_QUEUE)
    private readonly queue: Queue,
  ) {}

  enqueue(payload: NotificationPayloadDto) {
    return this.queue.add(SEND_NOTIFICATION_JOB, payload, NOTIFICATION_JOB_OPTIONS);
  }
}
