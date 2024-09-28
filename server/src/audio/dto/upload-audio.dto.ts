import { Transform, Type } from "class-transformer";
import { IsArray, IsEmail, IsNotEmpty, IsObject, ValidateNested } from "class-validator";

export class TargetGroupDto {
  @IsNotEmpty()
  TGName: string;

  @IsNotEmpty()
  ProjId: string;

  @IsNotEmpty()
  AudioName: string;

  @IsNotEmpty()
  Country: string;

  @IsNotEmpty()
  State: string;

  @IsNotEmpty()
  AgeGrp: string;

  @IsNotEmpty()
  CompetetionProduct: string[];

  @IsNotEmpty()
  MaricoProduct: string[];

  @IsNotEmpty()
  MainLang: string;

  @IsNotEmpty()
  SecondaryLang: string[];

  @IsNotEmpty()
  noOfSpek: number;

  @IsNotEmpty()
  filePath: string;
}

export class ProjectGroupDTO{
    @IsNotEmpty()
    ProjName: string;
  
    @IsNotEmpty()
    userid: string;
  
    @IsNotEmpty()
    ProjId: string;

    @IsArray()
    TGIds :string[]

}

export class UploadAudioDto {
 
    @IsObject()
    ProjectGroupDTO

    @IsArray()
    @ValidateNested({ each: true })
    TargetGroupDto

// @IsArray()
//   @ValidateNested({ each: true })
//   @Type(() => TargetGroupDto)
//   TargetGrp: TargetGroupDto[];
}
