import { IsDateString } from "class-validator";

export class StatementQueryDto {
  @IsDateString()
  startDate: string;

  @IsDateString()
  endDate: string;
}
