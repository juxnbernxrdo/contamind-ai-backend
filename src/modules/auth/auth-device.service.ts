import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { DeviceFingerprintUtil } from './utils/device-fingerprint.util';

@Injectable()
export class AuthDeviceService {
  constructor(
    private readonly prisma: PrismaService,
    private fingerprintUtil: DeviceFingerprintUtil
  ) {}

  async registerOrUpdateDevice(userId: string, context: any) {
    const fingerprint = this.fingerprintUtil.generate(context);
    
    let device = await this.prisma.authDevice.findFirst({
      where: { userId, fingerprint }
    });

    if (!device) {
      device = await this.prisma.authDevice.create({
        data: {
          userId,
          name: context.deviceName || 'Unknown Device',
          deviceType: 'web', // parse from UA
          userAgent: context.userAgent,
          ipAddress: context.ip,
          fingerprint,
        }
      });
    } else {
      device = await this.prisma.authDevice.update({
        where: { id: device.id },
        data: {
          lastActivityAt: new Date(),
          lastActivityIp: context.ip,
        }
      });
    }

    return device;
  }

  async listUserDevices(userId: string) {
    return this.prisma.authDevice.findMany({
      where: { userId },
      orderBy: { lastActivityAt: 'desc' }
    });
  }

  async updateDevice(userId: string, deviceId: string, data: { name?: string; isTrusted?: boolean }) {
    const device = await this.prisma.authDevice.findFirst({ where: { id: deviceId, userId } });
    if (!device) throw new NotFoundException('Device not found');

    const updateData: any = {};
    if (data.name !== undefined) updateData.name = data.name;
    if (data.isTrusted !== undefined) {
      updateData.isTrusted = data.isTrusted;
      updateData.trustedUntil = data.isTrusted ? new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) : null;
    }

    return this.prisma.authDevice.update({ where: { id: deviceId }, data: updateData });
  }

  async revokeDevice(userId: string, deviceId: string) {
    const device = await this.prisma.authDevice.findFirst({ where: { id: deviceId, userId } });
    if (!device) throw new NotFoundException('Device not found');

    // Revocar todas las sesiones del dispositivo
    await this.prisma.authSession.updateMany({
      where: { deviceId, userId },
      data: { revokedAt: new Date(), revokeReason: 'Device revoked by user' }
    });
  }
}
