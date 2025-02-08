// src/user/user.service.ts
import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/azure-database';
import { Container } from '@azure/cosmos';
import { MasterEntity } from './master.entity';
import { ProjectEntity } from 'src/audio/entity/project.entity';
import { TargetGroupEntity } from 'src/audio/entity/target.entity';
import { User } from 'src/user/user.entity';


// Define a response interface
export interface GetAllUsersResponse {
  statusCode: number;
  data: MasterEntity[];
}

export interface GetAllProjectsResponse {
  statusCode: number;
  data: ProjectEntity[];
}

@Injectable()
export class MasterService {
 
  constructor(
  @InjectModel(User) private readonly userContainer: Container,
  @InjectModel(MasterEntity) private readonly masterContainer: Container,
  @InjectModel(ProjectEntity) private readonly ProjectContainer: Container,
  @InjectModel(TargetGroupEntity) private readonly TargetContainer: Container,
) {}

  async getAllUsers(): Promise<GetAllUsersResponse> {
    const querySpec = {
      query: `SELECT * FROM c`,
    };

    const { resources: masters } = await this.masterContainer.items.query(querySpec).fetchAll();

    // Map over the data to transform `country` and `state` into objects with `name` key
    const transformedMasters = masters.map((master) => ({
      ...master,
      //country: master.country.map((countryName) => ({ name: countryName })),
      // state: master.state.map((stateName) => ({ name: stateName })),
      marico_product: master.marico_product.map((marico_productName) => ({ name: marico_productName })),
      competetive_product: master.competetive_product.map((competetive_product) => ({ name: competetive_product })),
    }));

    return {
      statusCode: 200, // Use 200 directly for status code
      data: transformedMasters,
    };
  }
  // async getAllProjects(): Promise<GetAllProjectsResponse> {
  //   const querySpec = {
  //     query: `SELECT * FROM c`,
  //   };

  //   const { resources: Project } = await this.ProjectContainer.items.query(querySpec).fetchAll();

  //   return {
  //     statusCode: 200, // Use 200 directly for status code
  //     data: Project,
  //   };
  // }

  async getAllProjects(userId?: string): Promise<GetAllProjectsResponse> {
    try {
      let projectQuerySpec;
  
      // Case 1: If no userId is provided, fetch all projects
      if (!userId) {
        projectQuerySpec = { query: `SELECT * FROM c` };
      } else {
        // Case 2: If userId is provided, fetch mapped users from userContainer
        const userQuerySpec = {
          query: `SELECT * FROM c WHERE c.userid = @userId`,
          parameters: [{ name: '@userId', value: userId }],
        };
  
        const { resources: userResults } = await this.userContainer.items.query(userQuerySpec).fetchAll();
  
        if (!userResults || userResults.length === 0) {
          throw new Error(`User with userId ${userId} not found.`);
        }
  
        const currentUser = userResults[0];
  
        // Prepare a list of userIds to fetch projects for (current user + mapped users)
        const userIdsToFetch = [currentUser.userid, ...(currentUser.mapUser || [])];
  
        // Fetch projects where UserId matches userId or mapped users
        projectQuerySpec = {
          query: `SELECT * FROM c WHERE ARRAY_CONTAINS(@userIds, c.UserId)`,
          parameters: [{ name: '@userIds', value: userIdsToFetch }],
        };
      }
  
      // Fetch projects based on the query
      const { resources: projects } = await this.ProjectContainer.items.query(projectQuerySpec).fetchAll();
  
      // For each project, fetch the associated target details
      for (const project of projects) {
        const targetQuerySpec = {
          query: `SELECT * FROM c WHERE c.ProjId = @ProjId`,
          parameters: [{ name: '@ProjId', value: project.ProjId }],
        };
  
        const { resources: targetDetails } = await this.TargetContainer.items.query(targetQuerySpec).fetchAll();
        project.targetDetails = targetDetails.length ? targetDetails : [];
      }
  
      // Return projects with associated target details
      return {
        statusCode: 200,
        data: projects,
      };
    } catch (error) {
      console.error('Error fetching projects:', error.message);
      throw new Error('Failed to fetch projects');
    }
  }
  

//update the master data

async updateMasterData(masterId: string, updateDto: { columnName: string; value: string }) {
  const { columnName, value } = updateDto;

  // Fetch the master data by ID
  const querySpec = {
    query: `SELECT * FROM c WHERE c.master_id = @masterId`,
    parameters: [{ name: '@masterId', value: masterId }],
  };

  const { resources } = await this.masterContainer.items.query(querySpec).fetchAll();
  if (resources.length === 0) {
    throw new NotFoundException(`Master data with ID ${masterId} not found.`);
  }
  
  const masterData = resources[0];

  // Check if the column exists
  if (!(columnName in masterData)) {
    throw new BadRequestException(`Column ${columnName} does not exist in master data.`);
  }

  // Update the column
  if (Array.isArray(masterData[columnName])) {
    // Check if value already exists in the array
    if (masterData[columnName].some((item: any) => item.name === value)) {
      throw new BadRequestException(`Value ${value} already exists in ${columnName}.`);
    }
    if(columnName=="marico_product" || columnName=="competetive_product"){
      masterData[columnName].push(value.toUpperCase());
    }
    else{
      masterData[columnName].push({ name: value, code: value.slice(0, 2).toUpperCase() });
    }
 
  } else {
    masterData[columnName] = value;
  }

  // Save the updated master data
  const { resource: updatedMasterData } = await this.masterContainer.item(masterData.id, masterData.master_id).replace(masterData);

  return updatedMasterData;
}
  
}
