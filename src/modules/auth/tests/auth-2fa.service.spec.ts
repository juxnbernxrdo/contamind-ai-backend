import { Auth2FAService } from '../auth-2fa.service';

describe('Auth2FAService', () => {
  let service: Auth2FAService;

  beforeEach(() => {
    const mockPrisma = {
      user: {
        findUniqueOrThrow: jest.fn(),
        update: jest.fn(),
      }
    };
    const mockAudit = { log: jest.fn() };
    service = new Auth2FAService(mockPrisma as any, mockAudit as any);
  });

  it('verifyBackupCode() should consume the code after use', async () => {
    const code = 'ABCDE-F1234';
    const hashed = require('crypto').createHash('sha256').update(code).digest('hex');

    (service as any).prisma.user.findUniqueOrThrow.mockResolvedValue({
      id: '1', backupCodes: [hashed]
    });
    (service as any).prisma.user.update.mockResolvedValue({});

    const result = await service.verifyBackupCode('1', code);
    expect(result).toBe(true);
    expect((service as any).prisma.user.update).toHaveBeenCalledWith({
      where: { id: '1' },
      data: { backupCodes: [] } // code consumed
    });
  });

  it('verifyBackupCode() should return false for invalid code', async () => {
    (service as any).prisma.user.findUniqueOrThrow.mockResolvedValue({
      id: '1', backupCodes: []
    });
    const result = await service.verifyBackupCode('1', 'WRONG-CODE');
    expect(result).toBe(false);
  });
});
