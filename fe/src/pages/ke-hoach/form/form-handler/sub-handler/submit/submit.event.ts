import { BaseEvents } from "@/common";

export interface KeHoachFormSubmitEvent extends BaseEvents {
  submitForm: { params: { giuLaiForm?: boolean }; result: boolean };
}

declare module "../../ke-hoach-form.handler" {
  interface KeHoachFormEvents extends KeHoachFormSubmitEvent {}
}
