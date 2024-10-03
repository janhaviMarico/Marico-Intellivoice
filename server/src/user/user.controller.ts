import { Controller, Get, Post, Put, Delete, Param, Body } from '@nestjs/common';
import { UserService } from './user.service';
import { IUserDto } from './user.dto';

@Controller('users')
export class UserController {
    constructor(private readonly userService: UserService) {}

    @Post('create') // This sets the route to /users/create
    async createUser(@Body() payload: IUserDto) {
    return await this.userService.createUserWithSP(payload);
    }
}

