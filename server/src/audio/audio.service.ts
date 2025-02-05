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
import * as path from 'path';
import ffmpeg from 'fluent-ffmpeg';
import * as fs from 'fs';
import * as wav from 'wav';
import { promisify } from 'util';
import { Readable } from 'stream';
import { join } from 'path';
import { exec } from 'child_process';
import { User } from 'src/user/user.entity';

const unlinkAsync = promisify(fs.unlink);
ffmpeg.setFfmpegPath('C:/ffmpeg/ffmpeg.exe');
const execAsync = promisify(exec);


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
    @InjectModel(User) private readonly userContainer: Container,
    @InjectModel(ProjectEntity) private readonly projectContainer: Container,
    @InjectModel(TargetGroupEntity) private readonly targetContainer: Container,
    @InjectModel(TranscriptionEntity) private readonly transcriptContainer: Container,
    @InjectQueue('transcription') private readonly transcriptionQueue: Queue,
    private readonly audioUtils: AudioUtils,
    private readonly config: ConfigService) {
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
            filePath: [], // This will be updated after audio upload
            status: 0,
          };
          await this.targetContainer.items.create(targetGroupEntity);
          // Add the new TGId to the existing project's TGIds array
          existingProject.resources[0].TGIds.push(targetGroupEntity.TGId);

          // Use upsert to update the project with the new TGIds array
          await this.projectContainer.items.upsert(existingProject.resources[0]);
        } else {

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
            filePath: [], // This will be updated after audio upload
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

        const tempFilePath = join('uploads', `${Date.now()}-${file.originalname}`);
        const processedFilePath = join('uploads', `processed-${Date.now()}-${file.originalname}`);

        // Write the uploaded file buffer to disk temporarily
        fs.writeFileSync(tempFilePath, file.buffer);
        const ffmpegPath = 'C:/ffmpeg/ffmpeg.exe'; // Adjust the path

        // Process the file with FFmpeg (noise cancellation and mono conversion)
        const ffmpegCommand = `${ffmpegPath} -i ${tempFilePath} -af "highpass=f=300, lowpass=f=3000, afftdn=nf=-25" -ac 1 -ar 16000 ${processedFilePath}`;
        await execAsync(ffmpegCommand);

        // Read the processed file back into a buffer
        const processedBuffer = fs.readFileSync(processedFilePath);

        const blockBlobClient = this.containerClient.getBlockBlobClient(file.originalname);
        const uploadBlobResponse = await blockBlobClient.uploadData(processedBuffer);
        this.logger.log(`Blob ${file.originalname} uploaded successfully: ${uploadBlobResponse.requestId}`);
        const sasUri = blockBlobClient.url;
        const fileName = file.originalname;
        // Generate SAS token
        const sasToken = await this.generateBlobSasUrl(file.originalname);
        sasUrls.push({ fileName, sasUri, sasToken });
        //console.log('sasUrls',sasUrls);
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

        let latestDocument: any =undefined;
        const matchingSasUrl: string[] = [];
        let foundSasUrl:any ;
        const groupObj = typeof group === 'string' ? JSON.parse(group) : group;

        const querySpec = {
          query: 'SELECT * FROM c WHERE c.TGName = @TGName',
          parameters: [{ name: '@TGName', value: groupObj.TGName }]
        };
        
        const { resources: existingDocuments } = await this.targetContainer.items.query(querySpec).fetchAll();
        latestDocument = existingDocuments[0];
        latestDocument.filePath = []; // Reset filePath for multiple audio files

        for (const audioFileName of groupObj.AudioName) {
          const foundSasUrl = sasUrls.find((sasUrl) => sasUrl.fileName === audioFileName);

          latestDocument.filePath.push(foundSasUrl.sasUri);
          //foundSasUrl = sasUrls.find((sasUrl) => sasUrl.fileName === audioFileName);
          matchingSasUrl.push(foundSasUrl.sasUri);

          audioProcessDtoArray.push({
          TGId: latestDocument.TGId,
          TGName: groupObj.TGName,
          mainLang: groupObj.MainLang,
          SecondaryLang: groupObj.SecondaryLang,
          noOfSpek: groupObj.noOfSpek,
          sasToken: foundSasUrl.sasToken,
          fileName:audioFileName
        });
      }  
      await this.targetContainer.items.upsert(latestDocument);
    }

    console.log('audioProcessDtoArray',audioProcessDtoArray);
      this.logger.log('Target groups updated with SAS URLs.');
      return audioProcessDtoArray;
    } catch (error) {
      this.logger.error(`Failed to update target groups: ${error.message}`);
      throw new InternalServerErrorException('Error updating target groups');
    }
  }


  runBackgroundTranscription(audioProcessDtoArray: {
    TGId: string,
    TGName: string,
    mainLang: string,
    SecondaryLang: string[],
    noOfSpek: number,
    sasToken: string,
    fileName : string
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

  //new optimazation code  
  async getAudioData(userId?: string, isAllFile?: boolean): Promise<any[]> {
    try {
      let userIdsToFetch: string[] = [];
  
      // If isAllFile is true, fetch all users and get their mapped users
      if (isAllFile && userId) {
        const querySpecUsers = {
          query: 'SELECT c.userid, c.mapUser FROM c WHERE c.userid = @UserId',
          parameters: [{ name: '@UserId', value: userId }],
        };
  
        const { resources: users } = await this.userContainer.items.query(querySpecUsers).fetchAll();
  
        if (users.length > 0) {
          // Add main user
          userIdsToFetch.push(users[0].userid);
  
          // Add mapped users if available
          if (users[0].mapUser && Array.isArray(users[0].mapUser)) {
            userIdsToFetch.push(...users[0].mapUser);
          }
        }
      } else if (userId) {
        // If only a specific user is given, fetch their projects
        userIdsToFetch.push(userId);
      }

      console.log('userIdsToFetch',userIdsToFetch);
  
      // Build query for projects
      let querySpecProject;
      if (userIdsToFetch.length > 0) {
        querySpecProject = {
          query: 'SELECT * FROM c WHERE ARRAY_CONTAINS(@userIds, c.UserId)',
          parameters: [{ name: '@userIds', value: userIdsToFetch }],
        };
      } else {
        querySpecProject = { query: 'SELECT * FROM c' };
      }
  
      const { resources: projects } = await this.projectContainer.items.query(querySpecProject).fetchAll();
  
      if (!projects.length) return [];
  
      const projIds = projects.map((proj) => proj.ProjId).reverse();
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

      const projIds = projects.map((proj) => proj.ProjId).reverse();
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

      const projIds = projects.map((proj) => proj.ProjId).reverse();
      return this.combineProjectAndTargetData(projIds, projects);
    } catch (error) {
      console.error('Error fetching audio data by user and project:', error.message);
      throw new InternalServerErrorException('Failed to fetch audio data by user and project');
    }
  }

  private async combineProjectAndTargetData(projIds: string[], projects: any[]): Promise<any[]> {
    try {
      // Step 1: Fetch all targets for given project IDs
      const querySpecTarget = {
        query: `SELECT * FROM c WHERE ARRAY_CONTAINS(@ProjIds, c.ProjId)`,
        parameters: [{ name: '@ProjIds', value: projIds }],
      };
  
      const { resources: targets } = await this.targetContainer.items.query(querySpecTarget).fetchAll();
  
      // Step 2: Fetch all users to map userId → userName
      const querySpecUsers = { query: `SELECT c.userid, c.userName FROM c` };
      const { resources: users } = await this.userContainer.items.query(querySpecUsers).fetchAll();
  
      // Create a user map for quick lookup
      const userMap = users.reduce((map, user) => {
        map[user.userid] = user.userName;
        return map;
      }, {});
  
      // Step 3: Map targets by ProjId for quick lookup
      const targetMap = targets.reduce((map, target) => {
        if (!map[target.ProjId]) map[target.ProjId] = [];
        map[target.ProjId].push(target);
        return map;
      }, {});
  
      // Step 4: Combine project and target data
      const combinedResults = [];
  
      await Promise.all(
        projects.map(async (project) => {
          const projId = project.ProjId;
          const relatedTargets = targetMap[projId] || [];
          const userName = userMap[project.UserId] || 'Unknown User'; // Fetch userName from userMap
  
          for (const target of relatedTargets) {
            combinedResults.push({
              ProjectName: project.ProjName,
              UserName: userName, // ✅ Added User Name here
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
  
      return combinedResults.reverse();
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

      this.logger.log("transcription data", querySpecTranscription)

      const { resources: transcriptions } = await this.transcriptContainer.items.query(querySpecTranscription).fetchAll();

      // Return true if at least one transcription exists for the target
      return transcriptions.length > 0;
    } catch (error) {
      console.error('Error checking transcription data:', error.message);
      return false; // Treat as no transcription if an error occurs
    }
  }



  async viewData(TGName: string, TGId: string) {
  }

  async getAudioDetails(tgId: string, tgName: string) {
    try {
      // 1. Fetch Target Data by TGId and TGName

      //IN_MH_18_25_SOIL_NYK_E_MAR
      //IN_MH_18_25_SOIL_NYK_E_MAR
      console.log(tgName);
      const querySpecTarget = {
        query: 'SELECT * FROM c WHERE c.TGName = @TGName',
        parameters: [
          { name: '@TGName', value: tgName },
          //{name:'@id',value:"113536ec-41e6-445b-8324-bf99bd93d5cd"}
        ],
      };

      console.log(querySpecTarget);
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
      console.log(transcriptionData);
      const transcriptionItem = transcriptionData[0]; // Assuming TGId and TGName are unique
      this.logger.log(`Combining transcription data for  ${tgId} and ${tgName} `);
      console.log('targetItem',targetItem);
      const filenameurl = await this.generateBlobSasUrl(targetItem.filePath.substring(targetItem.filePath.lastIndexOf('/') + 1))
      console.log('filenameurl',filenameurl);
      // 3. Combine Target and Transcription Data
      const combinedData = {
        TGId: targetItem.TGId,
        TGName: targetItem.TGName,
        FilePath: filenameurl, // Audio Blob Link from Target Container
        AudioData: transcriptionItem.audiodata, // Transcription and Translation
        Summary: transcriptionItem.summary, // Summary from Transcription Container
        SentimentAnalysis: transcriptionItem.sentiment_analysis, // Sentiment Analysis from Transcription Container
        vectorId: transcriptionItem.vectorId
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
  async updateMetadataInAzureSearch(vectorIds: string[], metadata: string): Promise<any> {
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
  uploadDirectory = './uploads';

  clearUploadFolder() {
    const files = fs.readdirSync(this.uploadDirectory);
    for (const file of files) {
      fs.unlinkSync(path.join(this.uploadDirectory, file));
    }
  }

  storeFiles(files: Express.Multer.File[]): string[] {
    return files.map((file) => {
      const filePath = path.join(this.uploadDirectory, file.filename);
      return `http://localhost:3000/uploads/${file.filename}`; // Adjust URL as needed
    });
  }

  async generatePeaksFromFilePath(filePath: string, numPeaks: number = 1000): Promise<number[]> {
    return new Promise<number[]>((resolve, reject) => {
      const outputWavPath = `${filePath}-temp.wav`;
      const peaks: number[] = [];

      // Step 1: Convert audio to WAV format and save to a temporary file
      ffmpeg(filePath)
        .audioChannels(1) // Mono channel
        .audioFrequency(8000) // Downsample to reduce data size
        .format('wav')
        .output(outputWavPath)
        .on('end', async () => {
          const reader = new wav.Reader();
          const fileStream = fs.createReadStream(outputWavPath);

          reader.on('format', (format) => {
            const step = Math.floor(format.sampleRate / numPeaks); // Calculate step size for numPeaks
            let sampleCount = 0;
            let peak = 0;

            reader.on('data', (chunk) => {
              for (let i = 0; i < chunk.length; i += 2) {
                const sample = chunk.readInt16LE(i);
                peak = Math.max(peak, Math.abs(sample));

                sampleCount++;
                if (sampleCount % step === 0) {
                  peaks.push(peak);
                  peak = 0;
                  if (peaks.length >= numPeaks) {
                    fileStream.unpipe(reader);
                    reader.end();
                    break;
                  }
                }
              }
            });

            reader.on('end', async () => {
              fileStream.close(); // Ensure fileStream is fully closed

              // Add a small delay before attempting to delete
              setTimeout(async () => {
                try {
                  await unlinkAsync(outputWavPath); // Delete the file after it's closed and delay
                } catch (unlinkError) {
                  console.error('Error deleting temporary file:', unlinkError.message);
                }
                resolve(peaks);
              }, 100); // 100ms delay to ensure OS releases file lock
            });
          });

          reader.on('error', async (error) => {
            fileStream.close(); // Close the file stream on error as well
            setTimeout(async () => {
              try {
                await unlinkAsync(outputWavPath);
              } catch (unlinkError) {
                console.error('Error deleting temporary file on error:', unlinkError.message);
              }
              reject(error);
            }, 100); // 100ms delay before deleting
          });

          // Pipe the WAV file data to the reader
          fileStream.pipe(reader);
        })
        .on('error', (err) => {
          reject(err);
        })
        .run();
    });
  }

  async mergeAudioWithTrims(fileTrimPairs: { file: Express.Multer.File, trims: { start: number, end: number }[] }[]): Promise<Readable> {
    return new Promise((resolve, reject) => {
      const tempFiles: string[] = [];
      const trimmedFiles: string[] = [];

      // Process each file and its corresponding trims
      const processNextFile = (index: number) => {
        if (index >= fileTrimPairs.length) {
          this.mergeFiles(trimmedFiles, resolve, reject); // Merge when all files are processed
          return;
        }

        const { file, trims } = fileTrimPairs[index]; // Get the file and its trims
        const filePath = `tempfile-${index}.mp3`;
        fs.writeFileSync(filePath, file.buffer); // Write file to disk
        tempFiles.push(filePath);

        if (!trims || trims.length === 0) {
          // No trimming needed, use entire file
          trimmedFiles.push(filePath);
          processNextFile(index + 1); // Move to the next file
        } else {
          // Trim sections using ffmpeg
          this.trimAudio(filePath, trims)
            .then((trimmedFilePaths) => {
              trimmedFiles.push(...trimmedFilePaths); // Add trimmed parts
              processNextFile(index + 1); // Move to the next file
            })
            .catch((error) => reject(error));
        }
      };

      // Start processing files
      processNextFile(0);
    });
  }

  // Helper method to trim a file based on multiple trim instructions
  async trimAudio(filePath: string, trimTimes: { start: number, end: number }[]): Promise<string[]> {
    return new Promise((resolve, reject) => {
      const trimmedFiles: string[] = [];

      const processNextTrim = (index: number) => {
        if (index >= trimTimes.length) {
          resolve(trimmedFiles); // All trims processed
          return;
        }

        const { start, end } = trimTimes[index];
        const trimmedFilePath = `trimmed-${index}-${Date.now()}.mp3`;

        ffmpeg(filePath)
          .setStartTime(start)
          .setDuration(end - start)
          .output(trimmedFilePath)
          .on('end', () => {
            trimmedFiles.push(trimmedFilePath); // Add trimmed part
            processNextTrim(index + 1); // Process next trim
          })
          .on('error', (err) => reject(err))
          .run();
      };

      processNextTrim(0); // Start processing trims
    });
  }

  // Method to merge all files (trimmed or full)
  mergeFiles(trimmedFiles: string[], resolve: Function, reject: Function): void {
    const mergedFilePath = 'output.mp3';
    const concatFilePath = 'concat_list.txt';
    const concatFileContent = trimmedFiles.map((filePath) => `file '${filePath}'`).join('\n');
    fs.writeFileSync(concatFilePath, concatFileContent);

    ffmpeg()
      .input(concatFilePath)
      .inputOptions(['-f concat', '-safe 0'])
      .outputOptions('-c copy')
      .on('end', () => {
        const mergedStream = fs.createReadStream(mergedFilePath);
        resolve(mergedStream); // Resolve with the merged stream

        // Clean up temporary files
        trimmedFiles.forEach((file) => fs.unlinkSync(file));
        fs.unlinkSync(concatFilePath);
      })
      .on('error', (err) => reject(err))
      .save(mergedFilePath);
  }

  async updateStatus(TGId: string, updateData: { status: number }) {
    try {
      

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

    } catch (error) {
      console.error(`Error updating TGId ${TGId}:`, error.message);
      throw new Error(`Failed to update status for TGId ${TGId}: ${error.message}`);
    }
  }

}
