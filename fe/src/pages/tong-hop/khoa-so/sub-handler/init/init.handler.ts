import { RegisterHandler, HandlerDecorator } from '@/common';
import { KhoaSoHandler } from '../../khoaSoHandler';
import { khoaSoService } from '@/services/khoaSoService';
import { loaiChungTuService } from '@/services/loaiChungTuService';
import { nguoiDungService } from '@/services/nguoiDungService';
import './init.event';

@RegisterHandler(KhoaSoHandler)
export class InitHandler {
  @HandlerDecorator('init')
  async handle(handler: KhoaSoHandler) {
    handler.setState('loading', true);

    try {
      const [listRes, cauHinhRes, loaiChungTuRes, nguoiDungRes] = await Promise.all([
        khoaSoService.getList(),
        khoaSoService.getCauHinh(),
        loaiChungTuService.getAll(),
        nguoiDungService.getAll(),
      ]);

      handler.setState('list', listRes.data || []);
      handler.setState('cauHinh', cauHinhRes.data);
      handler.setState('loaiChungTuList', loaiChungTuRes.data || []);
      handler.setState('nguoiDungList', nguoiDungRes.data || []);
    } catch (error) {
      console.error('Init error:', error);
    } finally {
      handler.setState('loading', false);
    }
  }
}
