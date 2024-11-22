import { Module } from "@nestjs/common";
import { ChatController } from "./chat.controller";
import { ChatService } from "./chat.service";
import { ConfigModule } from "@nestjs/config";
import { AudioUtils } from "src/audio/audio.utils";
import { TranscriptionEntity } from "src/audio/entity/transcription.entity";
import { ProjectEntity } from "src/audio/entity/project.entity";
import { AudioModule } from "src/audio/audio.module";
import { AzureCosmosDbModule } from "@nestjs/azure-database";
import { TargetGroupEntity } from "src/audio/entity/target.entity";

@Module({
    imports: [AzureCosmosDbModule.forFeature([
        {
            collection:'Projects',
            dto: ProjectEntity
        },
        {
          collection:'Transcription',
          dto:TranscriptionEntity
        }

])
        
        ,ConfigModule.forRoot(),AudioModule], // Add ConfigModule here
    controllers: [ChatController],
    providers:[ChatService],
    exports:[ChatService]
})
export class ChatModule {}
