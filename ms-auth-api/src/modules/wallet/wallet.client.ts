import { HttpService } from '@nestjs/axios';
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';

@Injectable()
export class WalletClient {
  private readonly logger = new Logger(WalletClient.name);
  private readonly walletUrl: string;

  constructor(
    private readonly http: HttpService,
    private readonly config: ConfigService,
  ) {
    this.walletUrl = this.config.get<string>('WALLET_SERVICE_URL', 'http://wallet-api:3002');
  }

  async createWallet(userId: string): Promise<void> {
    try {
      await firstValueFrom(
        this.http.post(`${this.walletUrl}/wallet`, {}, {
          headers: { 'x-user-id': userId },
        }),
      );
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      this.logger.error(`Failed to create wallet for userId=${userId}: ${message}`);
      throw err;
    }
  }
}
