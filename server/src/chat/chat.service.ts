import { AzureKeyCredential, SearchClient } from "@azure/search-documents";
import { ConfigService } from "@nestjs/config";
import { Injectable, Logger, InternalServerErrorException } from '@nestjs/common';
import { AzureOpenAI } from "openai";

export interface Document {
  id: string;              // The text content of the document
  embeding_vector: number[]; // The embedding vector (array of numbers)
  metadata: string;        // Metadata such as the document title
}

@Injectable()
export class ChatService {
  private readonly logger = new Logger(ChatService.name);
  private azureSearchClient: SearchClient<Document>;
  private openaiClientChat: AzureOpenAI;

  constructor(private readonly config: ConfigService) {
    try {
      this.azureSearchClient = new SearchClient<Document>(
        this.config.get<string>('VECTOR_STORE_ADDRESS'),
        this.config.get<string>('AZURE_INDEX_NAME'),
        new AzureKeyCredential(this.config.get<string>('VECTOR_STORE_PASSWORD')),
      );

      const apiKey = this.config.get<string>('AZURE_OPENAI_API_KEY');
      const apiVersion = this.config.get<string>('AZURE_OPEN_AI_VERSION');
      const endpoint = this.config.get<string>('AZURE_OPENAI_ENDPOINT');
      const deploymentCh = this.config.get<string>('AZURE_OPENAI_DEPLOYMENT'); // Chat model deployment name

      const optionsCh = {
        endpoint,
        apiKey,
        apiVersion,
        deployment: deploymentCh,
      };
      this.openaiClientChat = new AzureOpenAI(optionsCh);

      this.logger.log('Azure Search and OpenAI clients initialized successfully');
    } catch (error) {
      this.logger.error('Error initializing Azure Search or OpenAI clients', error.stack);
      throw new InternalServerErrorException('Failed to initialize external services');
    }
  }

  /**
   * Get a document by its vector ID from Azure Cognitive Search
   */
  async getTextByVectorId(vectorId: string): Promise<Document | null> {
    try {
      this.logger.log(`Fetching document with vector ID: ${vectorId}`);
      const document = await this.azureSearchClient.getDocument(vectorId);
      return document;
    } catch (error) {
      this.logger.error(`Error fetching document for vector ID: ${vectorId}`, error.stack);
      if (error.statusCode === 404) {
        return null;  // Handle 404 case (document not found)
      }
      throw new InternalServerErrorException('Failed to retrieve document from Azure Search');
    }
  }

  /**
   * Generate an answer to a user's question using OpenAI based on related documents' context
   */
  async generateAnswerFromDocuments(question: string, relatedDocs: Document[]): Promise<string> {
    if (!relatedDocs || relatedDocs.length === 0) {
      this.logger.warn('No related documents provided to generate the answer');
      return 'Sorry, I could not find enough information to answer your question.';
    }

    const context = relatedDocs.map(doc => doc.metadata).join('\n');
    try {
      this.logger.log('Generating answer from OpenAI based on related documents');
      const completionResponse = await this.openaiClientChat.chat.completions.create({
        model: 'gpt-4o',  // Chat model for generating responses
        messages: [
          {
            role: 'system',
            content: 'You are a helpful assistant. Use the provided context to answer the question.',
          },
          {
            role: 'user',
            content: `Context: ${context}\n\nQuestion: ${question}`,
          },
        ],
      });

      const answer = completionResponse.choices[0].message.content;
      this.logger.log('Answer generated successfully');
      return answer;
    } catch (error) {
      this.logger.error('Error generating answer from OpenAI', error.stack);
      throw new InternalServerErrorException('Failed to generate an answer from OpenAI');
    }
  }
}
