import { Injectable, Logger, InternalServerErrorException, HttpStatus } from '@nestjs/common';
import { InjectModel } from '@nestjs/azure-database';
import { Container } from '@azure/cosmos';
import { BlobSASPermissions, BlobServiceClient, generateBlobSASQueryParameters, StorageSharedKeyCredential } from '@azure/storage-blob';
import { ConfigService } from '@nestjs/config';
import { ProjectGroupDTO } from './dto/upload-audio.dto';
import { ProjectEntity } from './entity/project.entity';
import { TargetGroupEntity } from './entity/target.entity';
import { fork } from 'child_process';
import { join } from 'path';
import { TranscriptionEntity } from './entity/transcription.entity';
import { nanoid } from 'nanoid';



@Injectable()
export class AudioService {
  private readonly logger = new Logger(AudioService.name);
  private blobServiceClient: BlobServiceClient;
  private containerClient: any;
  constructor(
    @InjectModel(ProjectEntity) private readonly projectContainer: Container,
    @InjectModel(TargetGroupEntity) private readonly targetContainer: Container,
    @InjectModel(TranscriptionEntity) private readonly transcriptContainer: Container,
    private readonly config: ConfigService ) 
    {
    this.blobServiceClient = BlobServiceClient.fromConnectionString(this.config.get<string>('AZURE_STORAGE_CONNECTION_STRING'));
    this.containerClient = this.blobServiceClient.getContainerClient(this.config.get<string>('AUDIO_UPLOAD_BLOB_CONTAINER'));
    }

  // Handle audio processing logic
  async processAudioFiles(projectGrp: ProjectGroupDTO, targetGrp: string, files: Express.Multer.File[]) {
    try {
      const sasUrls: { fileName:string ,sasUri: string, sasToken: string }[] = [];
      const uploadPromises = files.map(async (file) => {
        try {
          const blockBlobClient = this.containerClient.getBlockBlobClient(file.originalname);
          const uploadBlobResponse = await blockBlobClient.uploadData(file.buffer);
          this.logger.log(`Blob ${file.originalname} uploaded successfully: ${uploadBlobResponse.requestId}`); 
          const sasUri=blockBlobClient.url;
          const fileName=file.originalname;
          this.generateBlobSasUrl(file.originalname)
          .then((sasToken)=>{ sasUrls.push({
            fileName,
            sasUri,sasToken
           })}); 
        // const temp1=blockBlobClient.getBlockBlobClient(uploadBlobResponse);
          return {
            filename: file.originalname,  
            requestId: uploadBlobResponse.requestId,
            status: 'success',
          };
        } catch (uploadError) {
          this.logger.error(`Failed to upload blob ${file.originalname}: ${uploadError.message}`);
          return {
            filename: file.originalname,
            status: 'failed',
            error: uploadError.message,
          };
        }
      });
      
      // Execute all file uploads in parallel
      const uploadResults = await Promise.all(uploadPromises);
      //Proceed to project and target group creation
      const finalResult = await this.createProjectAndTargetGroups(projectGrp, targetGrp,sasUrls);
      // return true;
      if (finalResult) {
        return {
          statusCode: HttpStatus.CREATED,
          message: 'Project and target groups created successfully',
          data: uploadResults,
        };
      } else {
        throw new InternalServerErrorException('Failed to create project and target groups');
      }
      //return true;

    } catch (error) {
      this.logger.error(`Failed to process audio files: ${error.message}`);
      throw new InternalServerErrorException('Error processing audio files');
    }
  }

  
  private async createProjectAndTargetGroups(project: ProjectGroupDTO, targetGrp: string,
    sasUrls: { fileName: string, sasUri: string, sasToken: string }[]) {
    try {
      const projectName: ProjectEntity = {
        ProjId: project.ProjId,
        ProjName: project.ProjName,
        UserId: project.userid,
        TGIds: project.TGIds,
      };
      const audioProcessDtoArray: {
        TGName: string, 
        mainLang: string, 
        SecondaryLang: string[], 
        noOfSpek: number, 
        sasToken: string
      }[] = [];
      const projectResponse = await this.projectContainer.items.create(projectName);
       this.logger.log(`Project ${projectName.ProjName} created with ID ${projectName.ProjId}`);

      // Create Target Groups and link to the project
      const targetGrpArray = Object.values(targetGrp);
      for (const group of targetGrpArray) {
        const groupObj = typeof group === 'string' ? JSON.parse(group) : group;
        const matchingSasUrl = sasUrls.find((sasUrl) => sasUrl.fileName.split('.')[0] === groupObj.TGName);
        const targetGroupEntity: TargetGroupEntity = {
          TGId:nanoid(),
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
          filePath: matchingSasUrl.sasUri,
          status:0
        };
         await this.targetContainer.items.create(targetGroupEntity);
         audioProcessDtoArray.push({
          TGName: groupObj.TGName,
          mainLang: groupObj.MainLang,
          SecondaryLang: groupObj.SecondaryLang,
          noOfSpek: groupObj.noOfSpek,
          sasToken: matchingSasUrl.sasToken
         })
         this.logger.log(`Target group ${targetGroupEntity.TGName} created and linked to project ${projectName.ProjName}`);
      }
      console.log('Before queue',audioProcessDtoArray);    
      this.logger.log(`Starting Audio transcibe ${projectName.ProjName}`);  
      this.runBackgroundTranscription(audioProcessDtoArray);
      return true;
    } catch (error) {
      this.logger.error(`Failed to create project and target groups: ${error.message}`);
      throw new InternalServerErrorException('Error creating project and target groups');
    }
  }

   runBackgroundTranscription(audioProcessDtoArray: {
    TGName: string,
    mainLang: string,
    SecondaryLang: string[],
    noOfSpek: number,
    sasToken: string,
  }[]) {
    const child = fork(join(__dirname, '../../dist/audio/workers/audio-worker.js'));

    // Send the data to the worker process
    child.send(audioProcessDtoArray
    );

    // Listen for a message from the worker process (transcription result)
    child.on('message', (result) => {
      console.log('Received transcription result from worker:', result);
      // Save the result to the database or handle it as needed
    });

    // Handle worker process exit
    child.on('exit', (code) => {
      console.log(`Child process exited with code ${code}`);
    });
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
      console.log(querySpecTarget.query);
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
      };
      return combinedData;
    } catch (error) {
      console.error('Error fetching audio details:', error.message);
      throw new InternalServerErrorException('Failed to fetch audio details');
    }
  }

}
