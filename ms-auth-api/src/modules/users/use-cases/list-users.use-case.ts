import { UserResponseDto } from "@/modules/users/dto/responses/user.response.dto";
import { User } from "@/modules/users/entities/user.entity";
import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Not, Repository } from "typeorm";

@Injectable()
export class ListUsersUseCase {
    constructor(
        @InjectRepository(User)
        private readonly userRepository: Repository<User>,
    ) {}

    async execute(currentUserId: string): Promise<UserResponseDto[]> {
        const users = await this.userRepository.find({
            where: { id: Not(currentUserId) },
        });

        return users.map(({ id, name, email }) => ({ id, name, email }));
    }
}
