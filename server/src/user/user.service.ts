//src/user/user.service.ts
import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/azure-database';
import { Container } from '@azure/cosmos';
import { User } from './user.entity';
import { IUserDto } from './user.dto';

@Injectable()
export class UserService {
  createUser(payload: IUserDto): { response: number; message: string; } | PromiseLike<{ response: number; message: string; }> {
      throw new Error('Method not implemented.');
  }

  constructor(@InjectModel(User) private readonly userContainer: Container) {}

  // Create new user using stored procedure
  async createUserWithSP(payload: IUserDto): Promise<{ response: number; message: string; user?: User; existingUser?: User }> {
    try {
      // Validate payload (optional)
      if (!payload || !payload.userid || !payload.email) {
        throw new HttpException(
          { message: 'Invalid input data', error: 'User ID and Email are required.' },
          HttpStatus.BAD_REQUEST,
        );
      }

      const sprocId = 'createUser'; // Stored procedure ID
      const partitionKey = payload.userid;  // Set partition key based on the user ID

      // Call the stored procedure with the correct partition key
      const { resource: result } = await this.userContainer.scripts.storedProcedure(sprocId).execute(partitionKey, [payload]);

      // Check if result is valid and return the response
      if (result) {
        return {
          response: result.response,
          message: result.message,
          user: result.user,
          existingUser: result.existingUser,
        };
      } else {
        throw new HttpException(
          { message: 'Stored procedure did not return a valid result' },
          HttpStatus.INTERNAL_SERVER_ERROR,
        );
      }

    } catch (error) {
      throw new HttpException(
        { message: 'Error creating user', error: error.message },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
  async getAllUsers(): Promise<User[]> {
    const querySpec = {
      query: `SELECT * FROM c`,
    };

    const { resources: users } = await this.userContainer.items
      .query(querySpec)
      .fetchAll();

    return users;
  }
}
