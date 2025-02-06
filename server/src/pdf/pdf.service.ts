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
    const { TGId, summary, projectInfo, targetGroupInfo, chat, sentiment_analysis } = data;
  
    const doc = new PDFDocument({ margin: 50, size: 'A4' });
  
    // Set PDF Headers
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=transcription_${TGId}.pdf`);
  
    doc.pipe(res);
  
    // Title Section with Clean Layout
    if (targetGroupInfo) {
      // Add a blue rectangle for the title background
      doc.fillColor('black')  // Set text color to black
      .fontSize(22)
      .font('Helvetica-Bold')
      .text(`Transcription Report for: ${targetGroupInfo.MaricoProduct}`, { align: 'center' });
      doc.moveDown(2);

  
      // Target Group Information Section
      doc.fillColor('#333333').fontSize(16).font('Helvetica-Bold').text('Target Group Information : ', { underline: true });
      doc.moveDown(0.5);
  
      const rows = [
        [`Project: `, `${projectInfo.ProjName}`],
        [`Country: `, `${targetGroupInfo.Country}`],
        [`State: `, `${targetGroupInfo.State}`],
        [`Competition Products: `, `${targetGroupInfo.CompetetionProduct.join(', ')}`],
        [`Age Group: `, `${targetGroupInfo.AgeGrp}`],
        [`Marico Product: `, `${targetGroupInfo.MaricoProduct}`],
        [`Main Language: `, `${targetGroupInfo.MainLang}`],
      ];
  
      rows.forEach(([title, content]) => {
        doc.fontSize(12).font('Helvetica-Bold').fillColor('#4B9CD3').text(title, { continued: true });
        doc.font('Helvetica').fillColor('black').text(` ${content}`);
        doc.moveDown(0.3);
      });
  
      doc.moveDown(1);
    }
  
    // Summary Section
    if (summary) {
      doc.fillColor('#4B9CD3').fontSize(16).font('Helvetica-Bold').text('Summary :', { underline: true });
      doc.moveDown(0.5);
  
      doc.fillColor('black').fontSize(12).font('Helvetica').text(summary, {
        align: 'justify',
        lineGap: 4
      });
      doc.moveDown(1);
    }
  
    // Chat Section with Subtle Boxed Style
    if (chat && chat.length > 0) {
      doc.rect(50, doc.y, doc.page.width - 100, 25).fill('#F1C40F');
      doc.fillColor('black').fontSize(16).font('Helvetica-Bold')
         .text('Chat Transcript', { align: 'center' });
      doc.moveDown(2);
  
      chat.forEach((message) => {
        doc.fontSize(12).font('Helvetica-Bold').fillColor('#4B9CD3').text(`${message.from}:`, { continued: true });
        doc.font('Helvetica').fillColor('black').text(` ${message.message}`);
        doc.moveDown(0.3);
      });
  
      doc.moveDown(1);
    }
  
    // Sentiment Analysis Section
    if (sentiment_analysis) {
      doc.fillColor('#4B9CD3')
         .fontSize(16)
         .font('Helvetica-Bold')
         .text('Sentiment Analysis : ', { underline: true });
      doc.moveDown(0.5);
    
      // Split the sentiment analysis into lines
      const sentimentLines = sentiment_analysis.split('\n');
    
      sentimentLines.forEach(line => {
        if (line.includes('### Overall Sentiment Analysis:')) {
          doc.fontSize(14).fillColor('#34495E').font('Helvetica-Bold').text(line);  // Dark Gray
        } else if (line.includes('### Comprehensive Sentiment Analysis:')) {
          doc.fontSize(14).fillColor('#1F618D').font('Helvetica-Bold').text(line);  // Navy Blue
        } else if (line.includes('#### Positive Sentiments')) {
          doc.fontSize(12).fillColor('#27AE60').font('Helvetica-Bold').text(line);  // Green
        } else if (line.includes('#### Neutral Sentiments')) {
          doc.fontSize(12).fillColor('#F39C12').font('Helvetica-Bold').text(line);  // Orange
        } else if (line.includes('#### Negative Sentiments')) {
          doc.fontSize(12).fillColor('#E74C3C').font('Helvetica-Bold').text(line);  // Red
        } else {
          doc.fontSize(11).fillColor('black').font('Helvetica').text(line);  // Default text
        }
        doc.moveDown(0.3);  // Add spacing between lines
      });
    
      doc.moveDown(1);
    }
    
  
    // Finalize the PDF
    doc.end();
  }
  
  
}
