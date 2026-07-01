import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { Wallet } from "../entities/wallet.entity";

@Injectable()
export class CreateWalletUseCase {
  constructor(
    @InjectRepository(Wallet)
    private readonly walletRepo: Repository<Wallet>,
  ) {}

  async execute(userId: string) {
    const exists = await this.walletRepo.findOneBy({ userId });
    
    if (exists) return exists;

    const wallet = this.walletRepo.create({ userId, balance: 0 });

    return this.walletRepo.save(wallet);
  }
}