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

  // @Get('generate-pdf')
  // async generatePDF(@Res() res: Response, @Query('tgid') tgid: string) {
  //   const data = await this.transcriptionService.getSummaryByTGID(tgid);
  //   if (!data) {
  //     return res.status(404).json({ message: 'No data found for TGID' });
  //   }

  //   this.pdfService.generatePDF(res, data);
  // }
  @Post('chat')
  generateChatPDF(@Res() res: Response, @Body() data: any) {
    this.pdfService.generatePDF(res, data);
  }


  @Get('generate-pdf')
async generatePDF(
  @Res() res: Response,
  @Query('tgid') tgid: string,
  @Query('type') type: string // Add query parameter to specify the type
) {
  if (!tgid || !type) {
    return res.status(400).json({ message: 'TGID and type are required' });
  }

  let data;
  if (type === 'summary') {
    data = await this.transcriptionService.getSummaryByTGID(tgid);
  } else if (type === 'sentimental-analysis') {
    data = await this.transcriptionService.getSentimentalAnalysisByTGID(tgid);
  } else {
    return res.status(400).json({ message: 'Invalid type. Use "summary" or "sentimental-analysis".' });
  }

  if (!data) {
    return res.status(404).json({ message: `No data found for TGID: ${tgid}` });
  }

  this.pdfService.generatePDF(res, data);
}

}
