// import { Injectable } from '@nestjs/common';
import * as PDFDocument from 'pdfkit';
import { Response } from 'express';
import { Injectable } from '@nestjs/common';

@Injectable()
export class PdfService {
  generatePDF(res: Response, data: any) {
    const { TGId, summary, chat } = data;

    // Create the PDF document
    const doc = new PDFDocument();

    // Set PDF Headers
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename=transcription_${TGId}.pdf`,
    );

    // Pipe the document to the response
    doc.pipe(res);

    // Add content to PDF (TGId and Title)
    doc.fontSize(25).text(`Transcription Report for TGId: ${TGId}`, {
      align: 'center',
    });
    doc.moveDown();

    // If summary exists, add it to the PDF
    if (summary) {
      doc.fontSize(16).text('Summary:', { underline: true });
      doc.moveDown();
      doc.fontSize(14).text(summary, {
        align: 'left',
      });
      doc.moveDown();
    }

    // If chat exists, add chat messages to the PDF
    if (chat && chat.length > 0) {
      doc.fontSize(16).text('Chat:', { underline: true });
      doc.moveDown();
      chat.forEach((message) => {
        doc.fontSize(12).text(`${message.from}: ${message.message}`);
        doc.moveDown();
      });
    }

    // Finalize the PDF and end the stream
    doc.end();
  }
}
