// src/audio/entities/target-group.entity.ts
import { CosmosPartitionKey } from '@nestjs/azure-database';

@CosmosPartitionKey('TGId')
export class TargetGroupEntity {
  TGId: string;    // Unique identifier for the target group
  TGName: string;  // Target group name
  ProjId: string;  // Project ID this target group belongs to
  AudioName: string;
  Country: string;
  State: string;
  AgeGrp: string;
  CompetetionProduct: string[];
  MaricoProduct: string[];
  MainLang: string;
  SecondaryLang: string[];
  noOfSpek: number;
  filePath: string;
  status:number;
}
