import { Controller, Get, Post, Put, Delete, Param, Body, NotFoundException } from '@nestjs/common';
import { MasterService } from './master.service';


@Controller('master')
export class MasterController {
    constructor(private readonly masterservice:MasterService) {}
    @Get('all') // GET /users/all
    async getAllUsers() {
        return await this.masterservice.getAllUsers();
    }
 
}


