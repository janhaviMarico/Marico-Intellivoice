import { Body, Controller, Post, UploadedFiles, UseInterceptors, ValidationPipe, HttpException, HttpStatus, Logger, Get, InternalServerErrorException, Query, BadRequestException, Res } from '@nestjs/common';
import { AudioService } from './audio.service';
import { FilesInterceptor } from '@nestjs/platform-express';
import { ProjectGroupDTO } from './dto/upload-audio.dto';
import { ParseJsonInterceptor } from 'src/utility';
import { ApiConsumes, ApiOperation, ApiTags } from '@nestjs/swagger';
import { get } from 'http';
import { EditTranscriptionDto } from './dto/edit-transcription.dto';
import { diskStorage } from 'multer';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { Response } from 'express';

@ApiTags('Audio Management')
@Controller('audio')
export class AudioController {
  private readonly logger = new Logger(AudioController.name);
  fileUploadService: any;

  constructor(private readonly audioService: AudioService) {}

  @Post('upload')
  @ApiOperation({ summary: 'Upload audio files and process them' })
  @ApiConsumes('multipart/form-data') // Specifies that this endpoint consumes multipart data
  @UseInterceptors(FilesInterceptor('files'), ParseJsonInterceptor)
  async uploadAudioFiles(
    @Body('Project') projectDto: string,
    @Body('TargetGrp') targetGrpDto: string,
    @UploadedFiles() files: Express.Multer.File[]
  ) {
    try {
      // Parse the incoming project and target group data
      const projectGroupDto: ProjectGroupDTO = JSON.parse(projectDto);
      // Validate the parsed DTO (you could add further validation logic here if necessary)
      // You can also add a validation pipe here to handle DTO validation globally

      if (!files || files.length === 0) {
        throw new HttpException('No files uploaded', HttpStatus.BAD_REQUEST);
      }

      // Log the incoming request details
      this.logger.log(`Received request to upload ${files.length} files for project ${projectGroupDto.ProjName}`);

      // Call the service to process the audio files
      const result = await this.audioService.processAudioFiles(projectGroupDto, targetGrpDto, files);
      // const audioProcessDtoArray: {
      //   TGName: string, 
      //   mainLang: string, 
      //   SecondaryLang: string[], 
      //   noOfSpek: number, 
      //   sasToken: string
      // }[] = [];

      // audioProcessDtoArray.push({
      //   TGName: 'IN_MH_18_25_SOIL_NYK_E_MAR',
      //     mainLang: 'Hindi',
      //     SecondaryLang: [ 'English', 'Marathi', 'Tamil' ],
      //     noOfSpek: 4,
      //     sasToken: 'https://maricoblobopenai.blob.core.windows.net/audio-files-dev/IN_MH_18_25_SOIL_NYK_E_MAR.mp3?sv=2024-08-04&se=2024-09-26T18%3A18%3A08Z&sr=b&sp=r&sig=9mGPNCVMLqO1gSSyZyPcEErqAxHOEKql4XqIJbsXvqI%3D'
      // })
      // const result =this.audioService.runBackgroundTranscription(audioProcessDtoArray);
     // return result;
      //Return the result to the client
      return {
        statusCode: result.statusCode,
        message: result.message
        
      };
    } catch (error) {
      // Log the error
      this.logger.error(`Failed to upload audio files: ${error.message}`);

      // Handle and return the error response
      throw new HttpException(
        {
          statusCode: error.status || HttpStatus.INTERNAL_SERVER_ERROR,
          message: error.message || 'Internal Server Error',
        },
        error.status || HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  // @Get('list')
  // async getAudioList(@Body('userid') userid?: string) {
  //   try {
  //     // Fetch data from service with or without userid
  //     const audioData = await this.audioService.getAudioData(userid);
  //     return { data: audioData, message: 'Audio data fetched successfully' };
  //   } catch (error) {
  //     console.error('Error fetching audio data:', error.message);
  //     throw new InternalServerErrorException('Failed to fetch audio data');
  //   }
  // }

  /// new  code 

  @Post('list')
async getAudioListak(@Body() body: { user?: string; projectName?: string }) {
  const { user, projectName } = body;

  try {
    let data = [];

    if (!user && !projectName) {
      // Fetch all data if both `user` and `projectName` are empty
      data = await this.audioService.getAudioData();
    } else if (user && !projectName) {
      // Fetch all data for the specified `user`
      data = await this.audioService.getAudioData(user);
    } else if (!user && projectName) {
      // Fetch all data for the specified `projectName`
      data = await this.audioService.getAudioDataByProject(projectName);
    } else {
      // Fetch data for the specified `user` and `projectName`
      data = await this.audioService.getAudioDataByUserAndProject(user, projectName);
    }

    // Include the count of the data list in the response
    return {
      count: data.length,
      data: data,
      message: 'Audio data fetched successfully',
    };
  } catch (error) {
    console.error('Error fetching audio data:', error.message);
    throw new InternalServerErrorException('Failed to fetch audio data');
  }
}


  @Get('details')
  async getAudioDetails(
  @Query('tgId') tgId: string,
  @Query('tgName') tgName: string
) {
    try {
      // Fetch details from the service
      
      const audioDetails = await this.audioService.getAudioDetails(tgId, tgName);
      return { data: audioDetails, message: 'Audio details fetched successfully' };
    } catch (error) {
      console.error('Error fetching audio details:', error.message);
      throw new InternalServerErrorException('Failed to fetch audio details');
    }
  }

@Post('edit')
async editTranscription(
    @Body('editData') editTranscriptionDto: EditTranscriptionDto,
    @Body('vectorIds') vectorIds: string[],
) {
    if (!Array.isArray(vectorIds) || vectorIds.length === 0) {
        throw new BadRequestException('Vector document IDs are required and should be an array.');
    }
    return this.audioService.editTranscription(editTranscriptionDto, vectorIds);
} 

/// audio trim code

@Post('multiple')
  @UseInterceptors(
    FilesInterceptor('files', 10, {
      storage: diskStorage({
        destination: './uploads',
        filename: (req, file, cb) => {
          const filename = `${uuidv4()}${path.extname(file.originalname)}`;
          cb(null, filename);
        },
      }),
    }),
  )
  async uploadMultipleFiles(@UploadedFiles() files: Express.Multer.File[]) {
    // Clear the uploads folder before processing new files
    //this.fileUploadService.clearUploadFolder();

    // Proceed to store and return the new file URLs
    const fileUrls = this.audioService.storeFiles(files);
    return { files: fileUrls };
  }

  @Post('upload-and-peaks')
  @UseInterceptors(
    FilesInterceptor('files', 10, {
      storage: diskStorage({
        destination: './uploads',
        filename: (req, file, cb) => {
          const filename = `${uuidv4()}${path.extname(file.originalname)}`;
          cb(null, filename);
        },
      }),
    }),
  )
  async uploadFilesAndGeneratePeaks(@UploadedFiles() files: Express.Multer.File[]) {
    // Clear the uploads folder before processing new files, if needed
    // this.fileUploadService.clearUploadFolder();

    // Process each file: store it and generate peaks
    const results = await Promise.all(
      files.map(async (file) => {
        // Generate file URL
        const fileUrl = `http://localhost:3000/uploads/${file.filename}`;

        // Generate peaks from file path
        const peaks = await this.audioService.generatePeaksFromFilePath(
          path.join(this.audioService.uploadDirectory, file.filename),
        );

        return {
          fileUrl,
          fileName: file.originalname,
          peaks,
        };
      }),
    );

    return { files: results };
  }

  //merge audio file

  @Post('merge-with-trims')
  @UseInterceptors(FilesInterceptor('files', 10)) // Allow up to 10 files
  async mergeAudioWithTrims(
    @UploadedFiles() files: Express.Multer.File[],
    @Body('fileTrimPairs') fileTrimPairs: string, // The file and trim data as JSON
    @Res() res: Response
  ) {
    const parsedFileTrimPairs = JSON.parse(fileTrimPairs); // Parse the file-trim pairing from JSON

    // Combine files and trim data into an array of objects
    const fileTrimData = parsedFileTrimPairs.map((pair: any, index: number) => ({
      file: files[index],
      trims: pair.trims || [] // Default to no trimming if not provided
    }));

    try {
      const mergedStream = await this.audioService.mergeAudioWithTrims(fileTrimData);
      res.set({
        'Content-Type': 'audio/mpeg',
        'Content-Disposition': 'attachment; filename=merged-audio.mp3',
      });
      mergedStream.pipe(res); // Pipe the merged audio file to the response
    } catch (error) {
      console.error('Error during audio merging with trims:', error);
      res.status(500).json({ message: 'Error during audio merging.' });
    }
  }

}

