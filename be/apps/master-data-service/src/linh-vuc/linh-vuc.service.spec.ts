import { Test } from '@nestjs/testing';
import { ConflictException } from '@nestjs/common';
import { RAW_REPOSITORY_TOKEN_PREFIX } from '@app/database';
import { LinhVucService } from './linh-vuc.service';

function mockRepo(initial: any[] = []) {
  const store = [...initial];
  return {
    store,
    find: jest.fn(async () => store),
    findOne: jest.fn(async ({ where }: any) => {
      if (where.code) return store.find((x) => x.code === where.code) ?? null;
      if (where._id) return store.find((x) => String(x._id) === String(where._id)) ?? null;
      return null;
    }),
    create: jest.fn((x: any) => ({ ...x })),
    save: jest.fn(async (x: any) => { store.push(x); return x; }),
    remove: jest.fn(async (x: any) => { const i = store.indexOf(x); if (i >= 0) store.splice(i, 1); }),
    count: jest.fn(async () => store.length),
  } as any;
}

describe('LinhVucService', () => {
  let service: LinhVucService;
  let linhVucRepo: any;
  let tenantRepo: any;

  beforeEach(async () => {
    linhVucRepo = mockRepo();
    tenantRepo = mockRepo();
    const moduleRef = await Test.createTestingModule({
      providers: [
        LinhVucService,
        { provide: `${RAW_REPOSITORY_TOKEN_PREFIX}LinhVuc`, useValue: linhVucRepo },
        { provide: `${RAW_REPOSITORY_TOKEN_PREFIX}Tenant`, useValue: tenantRepo },
      ],
    }).compile();
    service = moduleRef.get(LinhVucService);
  });

  it('create chặn trùng code', async () => {
    await service.create({ code: 'KHO', name: 'Kho' } as any);
    await expect(service.create({ code: 'KHO', name: 'Kho 2' } as any)).rejects.toBeInstanceOf(ConflictException);
  });

  it('delete chặn lĩnh vực mặc định KE_TOAN', async () => {
    const saved = await service.create({ code: 'KE_TOAN', name: 'Kế toán' } as any);
    await expect(service.delete(String(saved._id))).rejects.toBeInstanceOf(ConflictException);
  });

  it('delete chặn khi còn tenant tham chiếu', async () => {
    const saved = await service.create({ code: 'KHO', name: 'Kho' } as any);
    tenantRepo.store.push({ _id: 't1', modules: ['KE_TOAN', 'KHO'] });
    await expect(service.delete(String(saved._id))).rejects.toBeInstanceOf(ConflictException);
  });
});
