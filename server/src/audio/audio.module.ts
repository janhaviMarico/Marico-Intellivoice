import { Module } from '@nestjs/common';
import { AudioController } from './audio.controller';
import { AudioService } from './audio.service';
import { TargetGroupEntity } from './entity/target.entity';
import { AzureCosmosDbModule } from '@nestjs/azure-database';
import { ProjectEntity } from './entity/project.entity';
import { ConfigModule } from '@nestjs/config';
import { TranscriptionEntity } from './entity/transcription.entity';
import { BullModule } from '@nestjs/bull';
import { AudioProcessor } from './processors/audio.processor';

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
  name: 'audio',  // Name of the queue for audio jobs
}),
],
  controllers: [AudioController],
  providers: [AudioService,AudioProcessor]
})
export class AudioModule {}
