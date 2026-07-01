import { NotificationPayloadDto } from '../dto/notification-payload.dto';

export abstract class NotificationStrategy {
  abstract sendMessage(payload: NotificationPayloadDto): Promise<void>;
}
