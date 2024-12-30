import { IsString, IsNotEmpty } from 'class-validator';

export class UpdateMasterDto {
  @IsString()
  @IsNotEmpty()
  columnName: string;

  @IsString()
  @IsNotEmpty()
  value: string;
}
