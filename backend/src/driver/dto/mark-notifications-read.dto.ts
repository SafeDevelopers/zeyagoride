import { IsArray, IsOptional, IsString } from 'class-validator';

export class MarkNotificationsReadDto {
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  ids?: string[];
}
