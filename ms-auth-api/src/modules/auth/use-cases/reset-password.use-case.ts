import { PasswordReset } from "@/modules/auth/entities/password-reset.entity";
import { MessageResponseDto } from "@/modules/auth/dto/responses/message.response.dto";
import { User } from "@/modules/users/entities/user.entity";
import { BadRequestException, Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";

import * as bcrypt from 'bcrypt';

@Injectable()
export class ResetPasswordUseCase {
  constructor(
    @InjectRepository(PasswordReset)
    private readonly resetRepository: Repository<PasswordReset>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  async execute(token: string, newPassword: string): Promise<MessageResponseDto> {
    const reset = await this.resetRepository.findOne({
      where: { token },
      relations: { user: true },
    });

    if (!reset || reset.usedAt || reset.expiresAt < new Date()) {
      throw new BadRequestException('Invalid or expired token');
    }

    await this.userRepository.update(reset.userId, {
      password: await bcrypt.hash(newPassword, 10),
    });

    await this.resetRepository.update(reset.id, {
      usedAt: new Date(),
    });

    return { message: 'Password changed successfully' };
  }
}
