import { Injectable, NestMiddleware } from '@nestjs/common';
import { readdirSync, unlinkSync } from 'fs';
import { join } from 'path';

@Injectable()
export class ClearUploadFolderMiddleware implements NestMiddleware {
  uploadDirectory = './uploads';
  
  use(req: any, res: any, next: () => void) {
    const files = readdirSync(this.uploadDirectory);
    for (const file of files) {
      unlinkSync(join(this.uploadDirectory, file));
    }
    next();
  }
}