import { RegisterHandler, HandlerDecorator } from '@/common';
import { KhoaSoHandler } from '../../khoaSoHandler';
import { khoaSoService, CreateKhoaSoDto, KhoaSoCauHinhDto } from '@/services/khoaSoService';
import { message } from 'antd';
import './khoaSo.event';

@RegisterHandler(KhoaSoHandler)
export class KhoaSoActionsHandler {
  @HandlerDecorator('createKhoaSo')
  async handleCreate(handler: KhoaSoHandler, dto: CreateKhoaSoDto) {
    try {
      await khoaSoService.create(dto);
      message.success('Khóa sổ thành công');
      handler.executeEvent('init');
    } catch (error) {
      message.error('Khóa sổ thất bại');
      throw error;
    }
  }

  @HandlerDecorator('deleteKhoaSo')
  async handleDelete(handler: KhoaSoHandler, id: string) {
    try {
      await khoaSoService.remove(id);
      message.success('Bỏ khóa sổ thành công');
      handler.executeEvent('init');
    } catch (error) {
      message.error('Bỏ khóa sổ thất bại');
      throw error;
    }
  }

  @HandlerDecorator('saveCauHinh')
  async handleSaveCauHinh(handler: KhoaSoHandler, dto: KhoaSoCauHinhDto) {
    try {
      const res = await khoaSoService.saveCauHinh(dto);
      handler.setState('cauHinh', res.data);
      message.success('Lưu cấu hình thành công');
    } catch (error) {
      message.error('Lưu cấu hình thất bại');
      throw error;
    }
  }
}
