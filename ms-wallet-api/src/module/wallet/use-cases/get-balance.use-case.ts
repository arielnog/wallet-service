import { Injectable, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Wallet } from "../entities/wallet.entity";
import { Repository } from "typeorm";

@Injectable()
export class GetBalanceUseCase {
  constructor(
    @InjectRepository(Wallet)
    private readonly walletRepo: Repository<Wallet>,
  ) {}

  async execute(userId: string) {
    const wallet = await this.walletRepo.findOne({
      where: { userId }
    });

    if (!wallet) throw new NotFoundException('Wallet not found for the given user ID');

    return {
      balance: wallet.balance,
    };
  }
}