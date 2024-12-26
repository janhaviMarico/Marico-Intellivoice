import { Body, Controller, Post, UploadedFiles, UseInterceptors, ValidationPipe, HttpException, HttpStatus, Logger, Get, InternalServerErrorException, Query, BadRequestException } from '@nestjs/common';
import { AudioService } from './audio.service';
import { FilesInterceptor } from '@nestjs/platform-express';
import { ProjectGroupDTO, TargetGroupDto } from './dto/upload-audio.dto';
import { ParseJsonInterceptor } from 'src/utility';
import { ApiConsumes, ApiOperation, ApiTags } from '@nestjs/swagger';
import { get } from 'http';
import { EditTranscriptionDto } from './dto/edit-transcription.dto';


@ApiTags('Audio Management')
@Controller('audio')
export class AudioController {
  private readonly logger = new Logger(AudioController.name);

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
async getAudioList(@Body() body: { user?: string; projectName?: string }) {
  const { user, projectName } = body;

  try {
    const data =
      !user && !projectName
        ? await this.audioService.getAudioData()
        : user && !projectName
        ? await this.audioService.getAudioData(user)
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
}
