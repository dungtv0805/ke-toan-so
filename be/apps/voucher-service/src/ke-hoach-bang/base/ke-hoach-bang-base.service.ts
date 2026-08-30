import { BadRequestException, NotFoundException } from '@nestjs/common';
import { MongoRepository, ObjectLiteral } from 'typeorm';
import { ObjectId } from 'mongodb';
import type { BangKeHoachNguon, LoaiKeHoach } from '@app/entities';
import { TenantContextService } from '@app/core';
import { dieuKienLoaiKeHoach } from '../helpers';
import {
  DongBoHachToanKeHoachService,
  type NguonDongKeHoach,
} from '../dong-bo';

/**
 * Phần dùng chung của các bảng kế hoạch chi tiết: phạm vi tenant, lọc theo
 * (năm, loại kế hoạch), đọc cả bảng, tìm và xoá một dòng.
 *
 * Cố ý KHÔNG gói `taoMoi` và `luuHangLoat` vào đây: khoá chống trùng của mỗi
 * bảng là một quy tắc nghiệp vụ khác nhau (sản phẩm / bộ phận+mã vị trí /
 * dòng tiền / bộ phận+mã tài sản / nhóm+mã chỉ tiêu), và một lớp cha cố nhận
 * hết các biến thể đó sẽ khó đọc hơn chính đoạn code nó thay thế.
 */
export abstract class KeHoachBangBaseService<
  T extends ObjectLiteral & { _id: ObjectId },
> {
  protected constructor(
    protected readonly repo: MongoRepository<T>,
    protected readonly tenantContext: TenantContextService,
    protected readonly dongBo: DongBoHachToanKeHoachService,
  ) {}

  /** Tên bảng trong thông báo lỗi, ví dụ "kế hoạch dòng tiền". */
  protected abstract readonly tenBang: string;

  /** Khoá sắp xếp khi đọc — cấp cha trước, cấp con sau. */
  protected abstract readonly thuTuDoc: Record<string, 'ASC' | 'DESC'>;

  /** Bảng này gắn nhãn gì trên dòng hạch toán kế hoạch nó sinh ra. */
  protected abstract readonly nguonLoai: BangKeHoachNguon;

  /** Quy một dòng của bảng về hình mà engine đồng bộ cần. */
  protected abstract moTaNguon(dong: T): NguonDongKeHoach;

  /**
   * Sinh lại dòng hạch toán kế hoạch cho các dòng vừa lưu.
   *
   * Không để lỗi đồng bộ làm hỏng thao tác Lưu: bảng chi tiết mới là nguồn sự
   * thật, còn phần hạch toán sinh ra luôn dựng lại được ở lần lưu sau.
   */
  protected async dongBoSauKhiLuu(dong: T[]): Promise<void> {
    if (dong.length === 0) return;
    try {
      await this.dongBo.dongBo(
        dong.map((d) => this.moTaNguon(d)),
        dong[0].nguoiTaoId as string,
      );
    } catch (error) {
      console.error(`Đồng bộ hạch toán ${this.tenBang} thất bại:`, error);
    }
  }

  protected theoTenant(where: Record<string, unknown>): Record<string, unknown> {
    const tenantId = this.tenantContext.getCurrentTenantId();
    if (tenantId) where.tenantId = tenantId;
    return where;
  }

  /** Phạm vi của một bản kế hoạch: một năm của một loại, trong một tenant. */
  protected phamVi(
    nam: number,
    loaiKeHoach: LoaiKeHoach,
  ): Record<string, unknown> {
    return this.theoTenant({ nam, ...dieuKienLoaiKeHoach(loaiKeHoach) });
  }

  /** Vài chục dòng mỗi năm nên trả hết, không phân trang. */
  async layTheoNam(nam: number, loaiKeHoach: LoaiKeHoach): Promise<T[]> {
    return this.repo.find({
      where: this.phamVi(nam, loaiKeHoach),
      order: this.thuTuDoc as never,
    });
  }

  async xoa(id: string): Promise<void> {
    const dong = await this.timTheoId(id);
    await this.repo.deleteOne({ _id: dong._id });
    // Xoá dòng nguồn thì các bút toán nó sinh ra cũng phải biến mất.
    await this.dongBo.xoaTheoNguon(this.nguonLoai, [id]);
  }

  protected async timTheoId(id: string): Promise<T> {
    if (!ObjectId.isValid(id)) {
      throw new BadRequestException('Mã dòng không hợp lệ');
    }
    const dong = await this.repo.findOne({
      where: this.theoTenant({ _id: new ObjectId(id) }),
    });
    if (!dong) {
      throw new NotFoundException(`Không tìm thấy dòng ${this.tenBang}`);
    }
    return dong;
  }
}
