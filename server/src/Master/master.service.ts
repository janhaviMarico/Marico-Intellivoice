//src/user/user.service.ts
import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/azure-database';
import { Container } from '@azure/cosmos';
import { MasterEntity } from './master.entity';



@Injectable()
export class MasterService {


  constructor(@InjectModel(MasterEntity) private readonly masterContainer: Container) {}
 
  async getAllUsers(): Promise<MasterEntity[]> {

    const querySpec = {
      query: `SELECT * FROM c`,
    };

    const { resources: masters } = await this.masterContainer.items
      .query(querySpec)
      .fetchAll();

    return masters;
  }
}
