// src/audio/entities/project.entity.ts
import { CosmosPartitionKey } from '@nestjs/azure-database';

  @CosmosPartitionKey('ProjId')

export class ProjectEntity {
  ProjId: string;   // Unique identifier for the project

  ProjName: string; // Name of the project
  UserId: string;   // User who created the project
  TGIds: string[];  // Array of TargetGroup IDs related to the project
}
