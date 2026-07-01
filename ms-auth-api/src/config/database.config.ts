// src/config/database.config.ts
import { TypeOrmModuleAsyncOptions } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';
import { User } from '@/modules/users/entities/user.entity';
import { RefreshToken } from '@/modules/auth/entities/refresh-token.entity';
import { PasswordReset } from '@/modules/auth/entities/password-reset.entity';

export const typeOrmAsyncConfig: TypeOrmModuleAsyncOptions = {
  useFactory: async (configService: ConfigService) => ({
    type: 'better-sqlite3',
    database: configService.get<string>('DATABASE_PATH') ?? './data/auth.db',
    entities: [User,RefreshToken,PasswordReset],
    synchronize: configService.get('NODE_ENV') !== 'production',
    logging: configService.get('NODE_ENV') !== 'production',
  }),
  inject: [ConfigService],
};