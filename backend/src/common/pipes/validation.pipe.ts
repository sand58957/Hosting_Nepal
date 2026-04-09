import {
  PipeTransform,
  Injectable,
  ArgumentMetadata,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { validate, ValidationError } from 'class-validator';
import { plainToInstance } from 'class-transformer';

@Injectable()
export class CustomValidationPipe implements PipeTransform {
  private readonly logger = new Logger(CustomValidationPipe.name);

  async transform(
    value: unknown,
    { metatype }: ArgumentMetadata,
  ): Promise<unknown> {
    if (!metatype || !this.toValidate(metatype)) {
      return value;
    }

    const object = plainToInstance(metatype, value);
    const errors = await validate(object, {
      whitelist: true,
      forbidNonWhitelisted: true,
      stopAtFirstError: false,
    });

    if (errors.length > 0) {
      const formattedErrors = this.formatErrors(errors);
      this.logger.warn(`Validation failed: ${JSON.stringify(formattedErrors)}`);
      throw new BadRequestException({
        message: 'Validation failed',
        errors: formattedErrors,
      });
    }

    return object;
  }

  private toValidate(metatype: new (...args: unknown[]) => unknown): boolean {
    const types: Array<new (...args: unknown[]) => unknown> = [
      String,
      Boolean,
      Number,
      Array,
      Object,
    ];
    return !types.includes(metatype);
  }

  private formatErrors(
    errors: ValidationError[],
    parentField = '',
  ): Record<string, string[]> {
    const result: Record<string, string[]> = {};

    for (const error of errors) {
      const field = parentField
        ? `${parentField}.${error.property}`
        : error.property;

      if (error.constraints) {
        result[field] = Object.values(error.constraints);
      }

      if (error.children && error.children.length > 0) {
        const childErrors = this.formatErrors(error.children, field);
        Object.assign(result, childErrors);
      }
    }

    return result;
  }
}
