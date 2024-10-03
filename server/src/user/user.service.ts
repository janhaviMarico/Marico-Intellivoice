//src/user/user.service.ts
import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/azure-database';
import { Container } from '@azure/cosmos';
import { User } from './user.entity';
import { IUserDto } from './user.dto';

// import { Injectable } from "@azure/cosmos";
// import { InjectModel } from "@nestjs/azure-database";
// import { HttpException, HttpStatus, Injectable } from "@nestjs/common";
// import { IUserDto } from "./user.dto";

// @Injectable()
// export class UserService {
//   constructor(@InjectModel(User) private readonly userContainer: Container) {}

//   // Fetch all users
//   async getAllUsers(): Promise<IUserDto[]> {
//     const sqlQuery = 'SELECT * FROM c';
//     const cosmosResult = await this.userContainer.items.query<User>(sqlQuery).fetchAll();

//     // Map the results to IUserDto format
//     return cosmosResult.resources.map<IUserDto>((value) => ({
//       id: value.id,
//       userid: value.userid,
//       email: value.email,
//       userName: value.userName,
//       access: value.access,
//     }));
//   }

  // Create a new user
  // async createUser(payload: IUserDto): Promise<{ response: number; message: string }> {
  //   const newUser = new User();
  //   newUser.id = '2'; // Ideally, this should be dynamically generated
  //   newUser.userid = payload.userid;
  //   newUser.userName = payload.userName;
  //   newUser.email = payload.email;
  //   newUser.access = payload.access;

  //   Create user in Cosmos DB
  //   await this.userContainer.items.create(newUser);

  //   return {
  //     response: 200,
  //     message: 'Successfully created',
  //   };
  // }
//}


//akanksha code

//create user data

// @Injectable()
// export class UserService {
//   //userService: any;
//   constructor(@InjectModel(User) private readonly userContainer: Container) {}

//   // Create new user
//   async createUser(payload: IUserDto): Promise<{ response: number; message: string ; user?: User;existingUser?: User}> {
//     try {
      
//       // Check if user already exists 
//       const querySpec = {
//         query: 'SELECT * FROM c WHERE c.userid = @userid OR c.email = @Email',
//         parameters: [
//           { name: '@userid', value: payload.userid },
//           { name: '@Email', value: payload.email }
//         ],
//       };
//       const { resources: existingUsers } = await this.userContainer.items.query(querySpec).fetchAll();

//       // If user with the exact data already exists, return a response
//       if (existingUsers.length > 0) {
//         const existingUser = existingUsers[0];
//         return {
//           response: 409,  // HTTP 409 Conflict
//           message: 'User with the same data already exists',
//           existingUser,   // The user already in the database
//         };
//       }

//       const newUser = new User();
//       newUser.userid = payload.userid;
//       newUser.userName = payload.userName;
//       newUser.email = payload.email;
//       newUser.access = payload.access || 'read';  

//       // Create user in database
//       const { resource: createdUser } = await this.userContainer.items.create(newUser);

//       return {
//         response: 200,
//         message: 'User successfully created',
//         user: createdUser,
//       };
     
//     } catch (error) {
//       throw new HttpException(
//         { message: 'Error creating user', error: error.message },
//         HttpStatus.INTERNAL_SERVER_ERROR,
//       );
//     }
//   }
// }




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
}
