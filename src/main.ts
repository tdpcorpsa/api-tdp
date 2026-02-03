import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  //app.setGlobalPrefix('api/v1');
  app.setGlobalPrefix('/');

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );

  const config = new DocumentBuilder()
  .setTitle('API TDP')
  .setDescription('Integraciones REST')
  .setVersion('1.0')
  .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('docs', app, document);


  await app.listen(process.env.PORT || 3000);

  //await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
