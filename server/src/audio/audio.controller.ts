import { Body, Controller, Post, UploadedFiles, UseInterceptors, ValidationPipe, HttpException, HttpStatus, Logger, Get, InternalServerErrorException, Query, BadRequestException, Res, UploadedFile } from '@nestjs/common';
import { AudioService } from './audio.service';
import { FileInterceptor, FilesInterceptor } from '@nestjs/platform-express';
import { ProjectGroupDTO, TargetGroupDto } from './dto/upload-audio.dto';
import { ParseJsonInterceptor } from 'src/utility';
import { ApiBody, ApiConsumes, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
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
  @ApiBody({
    description: 'Audio file upload',
    type: 'multipart/form-data',
    schema: {
      type: 'object',
      properties: {
        files: {
          type: 'array',
          items: {
            type: 'string',
            format: 'binary',
          },
        },
        Project: { type: 'string', example: '{"ProjName": "Test Project"}' },
        TargetGrp: { type: 'string', example: '{"TargetGroup": "Group1"}' },
      },
    },
  })
  @UseInterceptors(FilesInterceptor('files'), ParseJsonInterceptor)
  async uploadAudioFiles(
    @Body('Project') projectDto: string,
    @Body('TargetGrp') targetGrpDto: string,
    @UploadedFiles() files: Express.Multer.File[]
  ) {
    try {
      // Parse the incoming project and target group data
      const projectGroupDto: ProjectGroupDTO = JSON.parse(projectDto);
     
      if (!files || files.length === 0) {
        throw new HttpException('No files uploaded', HttpStatus.BAD_REQUEST);
      }
      
      // Log the incoming request details
      this.logger.log(`Received request to upload ${files.length} files for project ${projectGroupDto.ProjName}`);
 
      // Call the service to process the audio files
      const result = await this.audioService.processAudioFiles(projectGroupDto, targetGrpDto, files);
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

@Post('list')
@ApiOperation({ summary: 'Get list of audio files' }) // Describes endpoint
  @ApiBody({
    description: 'Filter audio files by user, project name, or fetch all',
    schema: {
      type: 'object',
      properties: {
        user: { type: 'string', example: 'john.doe' },
        projectName: { type: 'string', example: 'Project ABC' },
        isAllFile: { type: 'boolean', example: true }
      }
    }
  })
async getAudioList(@Body() body: { user?: string; projectName?: string, isAllFile?:boolean }) {
  const { user, projectName,isAllFile } = body;

  try {
    const data =
      !user && !projectName
        ? await this.audioService.getAudioData()
        : user && !projectName
        ? await this.audioService.getAudioData(user,isAllFile)
        : !user && projectName
        ? await this.audioService.getAudioDataByProject(projectName)
        : await this.audioService.getAudioDataByUserAndProject(user, projectName);

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
  @ApiOperation({ summary: 'View Data for each Target groups' })
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
@ApiOperation({ summary: 'Edit Transcription' })
async editTranscription(
    @Body('editData') editTranscriptionDto: EditTranscriptionDto,
    @Body('vectorIds') vectorIds: string[],
    @Body('audioName') audioName:string
) {
    if (!Array.isArray(vectorIds) || vectorIds.length === 0) {
        throw new BadRequestException('Vector document IDs are required and should be an array.');
    }
    return this.audioService.editTranscription(editTranscriptionDto, vectorIds,audioName);
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
        const fileUrl = `http://localhost:3001/uploads/${file.filename}`;

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
  @UseInterceptors(FileInterceptor('files')) // Single file instead of multiple
  async mergeAudioWithTrims(
    @UploadedFile() file: Express.Multer.File, // Change to single file
    @Body('fileTrimPairs') fileTrimPairs: string, // The trim data as JSON
    @Res() res: Response
  ) {
    const trims = JSON.parse(fileTrimPairs); // Parse the trims array

    try {
      const mergedStream = await this.audioService.mergeSignleAudioWithTrims(file, trims);

      res.set({
        'Content-Type': 'audio/mpeg',
        'Content-Disposition': 'attachment; filename=trimmed-audio.mp3',
      });
      mergedStream.pipe(res); // Pipe the trimmed audio file to the response
    } catch (error) {
      console.error('Error during audio merging with trims:', error);
      res.status(500).json({ message: 'Error during audio trimming.' });
    }
  }

  @Post('delete')
  @ApiOperation({ summary: 'Delete audio files and related data' })
  @ApiBody({
    description: 'List of Target IDs and Target Names to delete',
    schema: {
      type: 'object',
      properties: {
        targets: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              TGId: { type: 'string', description: 'Target Group ID' },
              TGName: { type: 'string', description: 'Target Group Name' },
            },
          },
        },
      },
    },
  })
  @ApiResponse({ status: 200, description: 'Targets deleted successfully' })
  @ApiResponse({ status: 400, description: 'Invalid input' })
  @ApiResponse({ status: 500, description: 'Internal server error' })
  async deleteAudioFiles(
    @Body() body: { targets: { TGId: string; TGName: string }[] },
  ) {
    const { targets } = body;
  
    if (!targets || targets.length === 0) {
      throw new BadRequestException('Invalid input: Targets are required');
    }
  
    try {
      const result = await this.audioService.deleteAudioFiles(targets);
      return {
        message: 'Audio files and related data deleted successfully',
        deletedCount: result.deletedCount,
      };
    } catch (error) {
      this.logger.error('Error deleting audio files:', error.message);
      throw new InternalServerErrorException('Failed to delete audio files');
    }
  }
  

}

