// src/Master/master.controller.ts
import { Controller, Get } from '@nestjs/common';
import { MasterService, GetAllUsersResponse } from './master.service';

@Controller('master')
export class MasterController {
  constructor(private readonly masterService: MasterService) {}

  @Get('all')
  async getAllUsers(): Promise<GetAllUsersResponse> {
    return this.masterService.getAllUsers();
  }
}
