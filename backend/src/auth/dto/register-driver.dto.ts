import { IsInt, IsOptional, IsString, Min } from 'class-validator';
import { ProfileFieldsDto } from './profile-fields.dto';

export class RegisterDriverDto extends ProfileFieldsDto {

  @IsString()
  make!: string;

  @IsString()
  model!: string;

  @IsString()
  color!: string;

  @IsString()
  tagNumber!: string;

  @IsInt()
  @Min(1)
  capacity!: number;

  @IsOptional()
  @IsString()
  insuranceExpiry?: string;
}
