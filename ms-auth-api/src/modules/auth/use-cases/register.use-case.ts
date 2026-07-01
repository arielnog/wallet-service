import { RegisterDto } from "@/modules/auth/dto/register.dto";
import { RegisterResponseDto } from "@/modules/auth/dto/responses/register.response.dto";
import { User } from "@/modules/users/entities/user.entity";
import { WalletClient } from "@/modules/wallet/wallet.client";
import { ConflictException, Injectable } from "@nestjs/common";
import { InjectDataSource, InjectRepository } from "@nestjs/typeorm";
import { DataSource, Repository } from "typeorm";

import * as bcrypt from 'bcrypt';

@Injectable()
export class RegisterUseCase {
    constructor(
        @InjectRepository(User)
        private readonly userRepository: Repository<User>,
        private readonly walletClient: WalletClient,
        @InjectDataSource()
        private readonly dataSource: DataSource,
    ) {}

    async execute({ name, email, password }: RegisterDto): Promise<RegisterResponseDto> {
        const existingUser = await this.userRepository.findOne({ where: { email } });

        if (existingUser) throw new ConflictException("User already exists");

        const user = this.userRepository.create({
            name,
            email,
            password: await bcrypt.hash(password, 10),
        });

        await this.dataSource.transaction(async (manager) => {
            await manager.save(user);
            await this.walletClient.createWallet(user.id);
        });

        return { id: user.id, name: user.name, email: user.email };
    }
}
