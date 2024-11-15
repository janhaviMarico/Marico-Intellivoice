import { Injectable, Logger, InternalServerErrorException, HttpStatus, NotFoundException, ConflictException } from '@nestjs/common';
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



@Injectable()
export class AudioService {
  private readonly logger = new Logger(AudioService.name);
  private blobServiceClient: BlobServiceClient;
  private containerClient: any;
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
  // async processAudioFiles(projectGrp: ProjectGroupDTO, targetGrp: string, files: Express.Multer.File[]) {
  //   try {
  //     // Step 1: Create Project and Target Groups
  //     const projectResponse = await this.createProjectAndTargetGroups(projectGrp, targetGrp);
  //     if (!projectResponse) {
  //       throw new InternalServerErrorException('Failed to create project and target groups');
  //     }

  //     const response = {
  //       statusCode: HttpStatus.CREATED,
  //       message: 'Project created successfully, audio files processing in background',
  //     };
  
  //     // Run the remaining steps asynchronously (in the background)
  //     this.uploadAndProcessFilesInBackground(files, projectGrp, targetGrp);
  
  //     return response;
  //   } catch (error) {
  //     this.logger.error(`Failed to process audio files: ${error.message}`);
  //     throw new InternalServerErrorException('Error processing audio files');
  //   }
  // }

  async checkIfProjectExists(projName: string): Promise<boolean> {
    try {
      // Query for project by name
      const querySpec = {
        query: 'SELECT * FROM c WHERE c.ProjName = @ProjName',
        parameters: [{ name: '@ProjName', value: projName }],
      };
      const { resources: existingProjects } = await this.projectContainer.items.query(querySpec).fetchAll();
  
      return existingProjects.length > 0; // If project exists, return true
    } catch (error) {
      this.logger.error(`Error checking if project exists: ${error.message}`);
      throw new InternalServerErrorException('Error checking project existence');
    }
  }
  

  async processAudioFiles(projectGrp: ProjectGroupDTO, targetGrp: string, files: Express.Multer.File[]) {
    try {
      // Step 1: Check if the project exists. If not, create a new project and target groups
      const projectExists = await this.checkIfProjectExists(projectGrp.ProjName);
      
      let projectResponse;
      if (!projectExists) {
        // If project doesn't exist, create new project and target groups
        projectResponse = await this.createProjectAndTargetGroups(projectGrp, targetGrp);
      } else {
        // If project exists, skip creation and just add target groups to the existing project
        projectResponse = { statusCode: HttpStatus.OK, message: 'Project already exists, adding new targets' };
      }
  
      if (!projectResponse) {
        throw new InternalServerErrorException('Failed to create project and target groups');
      }
  
      const response = {
        statusCode: HttpStatus.CREATED,
        message: 'Audio files processing in background',
      };
  
      // Step 2: Upload and process files in the background
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

  // async createProjectAndTargetGroups(project: ProjectGroupDTO, targetGrp: string) {
  //   try {
  //     const projectName: ProjectEntity = {
  //       ProjId: project.ProjId,
  //       ProjName: project.ProjName,
  //       UserId: project.userid,
  //       TGIds: project.TGIds,
  //     };
  
  //     const projectResponse = await this.projectContainer.items.create(projectName);
  //     this.logger.log(`Project ${projectName.ProjName} created with ID ${projectName.ProjId}`);
  
  //     const targetGrpArray = Object.values(targetGrp);
      
  
  //     for (const group of targetGrpArray) {
  //       const groupObj = typeof group === 'string' ? JSON.parse(group) : group;
  //       const targetGroupEntity: TargetGroupEntity = {
  //         TGId: nanoid(),
  //         TGName: groupObj.TGName,
  //         ProjId: groupObj.ProjId,
  //         AudioName: groupObj.AudioName,
  //         Country: groupObj.Country,
  //         State: groupObj.State,
  //         AgeGrp: groupObj.AgeGrp,
  //         CompetetionProduct: groupObj.CompetetionProduct,
  //         MaricoProduct: groupObj.MaricoProduct,
  //         MainLang: groupObj.MainLang,
  //         SecondaryLang: groupObj.SecondaryLang,
  //         noOfSpek: groupObj.noOfSpek,
  //         filePath: '', // This will be updated after audio upload
  //         status: 0,
  //       };
  //       await this.targetContainer.items.create(targetGroupEntity);
  //     }
  
  //     this.logger.log('Target groups linked to project and created successfully.');
  //     return true;
  //   } catch (error) {
  //     this.logger.error(`Failed to create project and target groups: ${error.message}`);
  //     throw new InternalServerErrorException('Error creating project and target groups');
  //   }
  // }

  async createProjectAndTargetGroups(project: ProjectGroupDTO, targetGrp: string) {
    try {
      // Step 1: Check if the Project Already Exists
      const querySpec = {
        query: 'SELECT * FROM c WHERE c.ProjName = @ProjName',
        parameters: [{ name: '@ProjName', value: project.ProjName }],
      };
  
      const { resources: existingProjects } = await this.projectContainer.items.query(querySpec).fetchAll();
  
      let projectName: ProjectEntity;
      
      if (existingProjects.length === 0) {
        // If project doesn't exist, create a new project
        projectName = {
          ProjId: project.ProjId,
          ProjName: project.ProjName,
          UserId: project.userid,
          TGIds: project.TGIds,
        };
  
        // Create the project in the database
        await this.projectContainer.items.create(projectName);
        this.logger.log(`Project ${projectName.ProjName} created with ID ${projectName.ProjId}`);
      } else {
        // If project exists, use the existing project
        projectName = existingProjects[0];
        this.logger.log(`Project ${projectName.ProjName} already exists, using existing project ID ${projectName.ProjId}`);
      }
  
      // Step 2: Create Target Groups
      const targetGrpArray = Object.values(targetGrp);
  
      for (const group of targetGrpArray) {
        const groupObj = typeof group === 'string' ? JSON.parse(group) : group;
  
        // Check if a Target Group with the same TGName already exists
        const querySpec = {
          query: 'SELECT * FROM c WHERE c.TGName = @TGName AND c.ProjId = @ProjId',
          parameters: [
            { name: '@TGName', value: groupObj.TGName },
            { name: '@ProjId', value: projectName.ProjId },
          ],
        };
  
        const { resources: existingTargetGroups } = await this.targetContainer.items.query(querySpec).fetchAll();
  
        if (existingTargetGroups.length > 0) {
          // If a target group with the same name already exists, throw an error
          throw new ConflictException(`Target Group with name '${groupObj.TGName}' already exists for this project.`);
        }
  
        // Step 3: Create the Target Group
        const targetGroupEntity: TargetGroupEntity = {
          TGId: nanoid(),
          TGName: groupObj.TGName,
          ProjId: projectName.ProjId,  // Link it to the existing or new project
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
  
        // Create the Target Group in the database
        await this.targetContainer.items.create(targetGroupEntity);
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

  async getAudioData(userid?: string) {
    try {
      // 1. Build Project Query
      let querySpecProject;
      if (userid) {
        // If `userid` is passed, filter by `userid`
        querySpecProject = {
          query: 'SELECT * FROM c WHERE c.userid = @userid',
          parameters: [{ name: '@userid', value: userid }],
        };
      } else {
        // If no `userid`, fetch all projects
        querySpecProject = {
          query: 'SELECT * FROM c',
        };
      }

      // Fetch projects based on query
      const { resources: projects } = await this.projectContainer.items.query(querySpecProject).fetchAll();

      // If no projects found
      if (projects.length === 0) {
        return [];
      }

      // 2. Fetch and Combine Data from Target Container
      const combinedResults = [];

      // Iterate over all fetched projects
      for (const project of projects) {
        const projId = project.ProjId;

        // Fetch related target data using ProjId
        const querySpecTarget = {
          query: 'SELECT * FROM c WHERE c.ProjId = @ProjId',
          parameters: [{ name: '@ProjId', value: projId }],
        };
        const { resources: targets } = await this.targetContainer.items.query(querySpecTarget).fetchAll();

        // Combine the data from project and target containers
        for (const target of targets) {
          combinedResults.push({
            ProjectName: project.ProjName,
            Country: target.Country,
            State: target.State,
            TargetGroup: target.TGName,
            TargetId :target.TGId,
            AgeGroup: target.AgeGrp,
            CompetitorGroup: target.CompetetionProduct,
            MaricoProduct: target.MaricoProduct,
            Status: target.status === 0 ? 'Processing' : target.status === 1 ? 'Completed' : target.status === 2 ? 'Failed': 'Unknown' 
          });
        }
      }

      return combinedResults;
    } catch (error) {
      console.error('Error fetching audio data:', error.message);
      throw new InternalServerErrorException('Failed to fetch audio data');
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


  //translation edit
  async editTranscription(data: EditTranscriptionDto) {
    this.logger.log(`Attempting to edit transcription for TGId: ${data.TGId}`);
    
    const container = this.transcriptContainer;

    try {
        //this.logger.log(`TGId is: ${data.TGId}`);
        
        if (!data.TGId) {
            throw new Error('TGId is undefined or empty');
        }

        // Check item using the query method
        const { resources: items } = await container.items
            .query(`SELECT * FROM c WHERE c.TGId = '${data.TGId}'`)
            .fetchAll();

        if (items.length === 0) {
            this.logger.warn(`No item found with TGId: ${data.TGId}`);
            throw new NotFoundException('Item not found');
        }

        const existingItem = items[0];
       // this.logger.log(`Existing item: ${JSON.stringify(existingItem)}`);

        const updatedItem = {
            ...existingItem,
            audiodata: data.audiodata,
        };

        const { resource: updatedResource } = await container.items.upsert(updatedItem);
        this.logger.log(`Transcription updated successfully for TGId: ${data.TGId}`);
        
        // Return a simple success message
        return {
          statusCode: 200,  // HTTP status code for success
          message: `Translation updated successfully.`,
      };

    } catch (error) {
        this.logger.error(`Failed to edit transcription: ${error.message}`);
        throw error;
    }
}

}
