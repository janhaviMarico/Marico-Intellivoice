
import { AzureCosmosDbModule } from '@nestjs/azure-database';
import { Module } from '@nestjs/common';
import { MasterEntity } from './master.entity';
import { MasterService } from './master.service';
import { MasterController } from './master.controller';
import { ProjectEntity } from 'src/audio/entity/project.entity';
import { TargetGroupEntity } from 'src/audio/entity/target.entity';
import { UpdateMasterDto } from './update-master.dto';
import { User } from 'src/user/user.entity';

@Module({
    imports:[AzureCosmosDbModule.forFeature([
        {
        collection:'master',
        dto: MasterEntity,
        },
        {
            collection:'Projects',
            dto: ProjectEntity
        },
        {
            collection:'TargetGroups',
            dto: TargetGroupEntity
        },
        {
            collection:'User',
            dto: User
        }

])],
    controllers: [MasterController],
    providers:[MasterService]
})
export class MasterModule {}


