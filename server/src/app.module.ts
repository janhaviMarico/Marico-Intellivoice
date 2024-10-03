import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AzureCosmosDbModule } from '@nestjs/azure-database';
import { UserModule } from './user/user.module';
import { AudioController } from './audio/audio.controller';
import { AudioModule } from './audio/audio.module';
import { ChatModule } from './chat/chat.module';

@Module({
  imports: [AzureCosmosDbModule.forRoot({
    dbName:'marico-gpt',
    endpoint:'https://marico-gpt-db.documents.azure.com:443/',
    key:'A8sHzgvKfrrARuSNHYY3B6nbVzqt8AgVTI7GXfMXXon0t8JUApe8ASy4NE7FrU8VndKv8Jqx82DHACDbHltAZA=='
  }),UserModule, AudioModule,ChatModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
