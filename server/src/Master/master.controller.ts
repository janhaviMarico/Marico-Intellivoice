// src/Master/master.controller.ts
import { Body, Controller, Get, Param, Patch, Query } from '@nestjs/common';
import { MasterService, GetAllUsersResponse, GetAllProjectsResponse } from './master.service';
import { UpdateMasterDto } from './update-master.dto';
import { ApiTags } from '@nestjs/swagger';

@ApiTags('Master Management')
@Controller('master')
export class MasterController {
  constructor(private readonly masterService: MasterService) {}

  @Get('all')
  async getAllUsers(): Promise<GetAllUsersResponse> {
    return this.masterService.getAllUsers();
  }

  @Get('project/all')
  async getAllProjects(@Query('userId') userId?:string):Promise<GetAllProjectsResponse>{
    return this.masterService.getAllProjects(userId);
  }

  @Patch(':masterId/update')
  async updateMaster(
    @Param('masterId') masterId: string,
    @Body() updateDto: UpdateMasterDto,
  ) {
    return this.masterService.updateMasterData(masterId, updateDto);
  }
}
