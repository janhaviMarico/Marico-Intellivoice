import { Module } from '@nestjs/common';
import { AudioController } from './audio.controller';
import { AudioService } from './audio.service';
import { TargetGroupEntity } from './entity/target.entity';
import { AzureCosmosDbModule } from '@nestjs/azure-database';
import { ProjectEntity } from './entity/project.entity';
import { ConfigModule } from '@nestjs/config';
import { TranscriptionEntity } from './entity/transcription.entity';
import { BullModule } from '@nestjs/bull';
import { TranscriptionProcessor } from './processors/transcription.processor';
import { TranslationProcessor } from './processors/translation.processor';
import { AudioUtils } from './audio.utils';
import { SummarySentimentsProcessor } from './processors/summarySentiments.processor';
import { EmbeddingProcessor } from './processors/embedding.processor';
import { ChatService } from 'src/chat/chat.service';

@Module({
    imports:[AzureCosmosDbModule.forFeature([
        {
        collection:'TargetGroups',
        dto: TargetGroupEntity
        },
        {
            collection:'Projects',
            dto: ProjectEntity
        },
        {
          collection:'Transcription',
          dto:TranscriptionEntity
        }

]),ConfigModule.forRoot(),
BullModule.forRoot({
  redis: {
    host: 'localhost',  // Redis host
    port: 6379,         // Redis port
  },
}),
BullModule.registerQueue({
  name: 'transcription',  // Name of the queue for transcription jobs
}),
BullModule.registerQueue({
  name: 'translation',  // Name of the queue for translation jobs
}),
BullModule.registerQueue({
  name: 'audio',  // Name of the queue for transcription jobs
}),
BullModule.registerQueue({
  name: 'summary',  // Name of the queue for transcription jobs
}),
BullModule.registerQueue({
  name: 'embedding',  // Name of the queue for transcription jobs
}),
],
  controllers: [AudioController],
  providers: [AudioService,TranscriptionProcessor,AudioUtils,TranslationProcessor,SummarySentimentsProcessor,EmbeddingProcessor,ChatService,TranscriptionEntity,ProjectEntity],
  exports:[TranscriptionEntity,ProjectEntity]

})
export class AudioModule {}
