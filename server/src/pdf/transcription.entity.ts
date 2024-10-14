// src/audio/entities/target-group.entity.ts
import { CosmosPartitionKey } from '@nestjs/azure-database';

@CosmosPartitionKey('TGID')
export class TranscriptionEntity {
  static getCosmosContainer(): import("@azure/cosmos").Container {
    throw new Error('Method not implemented.');
  }
  TGID: string;    // Unique identifier for the target group
  TGName:string;
  audiodata: AudioData[];
  summary: string = '';   // Default empty string
  sentiment_analysis: string = '';   // Default empty string
  combinedTranslation:string='';
}

class AudioData {
    speaker: string;
    timestamp: string;
    transcription: string;
    translation: string;
  }