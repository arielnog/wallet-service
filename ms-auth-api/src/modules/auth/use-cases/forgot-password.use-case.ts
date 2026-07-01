import { PasswordReset } from "@/modules/auth/entities/password-reset.entity";
import { MessageResponseDto } from "@/modules/auth/dto/responses/message.response.dto";
import { User } from "@/modules/users/entities/user.entity";
import { NotificationsProducer } from "@/modules/notifications/notifications.producer";
import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { randomUUID } from "crypto";
import { IsNull, Repository } from "typeorm";

@Injectable()
export class ForgotPasswordUseCase {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(PasswordReset)
    private readonly resetRepository: Repository<PasswordReset>,
    private readonly notificationsProducer: NotificationsProducer,
  ) {}

  async execute(email: string): Promise<MessageResponseDto> {
    const user = await this.userRepository.findOneBy({ email });
    if (!user) {
      return { message: 'If the email exists, a link has been sent' };
    }

    await this.resetRepository.update(
      { userId: user.id, usedAt: IsNull() },
      { usedAt: new Date() },
    );

    const resetToken = randomUUID();
    const expiresAt = new Date(Date.now() + 30 * 60 * 1000);

    await this.resetRepository.save(
      this.resetRepository.create({
        token: resetToken,
        userId: user.id,
        expiresAt,
      }),
    );

    await this.notificationsProducer.enqueue({
      to: user.email,
      subject: 'Password reset',
      body: `Use the token below to reset your password (valid for 30 minutes):\n\n${resetToken}`,
    });

    return { message: 'If the email exists, a link has been sent' };
  }
}
