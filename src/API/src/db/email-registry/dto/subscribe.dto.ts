import { IsBoolean, IsEmail } from 'class-validator';

export class SubscribeDto {
  @IsEmail()
  email: string;

  @IsBoolean()
  isNewsEnabled: boolean;

  @IsBoolean()
  isNewDatasetEnabled: boolean;
}