import { BaseStates } from '@/common/c-handler/core/actions/c-state.action';
import { KhoaSo, KhoaSoCauHinh } from '@/services/khoaSoService';

export interface LoaiChungTuOption {
  ma: string;
  ten: string;
}

export interface NguoiDungOption {
  id: string;
  hoTen: string;
  email: string;
}

export interface KhoaSoPageStates extends BaseStates {
  loading: boolean;
  list: KhoaSo[];
  cauHinh: KhoaSoCauHinh | null;
  loaiChungTuList: LoaiChungTuOption[];
  nguoiDungList: NguoiDungOption[];
  showCauHinhDialog: boolean;
  showKhoaSoDialog: boolean;
}

declare module '../khoaSoHandler' {
  interface KhoaSoStates extends KhoaSoPageStates {}
}
