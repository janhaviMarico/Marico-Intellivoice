// transcription.service.ts
import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/azure-database';
import { TranscriptionEntity } from './transcription.entity';
import { Container, SqlQuerySpec } from '@azure/cosmos';
import fs from 'fs'; // Import File System module
import PDFDocument from 'pdfkit'; // Import PDFKit

@Injectable()
export class TranscriptionService {
  constructor(
    @InjectModel(TranscriptionEntity) private readonly transcriptionContainer: Container

  ) {}
  async getSummaryByTGID(tgid: string): Promise<any> {
   // console.log('TGID received:', tgid); // Add this to verify the TGID
    const querySpec = {
      query: 'SELECT c.TGId, c.summary FROM c WHERE c.TGId = @tgid',
      parameters: [
        {
          name: '@tgid',
          value: tgid,
        },
      ],
    };
  
    const { resources: items } = await this.transcriptionContainer.items
      .query(querySpec)
      .fetchAll();
      
   // console.log('Query result:', items); // Log the result to see if any data is returned
    
    return items.length > 0 ? items[0] : null;
  }
  
  // generatePDF(res, data) {
  //   const { TGID, summary } = data;

  //   // Create the PDF document
  //   const doc = new PDFDocument();

  //   // Set PDF Headers
  //   res.setHeader('Content-Type', 'application/pdf');
  //   res.setHeader(
  //     'Content-Disposition',
  //     `attachment; filename=transcription_${TGID}.pdf`,
  //   );

  //   // Pipe the document to the response
  //   doc.pipe(res);

  //   // Add content to PDF
  //   doc.fontSize(25).text(`Transcription Summary for TGID: ${TGID}`, {
  //     align: 'center',
  //   });
  //   doc.moveDown();
  //   doc.fontSize(16).text(`Summary: ${summary}`, {
  //     align: 'left',
  //   });

  //   // Finalize the PDF and end the stream
  //   doc.end();
  // }
}