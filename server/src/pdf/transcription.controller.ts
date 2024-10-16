import { Body, Controller, Get, Param, Post, Query, Res } from '@nestjs/common';
import { PdfService } from './pdf.service';
import { TranscriptionService } from './transcription.service';
import { Response } from 'express';

@Controller('transcription')
export class TranscriptionController {
  constructor(
    private readonly pdfService: PdfService, // PdfService should handle PDF generation
    private readonly transcriptionService: TranscriptionService, // Handles data retrieval
  ) {}

  @Get('generate-pdf')
  async generatePDF(@Res() res: Response, @Query('tgid') tgid: string) {
    // Fetch data from the transcription service
    const data = await this.transcriptionService.getSummaryByTGID(tgid);

    if (!data) {
      return res.status(404).json({ message: 'No data found for TGID' });
    }

    // Pass the data to pdfService to generate the PDF
    this.pdfService.generatePDF(res, data);
  }
  @Post('chat')
  generateChatPDF(@Res() res: Response, @Body() data: any) {
    this.pdfService.generatePDF(res, data);
  }
}
