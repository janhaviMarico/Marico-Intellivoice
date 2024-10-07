// pdf.service.ts
import { Injectable } from '@nestjs/common';
import * as PDFDocument from 'pdfkit';
import { Response } from 'express';

@Injectable()
export class PdfService {
  generatePDF(res: Response, data: any) {
    const { TGID, summary } = data;
    console.log('data',data)
    console.log('tgId',data.TGId)
    // Create the PDF document
    const doc = new PDFDocument();

    // Set PDF Headers
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename=transcription_${data.TGId}.pdf`,
    );

    // Pipe the document to the response
    doc.pipe(res);

    // Add content to PDF
    doc.fontSize(25).text(`Transcription Summary for TGID: ${data.TGId}`, {
      align: 'center',
    });
    doc.moveDown();
    doc.fontSize(16).text(`Summary: ${summary}`, {
      align: 'left',
    });

    // Finalize the PDF and end the stream
    doc.end();
  }
}