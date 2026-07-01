import { LoginDto } from "@/modules/auth/dto/login.dto";
import { RegisterDto } from "@/modules/auth/dto/register.dto";
import { ForgotPasswordUseCase } from "@/modules/auth/use-cases/forgot-password.use-case";
import { LoginUseCase } from "@/modules/auth/use-cases/login.use-case";
import { RefreshTokenUseCase } from "@/modules/auth/use-cases/refresh-token.use-case";
import { RegisterUseCase } from "@/modules/auth/use-cases/register.use-case";
import { ResetPasswordUseCase } from "@/modules/auth/use-cases/reset-password.use-case";
import {
    Body,
    Controller,
    Post,
    UseGuards
} from "@nestjs/common";
import { AuthGuard } from "@nestjs/passport";

@Controller('auth')
export class AuthController {
  constructor(
    private readonly registerUseCase: RegisterUseCase,
    private readonly loginUseCase: LoginUseCase,
    private readonly refreshTokenUseCase: RefreshTokenUseCase,
    private readonly forgotPasswordUseCase: ForgotPasswordUseCase,
    private readonly resetPasswordUseCase: ResetPasswordUseCase,
  ) {}

  @Post('register')
  register(@Body() dto: RegisterDto) {
    return this.registerUseCase.execute(dto);
  }

  @Post('login')
  login(@Body() dto: LoginDto) {
    return this.loginUseCase.execute(dto);
  }

  @Post('refresh')
  refresh(@Body('refreshToken') token: string) {
    return this.refreshTokenUseCase.execute(token);
  }

  @Post('logout')
  @UseGuards(AuthGuard('jwt'))
  logout(@Body('refreshToken') token: string) {
    return this.refreshTokenUseCase.revoke(token);
  }

  @Post('forgot-password')
  forgotPassword(@Body('email') email: string) {
    return this.forgotPasswordUseCase.execute(email);
  }

  @Post('reset-password')
  resetPassword(
    @Body('token') token: string,
    @Body('newPassword') newPassword: string,
  ) {
    return this.resetPasswordUseCase.execute(token, newPassword);
  }
}
