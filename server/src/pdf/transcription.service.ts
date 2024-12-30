// import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/azure-database';
import { Container } from '@azure/cosmos';
import { TranscriptionEntity } from './transcription.entity';
import { Injectable } from '@nestjs/common';
import { ProjectEntity } from 'src/audio/entity/project.entity';
import { TargetGroupEntity } from 'src/audio/entity/target.entity';

@Injectable()
export class TranscriptionService {
  constructor(
    @InjectModel(TranscriptionEntity) private readonly transcriptionContainer: Container,
    @InjectModel(ProjectEntity) private readonly projectContainer: Container,
    @InjectModel(TargetGroupEntity) private readonly targetGroupContainer: Container,
  ) {}

  async getSummaryByTGID(tgid: string): Promise<any> {
    const transcription = await this.fetchTranscription(tgid);
    const projectInfo = await this.fetchProjectInfo(tgid);
    const targetGroupInfo = await this.fetchTargetGroupInfo(tgid);

    return {
      TGId: tgid,
      summary: transcription?.summary,
      projectInfo,
      targetGroupInfo,
    };
  }

  private async fetchTranscription(tgid: string): Promise<any> {
    const querySpec = {
      query: 'SELECT c.TGId, c.summary FROM c WHERE c.TGId = @tgid',
      parameters: [
        {
          name: '@tgid',
          value: tgid,
        },
      ],
    };

    const { resources: items } = await this.transcriptionContainer.items.query(querySpec).fetchAll();
    
    return items.length > 0 ? items[0] : null;
  }

  private async fetchProjectInfo(tgid: string): Promise<any> {
    // Step 1: Fetch ProjId from Target Group container
    const targetGroupQuery = {
      query: 'SELECT c.ProjId FROM c WHERE c.TGId = @tgid',
      parameters: [
        {
          name: '@tgid',
          value: tgid,
        },
      ],
    };
  
    const { resources: targetGroupItems } = await this.targetGroupContainer.items.query(targetGroupQuery).fetchAll();
    
    if (targetGroupItems.length === 0 || !targetGroupItems[0].ProjId) {
      return null; // No project found for this TGId
    }
  
    const projId = targetGroupItems[0].ProjId;
  
    // Step 2: Use ProjId to fetch Project details from Project container
    const projectQuery = {
      query: 'SELECT c.ProjName FROM c WHERE c.ProjId = @projId',
      parameters: [
        {
          name: '@projId',
          value: projId,
        },
      ],
    };
  
    const { resources: projectItems } = await this.projectContainer.items.query(projectQuery).fetchAll();

    return projectItems.length > 0 ? projectItems[0] : null;
  }
  
  private async fetchTargetGroupInfo(tgid: string): Promise<any> {
    const querySpec = {
      query: 'SELECT c.AudioName, c.Country, c.State, c.AgeGrp, c.CompetetionProduct, c.MaricoProduct, c.MainLang FROM c WHERE c.TGId = @tgid',
      parameters: [
        {
          name: '@tgid',
          value: tgid,
        },
      ],
    };

    const { resources: items } = await this.targetGroupContainer.items.query(querySpec).fetchAll();
    
    return items.length > 0 ? items[0] : null;
  }

  async getSentimentalAnalysisByTGID(tgid: string): Promise<any> {
    const transcription = await this.fetchSentimental(tgid);
    const projectInfo = await this.fetchProjectInfo(tgid);
    const targetGroupInfo = await this.fetchTargetGroupInfo(tgid);

    return {
      TGId: tgid,
      sentiment_analysis: transcription?.sentiment_analysis,
      projectInfo,
      targetGroupInfo,
    };
  
}

private async fetchSentimental(tgid: string): Promise<any> {
  const querySpec = {
    query: 'SELECT c.TGId, c.sentiment_analysis FROM c WHERE c.TGId = @tgid',
    parameters: [
      {
        name: '@tgid',
        value: tgid,
      },
    ],
  };

  const { resources: items } = await this.transcriptionContainer.items.query(querySpec).fetchAll();
  
  return items.length > 0 ? items[0] : null;
}

}
