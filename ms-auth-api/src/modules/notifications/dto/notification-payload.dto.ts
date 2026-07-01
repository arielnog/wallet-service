import { IsOptional, IsString } from 'class-validator';

export class NotificationPayloadDto {
  @IsString()
  to: string;

  @IsOptional()
  @IsString()
  subject?: string;

  @IsString()
  body: string;
}
