// src/user/user.service.ts
import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/azure-database';
import { Container } from '@azure/cosmos';
import { MasterEntity } from './master.entity';


// Define a response interface
export interface GetAllUsersResponse {
  statusCode: number;
  data: MasterEntity[];
}

@Injectable()
export class MasterService {
  constructor(@InjectModel(MasterEntity) private readonly masterContainer: Container) {}

  async getAllUsers(): Promise<GetAllUsersResponse> {
    const querySpec = {
      query: `SELECT * FROM c`,
    };

    const { resources: masters } = await this.masterContainer.items.query(querySpec).fetchAll();

    return {
      statusCode: 200, // Use 200 directly for status code
      data: masters,
    };
  }
}
