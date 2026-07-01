import { User } from "@/modules/users/entities/user.entity";
import { ListUsersUseCase } from "@/modules/users/use-cases/list-users.use-case";
import { UsersController } from "@/modules/users/users.controller";
import { Module } from "@nestjs/common";
import { PassportModule } from "@nestjs/passport";
import { TypeOrmModule } from "@nestjs/typeorm";

@Module({
    imports: [
        TypeOrmModule.forFeature([User]),
        PassportModule,
    ],
    controllers: [UsersController],
    providers: [ListUsersUseCase],
})
export class UsersModule {}
