import { Controller, Get, Post, Put, Delete, Param, Body } from '@nestjs/common';
import { UserService } from './user.service';
import { IUserDto } from './user.dto';


@Controller('users')
export class UserController {
  constructor(private readonly userService: UserService) {}

  // Create a user
  @Post()
  async createUser(@Body() payload: IUserDto): Promise<{ response: number; message: string }> {
    return this.userService.createUser(payload);
  }

}

