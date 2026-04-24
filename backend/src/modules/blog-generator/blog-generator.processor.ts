import { Process, Processor } from '@nestjs/bull';
import { Logger } from '@nestjs/common';
import { Job } from 'bull';

import { BLOG_GENERATOR_JOBS, BLOG_GENERATOR_QUEUE } from './constants';
import { BlogGeneratorService } from './blog-generator.service';

@Processor(BLOG_GENERATOR_QUEUE)
export class BlogGeneratorProcessor {
  private readonly logger = new Logger(BlogGeneratorProcessor.name);

  constructor(private readonly generator: BlogGeneratorService) {}

  @Process(BLOG_GENERATOR_JOBS.GENERATE)
  async handleGenerate(job: Job) {
    if (!this.generator.isEnabled()) {
      this.logger.log(`Skipping job ${job.id}: BLOG_AUTOGEN_ENABLED is false`);

      return { status: 'disabled' };
    }

    const outcome = await this.generator.generateOne();

    this.logger.log(`Job ${job.id} -> ${outcome.status}${outcome.slug ? ` (${outcome.slug})` : ''}${outcome.error ? ` err=${outcome.error}` : ''}`);

    if (outcome.status === 'failed') {
      throw new Error(outcome.error || 'generation failed');
    }

    return outcome;
  }
}
