//src/user/user.service.ts
import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/azure-database';
import { Container } from '@azure/cosmos';
import { User } from './user.entity';
import { IUserDto, IUserEditDto } from './user.dto';

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


  async editUser(payload: IUserEditDto): Promise<{ response: number; message: string; updatedUser?: User }> {
    try {
      // Step 1: Validate payload (Ensure required fields are provided)
      if (!payload || !payload.email) {
        throw new HttpException(
          { message: 'Invalid input data', error: 'Email is required for user update.' },
          HttpStatus.BAD_REQUEST,
        );
      }
  
      // Step 2: Fetch the user based on email (assuming email is unique)
      const querySpec = {
        query: 'SELECT * FROM c WHERE c.email = @email',
        parameters: [{ name: '@email', value: payload.email }],
      };
  
      const { resources: existingUsers } = await this.userContainer.items.query(querySpec).fetchAll();
      console.log(existingUsers);
      // Step 3: Handle case when user is not found
      if (!existingUsers || existingUsers.length === 0) {
        throw new HttpException(
          { message: 'User not found', error: `No user found with email ${payload.email}` },
          HttpStatus.NOT_FOUND,
        );
      }
  
      let existingUser = existingUsers[0]; // Assuming email is unique
  
      // Step 4: Update only provided fields (Preserve existing values)
      existingUser.userName = payload.name || existingUser.userName;
      existingUser.rolecode = payload.role || existingUser.rolecode;
      existingUser.mapUser = payload.mapUser && payload.mapUser.length > 0 ? payload.mapUser : existingUser.mapUser;
  
      // Step 5: Upsert the updated user back into CosmosDB
      const { resource: updatedUser } = await this.userContainer.items.upsert(existingUser);
  
      return {
        response: 1, // Success flag
        message: payload.name +' updated successfully',
      };
    } catch (error) {
      console.error('Error updating user:', error.message);
  
      throw new HttpException(
        { message: 'Error updating user', error: error.message },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
  
}
