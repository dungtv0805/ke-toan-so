import { CreateKhoaSoDto, KhoaSoCauHinhDto } from '@/services/khoaSoService';

declare module '../../khoaSoHandler' {
  interface KhoaSoEvents {
    createKhoaSo: { params: CreateKhoaSoDto; result: void };
    deleteKhoaSo: { params: string; result: void };
    saveCauHinh: { params: KhoaSoCauHinhDto; result: void };
  }
}
