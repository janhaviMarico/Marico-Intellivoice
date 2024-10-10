// audio.processor.ts
import { Processor, Process } from '@nestjs/bull';
import { Job } from 'bull';
import { Logger } from '@nestjs/common';
import axios from 'axios';
import { ConfigService } from '@nestjs/config';
import { AzureOpenAI } from 'openai';
import { Translate } from '@google-cloud/translate/build/src/v2';
import { AzureKeyCredential, SearchClient } from '@azure/search-documents';
import { ChatCompletionMessageParam } from 'openai/resources';
import { Container } from '@azure/cosmos';
import { TranscriptionEntity } from '../entity/transcription.entity';
import { InjectModel } from '@nestjs/azure-database';
import { SENTIMENT_ANALYSIS, SENTIMENT_ANALYSIS_PROMPT, SUMMARIZATION_PROMPT_TEMPLATE, SUMMARY } from 'src/constants';


export interface Document {
  id: string;             // Document ID
  metadata: string;         // The text content of the document
  embeding_vector: number[];     // The embedding vector (array of numbers)
}

@Processor('audio')  // Name of the queue
export class AudioProcessor {
  private readonly logger = new Logger(AudioProcessor.name);
  private readonly translateClient : Translate;
  private readonly azureOpenAIClient: AzureOpenAI;
  private readonly azureSearchClient: SearchClient<any>;

  constructor(
    @InjectModel(TranscriptionEntity) private readonly transcriptionContainer: Container,
    private readonly configService: ConfigService
  ) {
    this.translateClient = new Translate({ key: this.configService.get<string>('TRANSALATION_APIKEY') }); 
    this.azureSearchClient = new SearchClient(
      this.configService.get<string>('VECTOR_STORE_ADDRESS'),
      this.configService.get<string>('AZURE_INDEX_NAME'),
      new AzureKeyCredential(this.configService.get<string>('VECTOR_STORE_PASSWORD'))
    );
    const azureOptions = {
      endpoint: this.configService.get<string>('AZURE_OPENAI_ENDPOINT'),
      apiKey: this.configService.get<string>('AZURE_OPENAI_API_KEY'),
      apiVersion: this.configService.get<string>('AZURE_OPEN_AI_VERSION'),
      deployment: this.configService.get<string>('AZURE_OPENAI_DEPLOYMENT'),
    };
    this.azureOpenAIClient = new AzureOpenAI(azureOptions);
  }
  private readonly AZURE_OPENAI_ENDPOINT = this.configService.get<string>('AZURE_OPENAI_ENDPOINT');
    private readonly  AZURE_OPENAI_API_KEY = this.configService.get<string>('AZURE_OPENAI_API_KEY');
    private readonly  AZURE_OPENAI_DEPLOYMENT = this.configService.get<string>('AZURE_OPENAI_DEPLOYMENT');
    private readonly  AZURE_OPEN_AI_VERSION = "2024-07-01-preview";
    private readonly  AZURE_OPENAI_EMBEDDING_MODEL=this.configService.get<string>('AZURE_OPENAI_EMBEDDING_DEPLOY');

  @Process('transcribe-audio')  // Handle jobs in the 'transcribe-audio' queue
  async handleTranscriptionJob(job: Job) {
    const { audioProcessDtoArray } = job.data;
    await job.log(`Processing transcription job for audio array`);  
    try {
      const transcriptionResults = await this.transcribeAudio(audioProcessDtoArray,job);
      await job.log('Transcription job completed');
      return transcriptionResults;
    } catch (error) {
      this.logger.error(`Transcription job failed: ${error.message}`);
      throw error;
    }
  }

  async transcribeAudio(audioProcessDtoArray, job: Job) {
    try {
      // Map through the array of audio data, transcribing each audio file
      const transcriptionPromises = audioProcessDtoArray.map(async (audioData) => {
        const { TGId,TGName, sasToken, mainLang, SecondaryLang, noOfSpek } = audioData;
        await job.log(`Transcription Audio Initialization ${TGName}`);
  
        // Call the transcribe function for each audio file
        const transcriptionResult = await this.transcribe(
          TGId,
          TGName,          // Project name (TGName)
          sasToken,        // SAS URL
          mainLang,        // Main language
          SecondaryLang,   // Other languages
          noOfSpek,         // Number of speakers
          job
        );
  
        // Return the transcription result along with the TG name
        return { TGName, transcriptionResult };
      });
  
      // Wait for all transcriptions to complete
      const transcriptionResults = await Promise.all(transcriptionPromises);
  
      // Return the results of all transcriptions
      return transcriptionResults;
    } catch (error) {
      console.error('Error in transcribing audio array:', error.message);
      throw new Error('Audio transcription failed.');
    }
  }

  async transcribe(
    tgId,
    project_name,      // The name of the project or Target Group (TG)
    sas_url,           // The SAS URL of the audio file
    main_language,     // The main language of the audio
    other_languages,   // Other languages (if applicable)
    number_of_speakers, // Number of speakers in the audio
    job: Job
  ) {
    await job.log(`Transcription of ${project_name} initiated`)
    try {
      const SUBSCRIPTION_KEY = this.configService.get<string>('SUBSCRIPTION_KEY'); // Replace with your Azure subscription key
      const SERVICE_REGION = this.configService.get<string>('SERVICE_REGION'); // Adjust region based on your Azure region
  
      const language_dict = {
        English: 'en-IN',
        Hindi: 'hi-IN',
        Tamil: 'ta-IN',
        Telugu: 'te-IN',
        Marathi: 'mr-IN',
        Kannada: 'kn-IN',
        Malayalam: 'ml-IN',
        Gujarati: 'gu-IN'
      };
  
      // Determine the main language locale for Azure
      const LOCALE = language_dict[main_language];
      const all_languages = [LOCALE, ...other_languages.map((lang) => language_dict[lang])];
  
      const apiUrl = `https://${SERVICE_REGION}.api.cognitive.microsoft.com/speechtotext/v3.1/transcriptions`;
      const headers = {
        'Ocp-Apim-Subscription-Key': SUBSCRIPTION_KEY,
        'Content-Type': 'application/json',
      };
  
      const transcriptionRequest = {
        contentUrls: [sas_url],
         properties: {
          diarizationEnabled: true,
          speakers: number_of_speakers,
          candidateLocales: all_languages,
          punctuationMode: 'DictatedAndAutomatic',
          profanityFilterMode: 'Removed',
        },
        locale: LOCALE,
        displayName: project_name,
        description: `Transcription for ${project_name}`,
      };
  
      // Start the transcription process
      await job.log(`Start of transcription process ${project_name} with ID: ${project_name}`);
      const response = await axios.post(apiUrl, transcriptionRequest, { headers });
      await job.log(`Waiting for response from transcriptionRequest of projectName ${project_name}`)
  
      const transcriptionUrl = response.headers['location']; // Get the URL to check transcription status
      const transcriptionId = transcriptionUrl.split('/').pop(); // Extract transcription ID
      await job.log(`Transcription started for ${project_name} with ID: ${transcriptionId}`);
  
      // Poll the status of the transcription until it is complete
      return await this.getTranscriptionResult(transcriptionUrl, headers, project_name,tgId,job);
  
    } catch (error) {
      console.error(`Error starting transcription for ${project_name}:`, error.message);
      throw new Error(`Transcription failed for ${project_name}.`);
    }
  }

  async getTranscriptionResult(transcriptionUrl, headers, project_name: string,tgId:string, job: Job) {
    let isCompleted = false;
    let transcriptionData;
    await job.log(`Getting Transcription for ${transcriptionUrl}`);  
    while (!isCompleted) {
      try {
        // Check transcription status
        const statusResponse = await axios.get(transcriptionUrl, { headers });
        transcriptionData = statusResponse.data;
  
        if (transcriptionData.status === 'Succeeded') {
          isCompleted = true;
          await job.log(`Transcription status for ${project_name} :  ${transcriptionData.status}. Retrying...`);  
          //console.log('Transcription succeeded.');
        } else if (transcriptionData.status === 'Failed') {
          await job.log(`Transcription status for ${project_name} :  ${transcriptionData.status}. Retrying...`);  
          throw new Error('Transcription failed.');
        }
        else {
          await job.log(`Transcription status for ${project_name} :  ${transcriptionData.status}. Retrying...`);  
          await this.sleep(300000); // Wait for 30 seconds before c
        }
      } catch (error) {
        //console.error('Error polling transcription status:', error.message);
        throw new Error('Error polling transcription status.');
      }
    }
  
    await job.log(`Transcription ended with status : ${transcriptionData.status}`);
    // Retrieve the transcription result
    const filesUrl = transcriptionData.links.files;
    const resultResponse = await axios.get(filesUrl, { headers });
    const transcriptionContentUrl = resultResponse.data.values.find(
      (file: any) => file.kind === 'Transcription'
    ).links.contentUrl;
  
    const transcriptionResult = await axios.get(transcriptionContentUrl);
    const recognizedPhrases = transcriptionResult.data.recognizedPhrases;
    await job.log(`Transalation started for ${project_name}`);
    let combinedTranslation = "";
    const audioDataArray = await Promise.all(recognizedPhrases.map(async item => {
      const displayText = item.nBest && item.nBest[0] ? item.nBest[0].display : '';
      const convTime = item.offset.replace('PT', '').toLowerCase().split('.')[0] + 's';
      try {
        const translatedText = await this.translateText(displayText);
        //combinedTranslation+= translatedText;
        return {
          speaker: item.speaker,
          timestamp: this.convertToTimeFormat(convTime),
          transcription: displayText,
          translation: translatedText
        };
      } catch (translateError) {
        console.error('Translation Error:', translateError.message);
        throw new Error('Translation failed.');
      }
    }));
  
    for(let i=0;i<audioDataArray.length;i++) {
      combinedTranslation+= audioDataArray[i].translation;
    }
    const summaryResponse =await this.getSummaryAndSentiments(SUMMARY,combinedTranslation);
    const sentimentResponse=await this.getSummaryAndSentiments(SENTIMENT_ANALYSIS,combinedTranslation);
    const vectorId= await this.generateEmbeddings(combinedTranslation)  
    const transcriptionDocument = {
      TGName: project_name,
      TGId: tgId,
      audiodata: audioDataArray,
      summary:summaryResponse,
      sentiment_analysis:sentimentResponse,
      combinedTranslation:combinedTranslation,
      vectorId:vectorId
    }
    const response = await this.saveTranscriptionDocument(transcriptionDocument);
    return response;
  }


  async saveTranscriptionDocument(transcriptionDocument) {
    try {
      // Attempt to insert the document
      const response = await this.transcriptionContainer.items.create(transcriptionDocument);
      // Check if the document was successfully inserted
      if (response.resource) {
        console.log('Document successfully created in Cosmos DB');
      } else {
        console.error('Document was not inserted successfully');
      }
      return transcriptionDocument;
    } catch (error) {
      // Log any errors that occurred during the insertion
      console.error('Error inserting document into Cosmos DB:', error.message);
      throw new Error('Failed to insert transcription document.');
    }
  }

  async translateText(transcribedText: string) {
    try {
      // Extract only the translated text from the response
      const [translatedText] = await this.translateClient.translate(transcribedText, 'en');
      // Return only the translated text
      return translatedText;
    } catch (error) {
      console.error('Translation error:', error);
      throw new Error('Failed to translate text');
    }
  }

    sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

   convertToTimeFormat(timeStr) {
    let hours = 0, minutes = 0, seconds = 0;
  
    // Removing 'PT' and splitting based on 'h', 'm', 's'
    if (timeStr.includes('h')) {
      hours = parseInt(timeStr.split('h')[0].replace('PT', ''));
      timeStr = timeStr.split('h')[1];
    }
    if (timeStr.includes('m')) {
      minutes = parseInt(timeStr.split('m')[0]);
      timeStr = timeStr.split('m')[1];
    }
    if (timeStr.includes('s')) {
      seconds = parseInt(timeStr.split('s')[0]);
    }
  
    // Formatting hours, minutes, seconds to 2 digits
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  }

   generateSummarizationPrompt(text:string) {
    const summaryLength = 500;
    return SUMMARIZATION_PROMPT_TEMPLATE(summaryLength,text);
  }

   generateSentimenAnalysisPrompt(text:string) {
    return SENTIMENT_ANALYSIS_PROMPT(text); 
  }
   async getSummaryAndSentiments(purpose:string,text:string) {
    const deployment = this.AZURE_OPENAI_DEPLOYMENT;
    const apiVersion = this.AZURE_OPEN_AI_VERSION;
    const apiKey = this.AZURE_OPENAI_API_KEY;
    const endpoint = this.AZURE_OPENAI_ENDPOINT; // Your Azure OpenAI endpoint here
    // const options = { azureADTokenProvider, deployment, apiVersion, endpoint };
    const options = {
      endpoint,
      apiKey,
      apiVersion,
      deployment: deployment,
    };
    const client2 = new AzureOpenAI(options);
    let prompt;
    if(purpose ==="Summary"){
      prompt = this.generateSummarizationPrompt(text);
    }
    else{
      prompt = this.generateSentimenAnalysisPrompt(text);
    }
  
    const messages: ChatCompletionMessageParam[] = [
      { role: 'user', content: prompt }
    ];
    try {
      const stream = await client2.chat.completions.create({ messages, model: deployment, max_tokens: 500 });
      const finalSummary = stream.choices[0].message.content;
      return finalSummary;
    } catch (error) {
      console.error('Error during API call:', error);
      throw new Error('Failed to get summary from Azure OpenAI');
    }
  }

  async generateEmbeddings(translation:string){
    try {
      const options ={ 
        endpoint:this.AZURE_OPENAI_ENDPOINT,
        apiKey: this.AZURE_OPENAI_API_KEY,
        apiVersion:this.AZURE_OPEN_AI_VERSION,
        embeddingModel:this.AZURE_OPENAI_EMBEDDING_MODEL
        };
        const azureOpenAi = new AzureOpenAI(options);
        // this.azureSearchClient = new SearchClient(
        //   this.configService.get<string>('VECTOR_STORE_ADDRESS'),
        //   this.configService.get<string>('AZURE_INDEX_NAME'),
        //     new AzureKeyCredential(this.configService.get<string>('VECTOR_STORE_PASSWORD'))
        //   );
      const model=this.AZURE_OPENAI_EMBEDDING_MODEL;
      const embeddings=await azureOpenAi.embeddings.create(
        { 
          input:translation,
         model,
        });
  
        const embeddingArray = embeddings.data[0].embedding; 
          const documents:Document ={
          id: `doc-${Date.now()}`,
          metadata: translation,
          embeding_vector: embeddingArray,  // The 1536-dimensional embedding array
          };
          const uploadResult = await this.azureSearchClient.uploadDocuments([documents]);
          const vectorId = uploadResult.results[0]?.key;
          return vectorId;
    }
    catch(error){
      throw new Error(`Embedding generation failed ${error}`);
    }
  
  }
}