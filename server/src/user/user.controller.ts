import { InjectModel } from '@nestjs/azure-database';
import { Body, Controller, Get, Post } from '@nestjs/common';
import { User } from './user.entity';
import { Container } from '@azure/cosmos';
import { IUserDto } from './user.dto';
import { response } from 'express';
import { UserService } from './user.service';
import { ApiTags } from '@nestjs/swagger';


@ApiTags('User Management')
@Controller('user')
export class UserController {
    constructor(private readonly userService: UserService) {}

    @Get('all')
    async getUsers(){
        return this.userService.getAllUsers();
    }

    @Post('new')
    async create(@Body() payload:IUserDto){
        return this.userService.createUser(payload);
    }  
}


