// src/audio/entities/target-group.entity.ts
import { CosmosPartitionKey } from '@nestjs/azure-database';

@CosmosPartitionKey('master_id')
export class MasterEntity {
  id: string;    // Unique identifier for the target group
  master_id:string;
  country: NameValuePair[];
  state: NameValuePair[]; 
  marico_product:string[] 
  Role: roleData[];   
  Access:accessData[];
}
class NameValuePair {
  name: string;
}


class roleData {
    code: string;
    name: string;
    access: string[];
}

class accessData{
    name:string;
    code:string;
}