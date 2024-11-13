// src/user/dto/user.dto.ts
export interface IUserDto {
    id?: string;  // Optional because it will be generated on create
    userid: string;
    userName: string;
    email: string;
    access?: string;  // Optional with default value 'read'
    rolecode:string;
  }
  