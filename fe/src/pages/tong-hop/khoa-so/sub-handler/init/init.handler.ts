import { HandlerDecorator, RegisterHandler } from '@/common';
import { CSubHanlder } from '@/common/c-handler/core/sub-handler.ts/sub-handler';
import { khoaSoService } from '@/services/khoaSoService';
import { loaiChungTuService } from '@/services/loaiChungTuService';
import { nguoiDungService } from '@/services/nguoiDungService';
import './init.event';

@RegisterHandler('khoa-so-context')
export class InitHandler extends CSubHanlder {
  @HandlerDecorator('init')
  async init(): Promise<void> {
    this.setState('loading', true);

    try {
      const [listRes, cauHinhRes, loaiChungTuList, nguoiDungRes] = await Promise.all([
        khoaSoService.getList(),
        khoaSoService.getCauHinh(),
        loaiChungTuService.getAll(),
        nguoiDungService.getAll(),
      ]);

      this.setState('list', listRes.data || []);
      this.setState('cauHinh', cauHinhRes.data);
      this.setState('loaiChungTuList', loaiChungTuList || []);
      this.setState('nguoiDungList', nguoiDungRes.data || []);
    } catch (error) {
      console.error('Init error:', error);
    } finally {
      this.setState('loading', false);
    }
  }
}
