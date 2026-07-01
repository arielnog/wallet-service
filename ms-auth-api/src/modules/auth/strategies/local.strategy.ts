import { LoginUseCase } from "@/modules/auth/use-cases/login.use-case";
import { Injectable } from "@nestjs/common";
import { PassportStrategy } from "@nestjs/passport";
import { Strategy } from "passport-local";

@Injectable()
export class LocalStrategy extends PassportStrategy(Strategy, 'local') {
  constructor(private readonly loginUseCase: LoginUseCase) {
    super({ usernameField: 'email' });
  }

  async validate(email: string, password: string) {
    return this.loginUseCase.execute({email, password});
  }
}