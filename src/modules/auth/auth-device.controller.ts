import { Controller, Get, Patch, Delete, Param, Body, UseGuards, HttpCode, HttpStatus } from '@nestjs/common';
import { JwtGuard } from './guards/jwt.guard';
import { CurrentUser } from './decorators/user.decorator';
import { AuthDeviceService } from './auth-device.service';
import { IsString, IsOptional, IsBoolean } from 'class-validator';

class UpdateDeviceDto {
  @IsString() @IsOptional() name?: string;
  @IsBoolean() @IsOptional() isTrusted?: boolean;
}

@Controller('auth/devices')
@UseGuards(JwtGuard)
export class AuthDeviceController {
  constructor(private readonly deviceService: AuthDeviceService) {}

  @Get()
  async listDevices(@CurrentUser() user: any) {
    return this.deviceService.listUserDevices(user.id);
  }

  @Patch(':deviceId')
  async updateDevice(
    @CurrentUser() user: any,
    @Param('deviceId') deviceId: string,
    @Body() dto: UpdateDeviceDto,
  ) {
    return this.deviceService.updateDevice(user.id, deviceId, dto);
  }

  @Delete(':deviceId')
  @HttpCode(HttpStatus.NO_CONTENT)
  async revokeDevice(@CurrentUser() user: any, @Param('deviceId') deviceId: string) {
    return this.deviceService.revokeDevice(user.id, deviceId);
  }
}
