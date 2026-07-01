import { IsNumber, IsOptional, Min } from "class-validator";

export class ReversalDto {
  @IsNumber()
  @Min(0.01)
  @IsOptional()
  amount?: number;
}