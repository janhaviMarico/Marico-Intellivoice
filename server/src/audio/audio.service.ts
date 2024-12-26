import { Injectable, Logger, InternalServerErrorException, HttpStatus, NotFoundException, BadRequestException, HttpException } from '@nestjs/common';
import { InjectModel } from '@nestjs/azure-database';
import { Container } from '@azure/cosmos';
import { BlobSASPermissions, BlobServiceClient, generateBlobSASQueryParameters, StorageSharedKeyCredential } from '@azure/storage-blob';
import { ConfigService } from '@nestjs/config';
import { ProjectGroupDTO } from './dto/upload-audio.dto';
import { ProjectEntity } from './entity/project.entity';
import { TargetGroupEntity } from './entity/target.entity';
import { TranscriptionEntity } from './entity/transcription.entity';
import { nanoid } from 'nanoid';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import { EditTranscriptionDto } from './dto/edit-transcription.dto';
import { Console } from 'console';
import { AudioUtils } from './audio.utils';
import axios from 'axios';



@Injectable()
export class AudioService {
  private readonly logger = new Logger(AudioService.name);
  private blobServiceClient: BlobServiceClient;
  private containerClient: any;
  private readonly endpoint = 'https://inhouse-ai-search-service.search.windows.net';
  private readonly indexName = 'intelli-voice-js';
  private readonly apiKey = 'gwCjVtUk7IpgpvjMhgM3Dgdt1noxYUIKGKUuNB4me2AzSeCc1Ccf'; // Admin API Key
  configService: any;
  constructor(
    @InjectModel(ProjectEntity) private readonly projectContainer: Container,
    @InjectModel(TargetGroupEntity) private readonly targetContainer: Container,
    @InjectModel(TranscriptionEntity) private readonly transcriptContainer: Container,
    @InjectQueue('transcription') private readonly transcriptionQueue: Queue,
    private readonly audioUtils: AudioUtils,
    private readonly config: ConfigService ) 
    {
    this.blobServiceClient = BlobServiceClient.fromConnectionString(this.config.get<string>('AZURE_STORAGE_CONNECTION_STRING'));
    this.containerClient = this.blobServiceClient.getContainerClient(this.config.get<string>('AUDIO_UPLOAD_BLOB_CONTAINER'));
    this.transcriptionQueue.isReady().then(() => {
      this.logger.log('Connected to Redis and audio queue is ready');
    }).catch(err => {
      this.logger.error('Failed to connect to Redis:', err);
    });
    }

  // Handle audio processing logic
  async processAudioFiles(projectGrp: ProjectGroupDTO, targetGrp: string, files: Express.Multer.File[]) {
    try {

      //before creating project check data in master for drop downs

      

      // Step 1: Create Project and Target Groups
      const projectResponse = await this.createProjectAndTargetGroups(projectGrp, targetGrp);
      if (!projectResponse) {
        throw new InternalServerErrorException('Failed to create project and target groups');
      }

      const response = {
        statusCode: HttpStatus.CREATED,
        message: 'Project created successfully, audio files processing in background',
      };
  
      // Run the remaining steps asynchronously (in the background)
      this.uploadAndProcessFilesInBackground(files, projectGrp, targetGrp);
  
      return response;
    } catch (error) {
      this.logger.error(`Failed to process audio files: ${error.message}`);
      throw new InternalServerErrorException('Error processing audio files');
    }
  }
  
  private async uploadAndProcessFilesInBackground(
    files: Express.Multer.File[],
    projectGrp: ProjectGroupDTO,
    targetGrp: string
  ) {
    try {
      // Step 2: Upload audio files and generate SAS URLs
      const sasUrls = await this.uploadAudioFiles(files);
      // Step 3: Update the SAS URLs in Target Group entities
      const audioProcessDtoArray = await this.updateTargetGroupsWithSasUrls(projectGrp, targetGrp, sasUrls);
      // Optionally, start background transcription
      await this.runBackgroundTranscription(audioProcessDtoArray);
  
    } catch (error) {
      this.logger.error(`Error processing files in background: ${error.message}`);
      // Handle or log background processing errors if needed
    }
  }
  async createProjectAndTargetGroups(project: ProjectGroupDTO, targetGrp: string) {
    try {
      // Check if the project already exists in the project container
      const existingProject = await this.projectContainer.items
        .query({
          query: 'SELECT * FROM c WHERE c.ProjName = @ProjName',
          parameters: [{ name: '@ProjName', value: project.ProjName }],
        })
        .fetchAll();
  
      
      if (existingProject.resources.length === 0) {
        // Project doesn't exist; create a new one
        const projectName: ProjectEntity = {
          ProjId: project.ProjId,
          ProjName: project.ProjName,
          UserId: project.userid,
          TGIds: project.TGIds,
        };
  
        await this.projectContainer.items.create(projectName);
       
        this.logger.log(`Project ${projectName.ProjName} created with ID ${projectName.ProjId}`);
      } else {
        // Project already exists
        this.logger.log(`Project with ID ${existingProject.resources[0].ProjId} already exists. Skipping project creation.`);
      }
  
      // Process target groups
      const targetGrpArray = Object.values(targetGrp);

      
      for (const group of targetGrpArray) {
        const groupObj = typeof group === 'string' ? JSON.parse(group) : group;
      
      if (existingProject.resources.length > 0) {
       // projectIdToUse = existingProject.resources[0].ProjId;
        const targetGroupEntity: TargetGroupEntity = {
          TGId: nanoid(),
          TGName: groupObj.TGName,
          ProjId: existingProject.resources[0].ProjId,
          AudioName: groupObj.AudioName,
          Country: groupObj.Country,
          State: groupObj.State,
          AgeGrp: groupObj.AgeGrp,
          CompetetionProduct: groupObj.CompetetionProduct,
          MaricoProduct: groupObj.MaricoProduct,
          MainLang: groupObj.MainLang,
          SecondaryLang: groupObj.SecondaryLang,
          noOfSpek: groupObj.noOfSpek,
          filePath: '', // This will be updated after audio upload
          status: 0,
        };
        await this.targetContainer.items.create(targetGroupEntity);
        // Add the new TGId to the existing project's TGIds array
        existingProject.resources[0].TGIds.push(targetGroupEntity.TGId);

        // Use upsert to update the project with the new TGIds array
        await this.projectContainer.items.upsert(existingProject.resources[0]);
      }else{
        
        const targetGroupEntity: TargetGroupEntity = {
          TGId: nanoid(),
          TGName: groupObj.TGName,
          ProjId: groupObj.ProjId,
          AudioName: groupObj.AudioName,
          Country: groupObj.Country,
          State: groupObj.State,
          AgeGrp: groupObj.AgeGrp,
          CompetetionProduct: groupObj.CompetetionProduct,
          MaricoProduct: groupObj.MaricoProduct,
          MainLang: groupObj.MainLang,
          SecondaryLang: groupObj.SecondaryLang,
          noOfSpek: groupObj.noOfSpek,
          filePath: '', // This will be updated after audio upload
          status: 0,
        };
        await this.targetContainer.items.create(targetGroupEntity);
      }

       
      }
  
      this.logger.log('Target groups linked to project and created successfully.');
      return true;
    } catch (error) {
      this.logger.error(`Failed to create project and target groups: ${error.message}`);
      throw new InternalServerErrorException('Error creating project and target groups');
    }
  }
  
  
  async uploadAudioFiles(files: Express.Multer.File[]): Promise<{ fileName: string, sasUri: string, sasToken: string }[]> {
    try {
      const sasUrls: { fileName: string, sasUri: string, sasToken: string }[] = [];
      const uploadPromises = files.map(async (file) => {
        const blockBlobClient = this.containerClient.getBlockBlobClient(file.originalname);
        const uploadBlobResponse = await blockBlobClient.uploadData(file.buffer);
        this.logger.log(`Blob ${file.originalname} uploaded successfully: ${uploadBlobResponse.requestId}`);
        const sasUri = blockBlobClient.url;
        const fileName = file.originalname;
        // Generate SAS token
        const sasToken = await this.generateBlobSasUrl(file.originalname);
        sasUrls.push({ fileName, sasUri, sasToken });
      });
  
      await Promise.all(uploadPromises);
      return sasUrls;
    } catch (error) {
      this.logger.error(`Failed to upload audio files: ${error.message}`);
      throw new InternalServerErrorException('Error uploading audio files');
    }
  }
  
  async updateTargetGroupsWithSasUrls(projectGrp: ProjectGroupDTO, targetGrp: string,
    sasUrls: { fileName: string, sasUri: string, sasToken: string }[]) {
    const audioProcessDtoArray: any[] = [];
    try {
      const targetGrpArray = Object.values(targetGrp);
      for (const group of targetGrpArray) {
        const groupObj = typeof group === 'string' ? JSON.parse(group) : group;
        const matchingSasUrl = sasUrls.find((sasUrl) => sasUrl.fileName.split('.')[0] === groupObj.TGName);
        const querySpec = {
          query: 'SELECT * FROM c WHERE c.TGName = @TGName',
        parameters: [{ name: '@TGName', value: groupObj.TGName }]};  
        const {resources: existingDocuments } = await this.targetContainer.items.query(querySpec).fetchAll();
        const latestDocument = existingDocuments[0];
        latestDocument.filePath=matchingSasUrl.sasUri;
        audioProcessDtoArray.push({
          TGId: latestDocument.TGId,
          TGName: groupObj.TGName,
          mainLang: groupObj.MainLang,
          SecondaryLang: groupObj.SecondaryLang,
          noOfSpek: groupObj.noOfSpek,
          sasToken: matchingSasUrl.sasToken, // This wil'l be updated later
        });
        await this.targetContainer.items.upsert(latestDocument);
      }
      this.logger.log('Target groups updated with SAS URLs.');
      return audioProcessDtoArray;
    } catch (error) {
      this.logger.error(`Failed to update target groups: ${error.message}`);
      throw new InternalServerErrorException('Error updating target groups');
    }
  }
  

    runBackgroundTranscription(audioProcessDtoArray: {
    TGId:string,
    TGName: string,
    mainLang: string,
    SecondaryLang: string[],
    noOfSpek: number,
    sasToken: string,
  }[]) {
    this.logger.log('Enqueuing audio transcription job...');   
    try {
      // Add the job to Bull queue
      for (const audioData of audioProcessDtoArray) {
        // Enqueue each audio file as a separate job
        this.transcriptionQueue.add('transcribe-audio', audioData);
        this.logger.log(`Transcription job for ${audioData.TGName} enqueued successfully`);
    }
    } catch (error) {
      this.logger.error(`Failed to enqueue transcription job: ${error.message}`);
      throw new InternalServerErrorException('Failed to enqueue transcription job');
    }
  }

  generateBlobSasUrl(fileName: string): Promise<string> {

    // const account = this.config.get<string>('BLOB_CONTAINER_ACCOUNT');
    // const key = this.config.get<string>('BLOB_CONTAINER_ACCOUNT_KEY');

    const sharedKeyCredential = new StorageSharedKeyCredential(
      this.config.get<string>('BLOB_CONTAINER_ACCOUNT'),
      this.config.get<string>('BLOB_CONTAINER_ACCOUNT_KEY'),
    );

    //this.logger.error(`Fetching SasUrl for: ${fileName}`);
    // Permissions for the SAS URL (read, write, etc.)
    const permissions = new BlobSASPermissions();
    permissions.read = true; // You can adjust permissions here

    // Set expiry time for SAS URL
    const expiryDate = new Date();
    expiryDate.setHours(expiryDate.getHours() + 10); // Expires in 10 hour

    // Generate SAS Token
    const sasToken = generateBlobSASQueryParameters(
      {
        containerName: this.containerClient.containerName,
        blobName: fileName,
        permissions: permissions,
        expiresOn: expiryDate,
      },
      sharedKeyCredential,
    ).toString();

    // Build the full URL with the SAS token
    const blobUrl = `${this.containerClient.url}/${fileName}?${sasToken}`;  
    this.logger.log(`Generated SAS URL for blob: ${blobUrl}`);
    return Promise.resolve(blobUrl);
  }

  // async getAudioData(userid?: string) {
  //   try {
  //     // 1. Build Project Query
  //     let querySpecProject;
  //     if (userid) {
  //       // If `userid` is passed, filter by `userid`
  //       querySpecProject = {
  //         query: 'SELECT * FROM c WHERE c.UserId = @UserId',
  //         parameters: [{ name: '@UserId', value: userid }],
  //       };
  //     } else {
  //       // If no `userid`, fetch all projects
  //       querySpecProject = {
  //         query: 'SELECT * FROM c',
  //       };
  //     }

  //     // Fetch projects based on query
  //     const { resources: projects } = await this.projectContainer.items.query(querySpecProject).fetchAll();

  //     // If no projects found
  //     if (projects.length === 0) {
  //       return [];
  //     }

  //     // 2. Fetch and Combine Data from Target Container
  //     const combinedResults = [];

  //     // Iterate over all fetched projects
  //     for (const project of projects) {
  //       const projId = project.ProjId;

  //       // Fetch related target data using ProjId
  //       const querySpecTarget = {
  //         query: 'SELECT * FROM c WHERE c.ProjId = @ProjId',
  //         parameters: [{ name: '@ProjId', value: projId }],
  //       };
  //       const { resources: targets } = await this.targetContainer.items.query(querySpecTarget).fetchAll();

  //       // Combine the data from project and target containers
  //       for (const target of targets) {

  //         const transcriptionExists = await this.checkTranscriptionData(target.TGId);

  //         const status = transcriptionExists
  //       ? 'Completed'
  //       : 'Processing';

  //         combinedResults.push({
  //           ProjectName: project.ProjName,
  //           Country: target.Country,
  //           State: target.State,
  //           TargetGroup: target.TGName,
  //           TargetId :target.TGId,
  //           AgeGroup: target.AgeGrp,
  //           CompetitorGroup: target.CompetetionProduct,
  //           MaricoProduct: target.MaricoProduct,
  //           Status: status 
  //         });
  //       }
  //     }

  //     return combinedResults;
  //   } catch (error) {
  //     console.error('Error fetching audio data:', error.message);
  //     throw new InternalServerErrorException('Failed to fetch audio data');
  //   }
  // }

  // async getAudioDataByProject(projectName: string) {
  //   try {
  //     const querySpecProject = {
  //       query: 'SELECT * FROM c WHERE c.ProjName = @ProjName',
  //       parameters: [{ name: '@ProjName', value: projectName }],
  //     };
  
  //     const { resources: projects } = await this.projectContainer.items.query(querySpecProject).fetchAll();
  
  //     if (projects.length === 0) {
  //       return [];
  //     }
  
  //     return await this.combineProjectAndTargetData(projects);
  //   } catch (error) {
  //     console.error('Error fetching audio data by project:', error.message);
  //     throw new InternalServerErrorException('Failed to fetch audio data by project');
  //   }
  // }

  // async getAudioDataByUserAndProject(user: string, projectName: string) {
  //   try {
  //     const querySpecProject = {
  //       query: 'SELECT * FROM c WHERE c.UserId = @UserId AND c.ProjName = @ProjName',
  //       parameters: [
  //         { name: '@UserId', value: user },
  //         { name: '@ProjName', value: projectName },
  //       ],
  //     };
  
  //     const { resources: projects } = await this.projectContainer.items.query(querySpecProject).fetchAll();
  
  //     if (projects.length === 0) {
  //       return [];
  //     }
  
  //     return await this.combineProjectAndTargetData(projects);
  //   } catch (error) {
  //     console.error('Error fetching audio data by user and project:', error.message);
  //     throw new InternalServerErrorException('Failed to fetch audio data by user and project');
  //   }
  // }
 
  // private async combineProjectAndTargetData(projects: any[]) {
  //   const combinedResults = [];
  
  //   for (const project of projects) {
  //     const projId = project.ProjId;
  
  //     const querySpecTarget = {
  //       query: 'SELECT * FROM c WHERE c.ProjId = @ProjId',
  //       parameters: [{ name: '@ProjId', value: projId }],
  //     };
  //     const { resources: targets } = await this.targetContainer.items.query(querySpecTarget).fetchAll();
  
  //     for (const target of targets) {
  //       // Check for transcription data
  //     const transcriptionExists = await this.checkTranscriptionData(target.TGId);

  //     // Determine the status
  //     const status = transcriptionExists
  //       ? 'Completed'
  //       : 'Processing';

  //       combinedResults.push({
  //         ProjectName: project.ProjName,
  //         Country: target.Country,
  //         State: target.State,
  //         TargetGroup: target.TGName,
  //         TargetId: target.TGId,
  //         AgeGroup: target.AgeGrp,
  //         CompetitorGroup: target.CompetetionProduct,
  //         MaricoProduct: target.MaricoProduct,
  //         Status: status,
  //       });
  //     }
  //   }
  
  //   return combinedResults;
  // }
  

  ////new optimazation code  

  async getAudioData(userId?: string): Promise<any[]> {
    try {
      // Build query for projects
      const querySpecProject = userId
        ? { query: 'SELECT * FROM c WHERE c.UserId = @UserId', parameters: [{ name: '@UserId', value: userId }] }
        : { query: 'SELECT * FROM c' };
  
      const { resources: projects } = await this.projectContainer.items.query(querySpecProject).fetchAll();
  
      if (!projects.length) return [];
  
      // Fetch related target data in bulk
      const projIds = projects.map((proj) => proj.ProjId);
      return this.combineProjectAndTargetData(projIds, projects);
    } catch (error) {
      console.error('Error fetching audio data:', error.message);
      throw new InternalServerErrorException('Failed to fetch audio data');
    }
  }

  async getAudioDataByProject(projectName: string): Promise<any[]> {
    try {
      const querySpecProject = {
        query: 'SELECT * FROM c WHERE c.ProjName = @ProjName',
        parameters: [{ name: '@ProjName', value: projectName }],
      };
  
      const { resources: projects } = await this.projectContainer.items.query(querySpecProject).fetchAll();
  
      if (!projects.length) return [];
  
      const projIds = projects.map((proj) => proj.ProjId);
      return this.combineProjectAndTargetData(projIds, projects);
    } catch (error) {
      console.error('Error fetching audio data by project:', error.message);
      throw new InternalServerErrorException('Failed to fetch audio data by project');
    }
  }

  async getAudioDataByUserAndProject(user: string, projectName: string): Promise<any[]> {
    try {
      const querySpecProject = {
        query: 'SELECT * FROM c WHERE c.UserId = @UserId AND c.ProjName = @ProjName',
        parameters: [
          { name: '@UserId', value: user },
          { name: '@ProjName', value: projectName },
        ],
      };
  
      const { resources: projects } = await this.projectContainer.items.query(querySpecProject).fetchAll();
  
      if (!projects.length) return [];
  
      const projIds = projects.map((proj) => proj.ProjId);
      return this.combineProjectAndTargetData(projIds, projects);
    } catch (error) {
      console.error('Error fetching audio data by user and project:', error.message);
      throw new InternalServerErrorException('Failed to fetch audio data by user and project');
    }
  }

  private async combineProjectAndTargetData(projIds: string[], projects: any[]): Promise<any[]> {
    try {
      // Fetch all targets for given project IDs
      const querySpecTarget = {
        query: `SELECT * FROM c WHERE ARRAY_CONTAINS(@ProjIds, c.ProjId)`,
        parameters: [{ name: '@ProjIds', value: projIds }],
      };
  
      const { resources: targets } = await this.targetContainer.items.query(querySpecTarget).fetchAll();
  
      // Map targets by ProjId for quick lookup
      const targetMap = targets.reduce((map, target) => {
        if (!map[target.ProjId]) map[target.ProjId] = [];
        map[target.ProjId].push(target);
        return map;
      }, {});
  
      // Combine project and target data
      const combinedResults = [];
  
      await Promise.all(
        projects.map(async (project) => {
          const projId = project.ProjId;
          const relatedTargets = targetMap[projId] || [];
  
          for (const target of relatedTargets) {           
  
            combinedResults.push({
              ProjectName: project.ProjName,
              Country: target.Country,
              State: target.State,
              TargetGroup: target.TGName,
              TargetId: target.TGId,
              AgeGroup: target.AgeGrp,
              CompetitorGroup: target.CompetetionProduct,
              MaricoProduct: target.MaricoProduct,
              Status: target.status,
            });
          }
        })
      );
  
      return combinedResults;
    } catch (error) {
      console.error('Error combining project and target data:', error.message);
      throw new InternalServerErrorException('Failed to combine project and target data');
    }
  }
  
  
  
  private async checkTranscriptionData(targetId: string): Promise<boolean> {
    try {
      const querySpecTranscription = {
        query: 'SELECT * FROM c WHERE c.TGId = @TGId',
        parameters: [{ name: '@TGId', value: targetId }],
      };

      this.logger.log("transcription data",querySpecTranscription)
  
      const { resources: transcriptions } = await this.transcriptContainer.items.query(querySpecTranscription).fetchAll();
  
      // Return true if at least one transcription exists for the target
      return transcriptions.length > 0;
    } catch (error) {
      console.error('Error checking transcription data:', error.message);
      return false; // Treat as no transcription if an error occurs
    }
  }
  
  

  async viewData(TGName:string,TGId:string){
  }

  async getAudioDetails(tgId: string, tgName: string) {
    try {
      // 1. Fetch Target Data by TGId and TGName
      //IN_MH_18_25_SOIL_NYK_E_MAR
      //IN_MH_18_25_SOIL_NYK_E_MAR
      const querySpecTarget = {
        query: 'SELECT * FROM c WHERE c.TGName = @TGName',
        parameters: [
          { name: '@TGName', value: tgName },
          //{name:'@id',value:"113536ec-41e6-445b-8324-bf99bd93d5cd"}
        ],
      };
      const { resources: targetData } = await this.targetContainer.items
        .query(querySpecTarget)
        .fetchAll();
        this.logger.log(`Fetching details for  ${tgId} and ${tgName} `);  


      if (targetData.length === 0) {
        return { message: 'Target data not found' };
      }
      const targetItem = targetData[0]; // Assuming TGId and TGName are unique

      // 2. Fetch Transcription Data by TGId and TGName
      const querySpecTranscription = {
        query: 'SELECT * FROM c WHERE c.TGId = @TGId AND c.TGName = @TGName',
        parameters: [
          { name: '@TGId', value: tgId },
          { name: '@TGName', value: tgName },
        ],
      };
      const { resources: transcriptionData } = await this.transcriptContainer.items
        .query(querySpecTranscription)
        .fetchAll();
        this.logger.log(`Fetching transcription data for  ${tgId} and ${tgName} `);  

      if (transcriptionData.length === 0) {
        return { message: 'Transcription data not found' };
      }   
    const transcriptionItem = transcriptionData[0]; // Assuming TGId and TGName are unique
     this.logger.log(`Combining transcription data for  ${tgId} and ${tgName} `);  
     const filenameurl=await this.generateBlobSasUrl(targetItem.filePath.substring(targetItem.filePath.lastIndexOf('/') + 1))
      // 3. Combine Target and Transcription Data
      const combinedData = {
        TGId: targetItem.TGId,
        TGName: targetItem.TGName,
        FilePath: filenameurl, // Audio Blob Link from Target Container
        AudioData: transcriptionItem.audiodata, // Transcription and Translation
        Summary: transcriptionItem.summary, // Summary from Transcription Container
        SentimentAnalysis: transcriptionItem.sentiment_analysis, // Sentiment Analysis from Transcription Container
        vectorId:transcriptionItem.vectorId
      };
      return combinedData;
    } catch (error) {
      console.error('Error fetching audio details:', error.message);
      throw new InternalServerErrorException('Failed to fetch audio details');
    }
  }

async editTranscription(data: EditTranscriptionDto, vectorIds: string[]) {
  this.logger.log(`Attempting to edit transcription for TGId: ${data.TGId}`);

  if (!data.TGId) {
      this.logger.error('TGId is undefined or empty');
      throw new BadRequestException('TGId is required');
  }

  try {
      // Parameterized query to fetch items by TGId
      const { resources: items } = await this.transcriptContainer.items
          .query({
              query: 'SELECT * FROM c WHERE c.TGId = @TGId',
              parameters: [{ name: '@TGId', value: data.TGId }],
          })
          .fetchAll();

      if (items.length === 0) {
          this.logger.warn(`No item found with TGId: ${data.TGId}`);
          throw new NotFoundException(`Item with TGId ${data.TGId} not found`);
      }

      const existingItem = items[0];
      const updatedItem = {
          ...existingItem,
          audiodata: data.audiodata,
      };

      // Upsert updated item back to Cosmos DB
      await this.transcriptContainer.items.upsert(updatedItem);
      this.logger.log(`Transcription updated successfully for TGId: ${data.TGId}`);

      this.logger.log(`Vector IDs: ${JSON.stringify(vectorIds)}`);

    // Extract the translation field from all items in audiodata and join them into one string
    const metadata = data.audiodata.map(item => item.translation).join(' '); // Joins all translations with a space

      // Update metadata in Azure Search
      await this.updateMetadataInAzureSearch(vectorIds, metadata);

      return {
          statusCode: 200,
          message: 'Translation and metadata updated successfully.',
          updatedItem,
      };
  } catch (error) {
      this.logger.error(`Failed to edit transcription: ${error.message}`);
      throw error;
  }
}
async updateMetadataInAzureSearch(vectorIds: string[], metadata:string): Promise<any> {
  const url = `${this.endpoint}/indexes/${this.indexName}/docs/index?api-version=2021-04-30-Preview`;


  // Convert the metadata object into a single string if needed
  //const metadataString = JSON.stringify(metadata);

  // Prepare the document payload
  const payload = {
      value: vectorIds.map((id) => ({
          '@search.action': 'mergeOrUpload',
          id, // Use individual vector IDs
         // ...metadata, // Add metadata fields (e.g., translation)
          metadata: metadata,
      })),
  };

  try {
      const response = await axios.post(url, payload, {
          headers: {
              'Content-Type': 'application/json',
              'api-key': this.apiKey,
          },
      });
      this.logger.log(`Metadata updated successfully in Azure Search for vector IDs: ${JSON.stringify(vectorIds)}`);
      return response.data;
  } catch (error) {
      this.logger.error(`Failed to update metadata in Azure Search: ${error.message}`);
      if (error.response && error.response.status === 404) {
          throw new HttpException('Document not found', HttpStatus.NOT_FOUND);
      }
      throw new HttpException(
          'Failed to update document metadata',
          HttpStatus.INTERNAL_SERVER_ERROR,
      );
  }
}

async updateStatus(TGId: string, updateData: { status: number }) {
  try {
    console.log('TGId is', TGId);

    // Query the target group by TGId
    const querySpec = {
      query: 'SELECT * FROM c WHERE c.TGId = @TGId',
      parameters: [{ name: '@TGId', value: TGId }],
    };

    const { resources: targetGroups } = await this.targetContainer.items.query(querySpec).fetchAll();

    if (targetGroups.length === 0) {
      throw new Error(`No target group found with TGId: ${TGId}`);
    }

    const targetGroup = targetGroups[0];
    console.log('Existing target group:', targetGroup);

    // Update the necessary fields
    targetGroup.status = updateData.status;

    // Check if partition key exists
    const partitionKey = targetGroup.master_id || targetGroup.TGId; // Replace with actual partition key field
    if (!partitionKey) {
      throw new Error('Partition key not found for this document.');
    }

    // Replace the updated document
    await this.targetContainer
      .item(targetGroup.id, partitionKey)
      .replace(targetGroup);

    console.log('Successfully updated target group status.');
  } catch (error) {
    console.error(`Error updating TGId ${TGId}:`, error.message);
    throw new Error(`Failed to update status for TGId ${TGId}: ${error.message}`);
  }
}

}

