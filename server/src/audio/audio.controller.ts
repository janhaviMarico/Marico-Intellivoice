import { Body, Controller, Post, UploadedFiles, UseInterceptors, ValidationPipe, HttpException, HttpStatus, Logger, Get, InternalServerErrorException, Query } from '@nestjs/common';
import { AudioService } from './audio.service';
import { FilesInterceptor } from '@nestjs/platform-express';
import { ProjectGroupDTO } from './dto/upload-audio.dto';
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

  @Get('list')
  async getAudioList(@Body('userid') userid?: string) {
    try {
      // Fetch data from service with or without userid
      const audioData = await this.audioService.getAudioData(userid);
      return { data: audioData, message: 'Audio data fetched successfully' };
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
      console.log(tgId,tgName);
      const audioDetails = await this.audioService.getAudioDetails(tgId, tgName);
      return { data: audioDetails, message: 'Audio details fetched successfully' };
    } catch (error) {
      console.error('Error fetching audio details:', error.message);
      throw new InternalServerErrorException('Failed to fetch audio details');
    }
  }

  //trabslation edit
  @Post('edit')
    async editTranscription(@Body() editTranscriptionDto: EditTranscriptionDto) {
        return this.audioService.editTranscription(editTranscriptionDto);
    }
  
}
