import { IsString, IsEnum } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { NotificationCategory } from '@prisma/client';

export class BroadcastNotificationDto {
  @ApiProperty({ description: 'Notification title' })
  @IsString()
  title!: string;

  @ApiProperty({ description: 'Notification message body' })
  @IsString()
  message!: string;

  @ApiProperty({ enum: NotificationCategory, description: 'Notification category' })
  @IsEnum(NotificationCategory)
  category!: NotificationCategory;
}
