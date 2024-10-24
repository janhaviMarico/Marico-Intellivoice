import { IsNotEmpty, IsArray, IsObject } from 'class-validator';

export class EditTranscriptionDto {
    @IsNotEmpty()
    TGId: string;

    @IsArray()
    audiodata: Array<{
        speaker: number;
        timestamp: string;
        transcription: string;
        translation: string;
    }>;
}
