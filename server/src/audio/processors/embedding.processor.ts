import { Job, Queue } from 'bull';
import { InjectQueue, Process, Processor } from '@nestjs/bull';
import { Logger } from '@nestjs/common';
import { AudioUtils } from '../audio.utils';

@Processor('embedding')
export class EmbeddingProcessor {
  private readonly logger = new Logger(EmbeddingProcessor.name);

  constructor(private readonly audioUtils: AudioUtils,
   
  ) {}  // Service containing translation logic

  @Process({name:'embedding-audio',concurrency:5})  // Handle jobs in the 'translate-audio' queue
  async handleTranslationJob(job: Job) {
    const {transcriptionDocument,combinedTranslation,TGId,TGName,audioName} = job.data;
    await job.log(`Processing translation job for ${TGName}`);  
    try {
        const vectorIds= await this.audioUtils.generateEmbeddings(combinedTranslation);
        //transcriptionDocument.vectorId=vectorIds;
        await job.log('Translation job completed');
        //await this.audioUtils.saveTranscriptionDocument(transcriptionDocument);
        const updateData = { vectorId: vectorIds };
        await this.audioUtils.updateTranscriptionDocument(TGId,vectorIds,audioName);
      // You can then move to further processing like Summary or Sentiment Analysis here if needed.
      //return {translatedTextArray, combinedTranslation,TGName,TGId};
    } catch (error) {
      this.logger.error(`Translation job failed: ${error.message}`);
      throw error;
    }
  }
}
