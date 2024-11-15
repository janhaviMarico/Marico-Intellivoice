import { Job, Queue } from 'bull';
import { InjectQueue, Process, Processor } from '@nestjs/bull';
import { Logger } from '@nestjs/common';
import { AudioUtils } from '../audio.utils';

@Processor('translation')
export class TranslationProcessor {
  private readonly logger = new Logger(TranslationProcessor.name);

  constructor(private readonly audioUtils: AudioUtils,
    @InjectQueue('summary') private readonly summaryQueue: Queue
  ) {}  // Service containing translation logic

  @Process({name:'translate-audio',concurrency:5})  // Handle jobs in the 'translate-audio' queue
  async handleTranslationJob(job: Job) {
    const { transcriptionData, TGName,TGId } = job.data;
    await job.log(`Processing translation job for ${TGName}`);  
    try {
        const { updatedTextArray, combinedTranslation }= await this.audioUtils.translateText(transcriptionData);
      await job.log('Translation job completed');
      await this.summaryQueue.add('summarize-audio',{updatedTextArray, combinedTranslation,TGName,TGId});
      // You can then move to further processing like Summary or Sentiment Analysis here if needed.
      //return {translatedTextArray, combinedTranslation,TGName,TGId};
    } catch (error) {
      this.logger.error(`Translation job failed: ${error.message}`);
      throw error;
    }
  }
}
