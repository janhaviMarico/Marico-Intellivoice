import { Controller, Get, Post, Put, Delete, Param, Body, NotFoundException } from '@nestjs/common';
import { UserService } from './user.service';
import { IUserDto } from './user.dto';
import { get } from 'http';
import { User } from '@azure/cosmos';

@Controller('users')
export class UserController {
    constructor(private readonly userService: UserService) {}

    @Post('create') // This sets the route to /users/create
    async createUser(@Body() payload: IUserDto) {
    return await this.userService.createUserWithSP(payload);
    }
    @Get('all') // GET /users/all
    async getAllUsers() {
        return await this.userService.getAllUsers();
    }
 
}


