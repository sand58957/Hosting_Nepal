import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { BullModule } from '@nestjs/bull';

import { DatabaseModule } from '../../database/database.module';
import { BlogModule } from '../blog/blog.module';
import { StorageModule } from '../storage/storage.module';
import { BLOG_GENERATOR_QUEUE } from './constants';
import { BlogGeneratorService } from './blog-generator.service';
import { BlogGeneratorController } from './blog-generator.controller';
import { BlogGeneratorProcessor } from './blog-generator.processor';
import { BlogGeneratorBootstrap } from './blog-generator.bootstrap';
import { ContentWriterService } from './content-writer.service';
import { GeminiClientService } from './gemini-client.service';
import { ImagePickerService } from './image-picker.service';
import { QualityGateService } from './quality-gate.service';
import { TopicPlannerService } from './topic-planner.service';

@Module({
  imports: [
    ConfigModule,
    DatabaseModule,
    BlogModule,
    StorageModule,
    BullModule.registerQueue({ name: BLOG_GENERATOR_QUEUE }),
  ],
  controllers: [BlogGeneratorController],
  providers: [
    BlogGeneratorService,
    BlogGeneratorProcessor,
    BlogGeneratorBootstrap,
    ContentWriterService,
    GeminiClientService,
    ImagePickerService,
    QualityGateService,
    TopicPlannerService,
  ],
})
export class BlogGeneratorModule {}
