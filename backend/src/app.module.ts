// Root module: Configure and register the application's modules, controllers, and providers.

import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ApiV1Module } from './api-v1/api-v1.module';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { EventsModule } from './events/events.module';

@Module({
  imports: [
    // Load environment variables and make configuration globally available
    ConfigModule.forRoot({
      isGlobal: true,
    }),

    // Register the legacy motorsport events module (unchanged routes)
    EventsModule,

    // Register the versioned /api/v1 API (paths prefixed per controller)
    ApiV1Module,
  ],

  // Register the root controller and its service
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
