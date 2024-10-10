import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { ExpressAdapter } from '@bull-board/express';
import { Queue } from 'bull';
import { getQueueToken } from '@nestjs/bull';
import { createBullBoard } from '@bull-board/api';
import { BullAdapter } from '@bull-board/api/bullAdapter';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  // Swagger Configuration
  const config = new DocumentBuilder()
    .setTitle('Your API')
    .setDescription('API description')
    .setVersion('1.0')
    .build();

    
    
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api', app, document);
  app.enableCors({
    origin: ['http://localhost:4200'], // Replace with your Angular app's URL
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    credentials: true,  // If you are using cookies or authorization headers
  });

  const serverAdapter = new ExpressAdapter();
  serverAdapter.setBasePath('/admin/queues'); // Setting the base path for Bull-Board UI
  
  // Inject the audio queue (you should have already configured this in your audio module)
  const audioQueue = app.get<Queue>(getQueueToken('audio')); // Replace 'audio' with the name of your queue
  
  // Setup Bull-Board to monitor the queue
  createBullBoard({
    queues: [
      new BullAdapter(audioQueue), // Add your queues here (e.g., audioQueue)
    ],
    serverAdapter,
  });

  // Mount the Bull-Board UI at '/admin/queues'
  const expressApp = app.getHttpAdapter().getInstance();
  expressApp.use('/admin/queues', serverAdapter.getRouter());
  await app.listen(3000);
}
bootstrap();
