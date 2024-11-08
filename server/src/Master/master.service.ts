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

    // Map over the data to transform `country` and `state` into objects with `name` key
    const transformedMasters = masters.map((master) => ({
      ...master,
      country: master.country.map((countryName) => ({ name: countryName })),
      state: master.state.map((stateName) => ({ name: stateName })),
      marico_product: master.marico_product.map((marico_productName) => ({ name: marico_productName })),
    }));

    return {
      statusCode: 200, // Use 200 directly for status code
      data: transformedMasters,
    };
  }
}
