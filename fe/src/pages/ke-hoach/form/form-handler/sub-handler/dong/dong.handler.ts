import { HandlerDecorator, RegisterHandler } from "@/common";
import { CSubHanlder } from "@/common/c-handler/core/sub-handler.ts/sub-handler";
import type {
  KeHoachFormEvents,
  KeHoachFormStates,
} from "../../ke-hoach-form.handler";
import {
  apDungQuyChuan,
  capNhat,
  dongMoi,
  nhanBan,
  type DongKeHoach,
  type QuyChuanGoiY,
} from "../../../lib/keHoachFormRows";
import type { KeHoachFormHeader } from "../init/init.state";
import "./dong.event";

@RegisterHandler("ke-hoach-form")
export class KeHoachFormDongHandler extends CSubHanlder<
  KeHoachFormEvents,
  KeHoachFormStates
> {
  private get list(): DongKeHoach[] {
    return (this.getState("dongList") ?? []) as DongKeHoach[];
  }

  @HandlerDecorator("themDong")
  async themDong(params: { soLuong?: number }): Promise<void> {
    const header = (this.getState("header") ?? {}) as KeHoachFormHeader;
    const them = Array.from({ length: params?.soLuong || 1 }, () =>
      dongMoi(header.ngayMacDinh),
    );
    this.setState("dongList", [...this.list, ...them]);
  }

  @HandlerDecorator("nhanBanDong")
  async nhanBanDong(params: { key: string }): Promise<void> {
    const list = this.list;
    const idx = list.findIndex((d) => d.key === params.key);
    if (idx < 0) return;
    // Bản sao nằm ngay dưới dòng gốc — nhập kế hoạch thường là sửa vài ô rồi đi tiếp.
    this.setState("dongList", [
      ...list.slice(0, idx + 1),
      nhanBan(list[idx]),
      ...list.slice(idx + 1),
    ]);
  }

  @HandlerDecorator("xoaDong")
  async xoaDong(params: { key: string }): Promise<void> {
    this.setState(
      "dongList",
      this.list.filter((d) => d.key !== params.key),
    );
  }

  @HandlerDecorator("suaDong")
  async suaDong(params: {
    key: string;
    field: keyof DongKeHoach;
    value: unknown;
  }): Promise<void> {
    if (params.field === "nghiepVu") {
      const quyChuan = (this.getState("quyChuanList") ?? []) as QuyChuanGoiY[];
      const list = this.list.map((d) =>
        d.key === params.key
          ? apDungQuyChuan(d, params.value as string | undefined, quyChuan)
          : d,
      );
      this.setState("dongList", list);
      return;
    }
    this.setState("dongList", capNhat(this.list, params.key, {
      [params.field]: params.value,
    } as Partial<DongKeHoach>));
  }
}
