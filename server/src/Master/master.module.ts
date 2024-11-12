
import { AzureCosmosDbModule } from '@nestjs/azure-database';
import { Module } from '@nestjs/common';
import { MasterEntity } from './master.entity';
import { MasterService } from './master.service';
import { MasterController } from './master.controller';

@Module({
    imports:[AzureCosmosDbModule.forFeature([
        {
        collection:'master',
        dto: MasterEntity
        }

])],
    controllers: [MasterController],
    providers:[MasterService]
})
export class MasterModule {}


