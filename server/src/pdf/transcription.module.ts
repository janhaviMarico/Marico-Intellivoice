import { TranscriptionEntity } from './transcription.entity';
import { Module } from '@nestjs/common';
import { PdfService } from './pdf.service';
import { TranscriptionService } from './transcription.service';
import { TranscriptionController } from './transcription.controller';
import { AzureCosmosDbModule } from '@nestjs/azure-database';



@Module({
    imports:[AzureCosmosDbModule.forFeature([
        {
        collection:'Transcription',
        dto: TranscriptionEntity
        }

])],
    controllers: [TranscriptionController],
    providers:[PdfService,TranscriptionService]
})
export class TranscriptionModule {}

