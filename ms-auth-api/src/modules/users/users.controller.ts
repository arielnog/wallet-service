import { ListUsersUseCase } from "@/modules/users/use-cases/list-users.use-case";
import { Controller, Get, Headers, UseGuards } from "@nestjs/common";
import { AuthGuard } from "@nestjs/passport";

@Controller('users')
export class UsersController {
  constructor(
    private readonly listUsersUseCase: ListUsersUseCase,
  ) {}

  @Get()
  @UseGuards(AuthGuard('jwt'))
  findAll(@Headers('x-user-id') userId: string,) {
    return this.listUsersUseCase.execute(userId);
  }
}
