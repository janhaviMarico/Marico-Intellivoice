import { InjectQueue, Process, Processor } from "@nestjs/bull";
import { Job, Queue } from 'bull';
import { AudioUtils } from "../audio.utils";
import { Logger } from "@nestjs/common";
import { AudioService } from "../audio.service";


@Processor('transcription')
export class TranscriptionProcessor{
    private readonly logger = new Logger(TranscriptionProcessor.name);

    constructor(private readonly audioUtils: AudioUtils,
        @InjectQueue('translation') private readonly translationQueue: Queue,
        private readonly audioService: AudioService

    ){}
    @Process({name:'transcribe-audio',concurrency:5})
    async handleTranscriptionJob(job: Job) {
        const { TGId, TGName, sasToken, mainLang, SecondaryLang, noOfSpek,fileName } = job.data;
        await job.log(`Processing transcription job for audio array ${TGName}`);     
        try {
            await job.log(`Transcription job for audio array ${TGName} started`);
          const transcriptionResults = await this.audioUtils.transcribeAudio(TGId, TGName, sasToken, mainLang, SecondaryLang, noOfSpek );
          await job.log(`Transcription job for audio array ${TGName} completed`);
            await this.translationQueue.add('translate-audio', {
              transcriptionData:transcriptionResults.transcriptionResult,
              TGName: TGName,
              TGId:TGId,
              fileName:fileName
            });

            // Update status to success in the database
            await this.audioService.updateStatus(TGId, {
              status: 1,
              //statusCode: 200,
            });
            }catch (error) {
            this.logger.error(`Transcription job failed: ${error.message}`);
            // Update status to failed in the database
            await this.audioService.updateStatus(TGId, {
             
              status: 2,
              //statusCode: 500,
            });
                  throw error;
            }
            await job.log(`Transcription job for all the audios are completed`);
    }
}