// src/user/user.service.ts
import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/azure-database';
import { Container } from '@azure/cosmos';
import { MasterEntity } from './master.entity';
import { ProjectEntity } from 'src/audio/entity/project.entity';
import { TargetGroupEntity } from 'src/audio/entity/target.entity';


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
 
  constructor(@InjectModel(MasterEntity) private readonly masterContainer: Container,
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

 async getAllProjects(): Promise<GetAllProjectsResponse> {
  const querySpec = {
    query: `SELECT * FROM c`,
  };

  // Fetch all projects
  const { resources: projects } = await this.ProjectContainer.items.query(querySpec).fetchAll();

  // For each project, fetch the associated target details
  for (const project of projects) {
    const targetQuerySpec = {
      query: `SELECT * FROM c WHERE c.ProjId = @ProjId`,
      parameters: [{ name: '@ProjId', value: project.ProjId }]
    };

    // Log the target query specification for debugging
    //console.log("Target Query Spec:", targetQuerySpec);

    // Execute the target details query for the current project
    const { resources: targetDetails } = await this.TargetContainer.items.query(targetQuerySpec).fetchAll();

    // Log the results fetched from TargetContainer
   // console.log("Target Details for Project", project.id, targetDetails);

    // Attach target details to the current project if data is found
    project.targetDetails = targetDetails.length ? targetDetails : [];
  }

  // Return the projects with their associated target details
  return {
    statusCode: 200,
    data: projects,
  };
}

  
}
