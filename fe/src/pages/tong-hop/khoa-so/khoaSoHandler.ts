import { CHanlder } from '@/common';
import { BaseStates } from '@/common/c-handler/core/actions/c-state.action';
import './sub-handler';

export interface KhoaSoEvents {}
export interface KhoaSoStates extends BaseStates {}

export class KhoaSoHandler extends CHanlder<KhoaSoEvents, KhoaSoStates> {
  constructor() {
    super('khoa-so-context');
  }
}
