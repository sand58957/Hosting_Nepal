import { IsString, IsIn } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class AddAddonDto {
  @ApiProperty({
    description: 'Type of add-on to enable',
    enum: ['ipv4', 'ddos', 'backup', 'monitoring', 'windows', 'cpanel', 'plesk'],
  })
  @IsString()
  @IsIn(['ipv4', 'ddos', 'backup', 'monitoring', 'windows', 'cpanel', 'plesk'])
  addonType!: string;
}
