import { User } from "@/modules/users/entities/user.entity";
import { Injectable, UnauthorizedException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository, IsNull } from "typeorm";
import { LoginDto } from "@/modules/auth/dto/login.dto";
import { AuthTokensResponseDto } from "@/modules/auth/dto/responses/auth-tokens.response.dto";

import * as bcrypt from 'bcrypt';
import { RefreshToken } from "@/modules/auth/entities/refresh-token.entity";
import { JwtService } from "@nestjs/jwt";
import { randomUUID } from "crypto";

@Injectable()
export class LoginUseCase {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(RefreshToken)
    private readonly refreshTokenRepository: Repository<RefreshToken>,
    private readonly jwtService: JwtService
  ) { }

  async execute({ email, password }: LoginDto): Promise<AuthTokensResponseDto> {
    const user = await this.userRepository.findOne({ where: { email } });
    if (!user) throw new UnauthorizedException('Invalid credentials');

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) throw new UnauthorizedException('Invalid credentials');

    await this.refreshTokenRepository.update(
      { userId: user.id, revokedAt: IsNull() },
      { revokedAt: new Date() },
    );

    return this.issueTokens(user.id);
  }

  async issueTokens(userId: string): Promise<AuthTokensResponseDto> {
    const accessToken = this.jwtService.sign(
      { sub: userId, iss: 'auth-api' },
      { expiresIn: '15m' },
    );

    const refreshToken = this.refreshTokenRepository.create({
      token: randomUUID(),
      userId,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    });

    await this.refreshTokenRepository.save(refreshToken);

    return { accessToken, refreshToken: refreshToken.token };
  }
}
