import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AzureCosmosDbModule } from '@nestjs/azure-database';
import { UserModule } from './user/user.module';
import { AudioController } from './audio/audio.controller';
import { AudioModule } from './audio/audio.module';
import { ConfigModule } from '@nestjs/config';
import { TranscriptionModule } from './pdf/transcription.module';
import { TranscriptionController } from './pdf/transcription.controller';
import { ChatModule } from './chat/chat.module';
import { ChangeFeedService } from './email/change-feed.service';
//import { ChangeFeedService } from './email/change-feed.service';

@Module({
  imports: [
     // Import ConfigModule to make ConfigService available
     ConfigModule.forRoot({
      isGlobal: true,  // Makes ConfigService available globally in the app
    }),
    AzureCosmosDbModule.forRoot({
    dbName:'marico-gpt',
    endpoint:'https://marico-gpt-db.documents.azure.com:443/',
    key:'A8sHzgvKfrrARuSNHYY3B6nbVzqt8AgVTI7GXfMXXon0t8JUApe8ASy4NE7FrU8VndKv8Jqx82DHACDbHltAZA=='
  }),UserModule, AudioModule,TranscriptionModule,ChatModule],
  controllers: [AppController],
  providers: [AppService,ChangeFeedService],
})
export class AppModule {}
