import { Injectable } from '@nestjs/common';
import PDFDocument from 'pdfkit';
import { Response } from 'express';
import { $Command } from '@aws-sdk/client-s3';
//import { PDFDocument } from 'pdf-lib';


@Injectable()
export class PdfService {
  private capitalizeFirstLetter(text: string): string {
    if (!text) return text;
    return text.charAt(0).toUpperCase() + text.slice(1);
  }

  generatePDF(res: Response, data: any) {
    const { TGId, summary, projectInfo, targetGroupInfo, chat } = data;

    const doc = new PDFDocument();

    // Set PDF Headers
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=transcription_${TGId}.pdf`);

    // Pipe the document to the response
    doc.pipe(res);

    if (targetGroupInfo) {

        const bullet = '• ';

        // Title Section
        doc.fontSize(28).font('Helvetica-Bold').text(`Transcription Report for: ${targetGroupInfo.MaricoProduct}`, { align: 'center' });
        doc.moveDown(2);
        
        doc.fontSize(18).font('Helvetica-Bold').text('Target Group Information:', { underline: true });
        doc.moveDown(0.5);
    
        const rows = [
            [`Project:`, `${projectInfo.ProjName}`],
            [`Country:`, `${targetGroupInfo.Country}`],
            [`State:`, `${targetGroupInfo.State}`],
            [`Competition Products:`, `${targetGroupInfo.CompetetionProduct.join(', ')}`],
            [`Age Group:`, `${targetGroupInfo.AgeGrp}`],
            [`Marico Product:`, `${targetGroupInfo.MaricoProduct}`],
            [`Main Language:`, `${targetGroupInfo.MainLang}`],
        ];
    
        rows.forEach(([title, content]) => {
            doc.fontSize(14).font('Helvetica-Bold').text(`${bullet}${title}`, { continued: true });
            doc.font('Helvetica').text(` ${content}`); // Add space before content
            doc.moveDown(0.5); // Space between lines
        });
    }
    
    

    // Summary Section
    if (summary) {
      doc.moveDown(1); // Add space before summary
      doc.fontSize(18).font('Helvetica-Bold').text('Summary:', { underline: true });
      doc.moveDown(0.5);


      doc.fontSize(14).font('Helvetica').text(summary, {
        //width: availableWidth,
        align: 'left',
      });
      doc.moveDown(1); // Add extra space after the summary
    }

    // Chat Section
    if (chat && chat.length > 0) {

        // Title Section
        doc.fontSize(20).font('Helvetica-Bold').text(`Transcription Report for: Chat`, { align: 'center' });
        doc.moveDown(2);
        
        doc.moveDown(1); // Add space before chat section
        doc.fontSize(16).font('Helvetica-Bold').text('Chat:', { underline: true });
        doc.moveDown(0.5);
        
        chat.forEach((message) => {
            doc.fontSize(14).font('Helvetica-Bold').text(`${message.from}:`, { continued: true });
            doc.font('Helvetica').text(` ${message.message}`); // Normal font for the message
            doc.moveDown(0.5);
        });
    }
    

    // Finalize the PDF
    doc.end();
  }
}
