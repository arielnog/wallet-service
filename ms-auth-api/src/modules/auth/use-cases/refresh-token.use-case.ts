import { Injectable, UnauthorizedException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull } from 'typeorm';
import { RefreshToken } from '../entities/refresh-token.entity';
import { AuthTokensResponseDto } from '../dto/responses/auth-tokens.response.dto';
import { MessageResponseDto } from '../dto/responses/message.response.dto';
import { LoginUseCase } from './login.use-case';

@Injectable()
export class RefreshTokenUseCase {
  constructor(
    @InjectRepository(RefreshToken)
    private readonly tokenRepo: Repository<RefreshToken>,
    private readonly loginUseCase: LoginUseCase,
  ) {}

  async execute(token: string): Promise<AuthTokensResponseDto> {
    const record = await this.tokenRepo.findOneBy({ token });

    if (!record) throw new UnauthorizedException('Invalid token');
    if (record.isRevoked()) throw new UnauthorizedException('Token already revoked');
    if (record.isExpired()) throw new UnauthorizedException('Token expired');

    await this.tokenRepo.update(record.id, { revokedAt: new Date() });

    return this.loginUseCase.issueTokens(record.userId);
  }

  async revoke(token: string): Promise<MessageResponseDto> {
    const record = await this.tokenRepo.findOneBy({ token, revokedAt: IsNull() });

    if (!record) throw new UnauthorizedException('Invalid or already revoked token');

    await this.tokenRepo.update(record.id, { revokedAt: new Date() });

    return { message: 'Logged out successfully' };
  }
}
