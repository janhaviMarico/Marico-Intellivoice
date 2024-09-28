import { Injectable, NestInterceptor, ExecutionContext, CallHandler, BadRequestException } from '@nestjs/common';
import { Observable } from 'rxjs';

@Injectable()
export class ParseJsonInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();

    try {
      if (typeof request.body.Project === 'string') {
        
        request.body.project = JSON.parse(request.body.Project);
      }
      if (typeof request.body.TargetGrp === 'string') {
        
        request.body.TargetGrp = JSON.parse(request.body.TargetGrp);
      }
    } catch (error) {
      throw new BadRequestException('Invalid JSON format');
    }

    return next.handle();
  }
}
