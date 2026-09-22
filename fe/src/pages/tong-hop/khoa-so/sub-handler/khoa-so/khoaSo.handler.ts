import { HandlerDecorator, RegisterHandler } from '@/common';
import { CSubHanlder } from '@/common/c-handler/core/sub-handler.ts/sub-handler';
import { khoaSoService, CreateKhoaSoDto, KhoaSoCauHinhDto } from '@/services/khoaSoService';
import { message } from 'antd';
import './khoaSo.event';

@RegisterHandler('khoa-so-context')
export class KhoaSoActionsHandler extends CSubHanlder {
  @HandlerDecorator('createKhoaSo')
  async handleCreate(dto: CreateKhoaSoDto): Promise<void> {
    try {
      await khoaSoService.create(dto);
      message.success('Khóa sổ thành công');
      this.executeEvent('init');
    } catch (error) {
      message.error('Khóa sổ thất bại');
      throw error;
    }
  }

  @HandlerDecorator('deleteKhoaSo')
  async handleDelete(id: string): Promise<void> {
    try {
      await khoaSoService.remove(id);
      message.success('Bỏ khóa sổ thành công');
      this.executeEvent('init');
    } catch (error) {
      message.error('Bỏ khóa sổ thất bại');
      throw error;
    }
  }

  @HandlerDecorator('saveCauHinh')
  async handleSaveCauHinh(dto: KhoaSoCauHinhDto): Promise<void> {
    try {
      const res = await khoaSoService.saveCauHinh(dto);
      this.setState('cauHinh', res.data);
      message.success('Lưu cấu hình thành công');
    } catch (error) {
      message.error('Lưu cấu hình thất bại');
      throw error;
    }
  }
}
