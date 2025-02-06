import { InjectQueue, Process, Processor } from "@nestjs/bull";
import { Job, Queue } from 'bull';
import { AudioUtils } from "../audio.utils";
import { Logger } from "@nestjs/common";
import { SENTIMENT_ANALYSIS, SUMMARY } from "src/constants";


@Processor('summary')
export class SummarySentimentsProcessor{
    private readonly logger = new Logger(SummarySentimentsProcessor.name);

    constructor(private readonly audioUtils: AudioUtils,
        @InjectQueue('embedding') private readonly embeddingQueue: Queue

    ){}
    @Process({name:'summarize-audio',concurrency:5})
    async handleTranscriptionJob(job: Job) {
        const { updatedTextArray, combinedTranslation,TGName,TGId,fileName } = job.data;
        await job.log(`Processing transcription job for audio array`);  
        try {
            await job.log(`Fetching Summary for ${TGName}`);
          const summaryResponse = await this.audioUtils.getSummaryAndSentiments(SUMMARY,combinedTranslation);
          await job.log('Summary fetched');
          const sentimentResponse=await this.audioUtils.getSummaryAndSentiments(SENTIMENT_ANALYSIS,combinedTranslation);
          await job.log('Sentiment Analysis fetched');
          const transcriptionDocument = {
            TGName,
            TGId,
            audioName:fileName,
            audiodata: updatedTextArray,
            summary: summaryResponse,
            sentiment_analysis: sentimentResponse,
            combinedTranslation: combinedTranslation,
            vectorId: null // Placeholder for vectorId
          };         
          // Save to Cosmos DB
          await this.audioUtils.saveTranscriptionDocument(transcriptionDocument);
          await job.log(`Saved transcription document for ${TGName} without vectorId`); 
          await this.embeddingQueue.add('embedding-audio',{transcriptionDocument,combinedTranslation,TGId,TGName,fileName})
          //return {transcriptionDocument};
        } catch (error) {
          this.logger.error(`Transcription job failed: ${error.message}`);
          throw error;
        }
      }
}