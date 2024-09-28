import { CosmosPartitionKey } from '@nestjs/azure-database';
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';

@CosmosPartitionKey('userid')
export class User{

    @Prop({ required: true })
    id:string;

    @Prop({ required: true })
    userid:string;

    @Prop({ required: true })
    userName:string;

    @Prop({ required: true })
    email:string;

    @Prop({ required: true })
    access:number[];
}
