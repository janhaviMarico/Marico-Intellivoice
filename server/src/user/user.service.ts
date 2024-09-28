// src/user/user.service.ts
import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/azure-database';
import { Container } from '@azure/cosmos';
import { User } from './user.entity';
import { IUserDto } from './user.dto';

@Injectable()
export class UserService {
  constructor(@InjectModel(User) private readonly userContainer: Container) {}

  // Fetch all users
  async getAllUsers(): Promise<IUserDto[]> {
    const sqlQuery = 'SELECT * FROM c';
    const cosmosResult = await this.userContainer.items.query<User>(sqlQuery).fetchAll();

    // Map the results to IUserDto format
    return cosmosResult.resources.map<IUserDto>((value) => ({
      id: value.id,
      userid: value.userid,
      email: value.email,
      userName: value.userName,
      access: value.access,
    }));
  }

  // Create a new user
  async createUser(payload: IUserDto): Promise<{ response: number; message: string }> {
    const newUser = new User();
    newUser.id = '2'; // Ideally, this should be dynamically generated
    newUser.userid = payload.userid;
    newUser.userName = payload.userName;
    newUser.email = payload.email;
    newUser.access = payload.access;

    // Create user in Cosmos DB
    await this.userContainer.items.create(newUser);

    return {
      response: 200,
      message: 'Successfully created',
    };
  }
}
