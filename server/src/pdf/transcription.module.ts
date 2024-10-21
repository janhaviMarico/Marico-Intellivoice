import { Module } from '@nestjs/common';
import { PdfService } from './pdf.service';
import { TranscriptionService } from './transcription.service';
import { TranscriptionController } from './transcription.controller';
import { AzureCosmosDbModule } from '@nestjs/azure-database';
import { TranscriptionEntity } from './transcription.entity';
import { ProjectEntity } from 'src/audio/entity/project.entity';
import { TargetGroupEntity } from 'src/audio/entity/target.entity';


@Module({
    imports: [
        AzureCosmosDbModule.forFeature([
            {
                collection: 'Transcription',
                dto: TranscriptionEntity,
            },
            {
                collection: 'Projects', // Ensure this matches the name of your collection
                dto: ProjectEntity,
            },
            {
                collection: 'TargetGroups', // Ensure this matches the name of your collection
                dto: TargetGroupEntity,
            },
        ]),
    ],
    controllers: [TranscriptionController],
    providers: [PdfService, TranscriptionService],
})
export class TranscriptionModule {}
