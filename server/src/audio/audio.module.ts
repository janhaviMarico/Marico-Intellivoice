import { Module } from '@nestjs/common';
import { AudioController } from './audio.controller';
import { AudioService } from './audio.service';
import { TargetGroupEntity } from './entity/target.entity';
import { AzureCosmosDbModule } from '@nestjs/azure-database';
import { ProjectEntity } from './entity/project.entity';
import { ConfigModule } from '@nestjs/config';
import { TranscriptionEntity } from './entity/transcription.entity';

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

]),ConfigModule.forRoot()],
  controllers: [AudioController],
  providers: [AudioService]
})
export class AudioModule {}
