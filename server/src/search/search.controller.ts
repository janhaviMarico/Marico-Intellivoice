import { Body, Controller, Get, HttpException, HttpStatus, Param, Patch, Post, Query, Res } from '@nestjs/common';
import { SearchService } from './search.service';

@Controller('api/documents')
export class SearchController {
  constructor(private readonly searchService: SearchService) {}

  @Get(':id')
  async getDocument(@Param('id') id: string, @Res() res): Promise<any> {
    try {
      const document = await this.searchService.getDocumentById(id);
      return res.status(200).json(document);
    } catch (error) {
      return res.status(error.getStatus()).json({
        message: error.message,
      });
    }
  }

  @Patch(':id')
  async updateMetadata(
    @Param('id') id: string,
    @Body() metadata: Record<string, any>,
    @Res() res
  ): Promise<any> {
    if (!id) {
      throw new HttpException('Document ID is required', HttpStatus.BAD_REQUEST);
    }

    if (!metadata || Object.keys(metadata).length === 0) {
      throw new HttpException('Metadata is required', HttpStatus.BAD_REQUEST);
    }

    try {
      const updatedDocument = await this.searchService.updateDocumentMetadata(id, metadata);
      return res.status(200).json(updatedDocument);
    } catch (error) {
      throw error; // Global exception filter can handle this
    }
  }

}
