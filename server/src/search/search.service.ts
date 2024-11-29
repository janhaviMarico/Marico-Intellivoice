import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import axios from 'axios';
import { firstValueFrom } from 'rxjs';

@Injectable()
export class SearchService {
  private readonly endpoint = 'https://inhouse-ai-search-service.search.windows.net';
  private readonly indexName = 'intelli-voice-js';
  private readonly apiKey = 'gwCjVtUk7IpgpvjMhgM3Dgdt1noxYUIKGKUuNB4me2AzSeCc1Ccf'; // Admin API Key
  logger: any;
  httpService: any;

  async getDocumentById(documentId: string): Promise<any> {
    const url = `${this.endpoint}/indexes/${this.indexName}/docs/${documentId}?api-version=2021-04-30-Preview`;

    try {
      const response = await axios.get(url, {
        headers: {
          'Content-Type': 'application/json',
          'api-key': this.apiKey,
        },
      });
      return response.data;
    } catch (error) {
      if (error.response && error.response.status === 404) {
        throw new HttpException('Document not found', HttpStatus.NOT_FOUND);
      }
      throw new HttpException(
        'Failed to fetch document',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async updateDocumentMetadata(documentId: string, metadata: Record<string, any>): Promise<any> {
    const url = `${this.endpoint}/indexes/${this.indexName}/docs/index?api-version=2021-04-30-Preview`;

    // Prepare the document payload
    const payload = {
      value: [
        {
          '@search.action': 'mergeOrUpload', // Use 'mergeOrUpload' to update specific fields without overwriting the entire document
          id: documentId,
          ...metadata, // Add metadata fields here
        },
      ],
    };

    try {
      const response = await axios.post(url, payload, {
        headers: {
          'Content-Type': 'application/json',
          'api-key': this.apiKey,
        },
      });
      return response.data;
    } catch (error) {
      if (error.response && error.response.status === 404) {
        throw new HttpException('Document not found', HttpStatus.NOT_FOUND);
      }
      throw new HttpException(
        'Failed to update document metadata',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}

