import { IsEnum, IsInt, IsString, Min, MinLength } from 'class-validator';
import { TopUpMethod } from '@prisma/client';

export class CreateTopUpDto {
  @IsInt()
  @Min(1)
  amount!: number;

  @IsEnum(TopUpMethod)
  method!: TopUpMethod;

  @IsString()
  @MinLength(1)
  reference!: string;
}
