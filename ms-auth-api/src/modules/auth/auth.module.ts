import { AuthController } from "@/modules/auth/auth.controller";
import { PasswordReset } from "@/modules/auth/entities/password-reset.entity";
import { RefreshToken } from "@/modules/auth/entities/refresh-token.entity";
import { JwtStrategy } from "@/modules/auth/strategies/jwt.strategy";
import { LocalStrategy } from "@/modules/auth/strategies/local.strategy";
import { ForgotPasswordUseCase } from "@/modules/auth/use-cases/forgot-password.use-case";
import { LoginUseCase } from "@/modules/auth/use-cases/login.use-case";
import { RefreshTokenUseCase } from "@/modules/auth/use-cases/refresh-token.use-case";
import { RegisterUseCase } from "@/modules/auth/use-cases/register.use-case";
import { ResetPasswordUseCase } from "@/modules/auth/use-cases/reset-password.use-case";
import { User } from "@/modules/users/entities/user.entity";
import { NotificationsModule } from "@/modules/notifications/notifications.module";
import { WalletClient } from "@/modules/wallet/wallet.client";
import { HttpModule } from "@nestjs/axios";
import { Module } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { JwtModule } from "@nestjs/jwt";
import { PassportModule } from "@nestjs/passport";
import { TypeOrmModule } from "@nestjs/typeorm";

@Module({
    imports: [
        TypeOrmModule.forFeature([User, RefreshToken, PasswordReset]),
        JwtModule.registerAsync({
            useFactory: async (configService: ConfigService) => ({
                secret: configService.get('JWT_SECRET'),
                signOptions: { expiresIn: configService.get('JWT_EXPIRES_IN') },
            }),
            inject: [ConfigService],
        }),
        PassportModule,
        NotificationsModule,
        HttpModule,
    ],
    controllers: [AuthController],
    providers: [
        LocalStrategy,
        JwtStrategy,
        RegisterUseCase,
        LoginUseCase,
        RefreshTokenUseCase,
        ForgotPasswordUseCase,
        ResetPasswordUseCase,
        WalletClient,
    ],
})
export class AuthModule {}
