import { IsEmail, IsNotEmpty, IsString, IsStrongPassword } from "class-validator";

export class RegisterDto {
    @IsEmail()
    @IsNotEmpty()
    readonly email: string;

    @IsNotEmpty()
    @IsStrongPassword()
    readonly password: string;

    @IsNotEmpty()
    @IsString()
    readonly name: string;
}