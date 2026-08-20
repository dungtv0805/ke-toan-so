/**
 * Kiểm tra trùng khoá cho một lần lưu hàng loạt.
 *
 * Lưu một thể nên phải soi trên TRẠNG THÁI SAU KHI LƯU: vừa so với dòng đã có
 * trong kho, vừa so giữa các dòng trong chính payload. Kiểm từng dòng riêng lẻ
 * sẽ lọt trường hợp hai dòng mới cùng khoá, hoặc sửa dòng A thành trùng dòng B.
 */

export interface DongCoKhoa {
  id: string;
  khoa: string;
}

export interface KiemTraTrungInput {
  /** Toàn bộ dòng đang có trong kho của kỳ đó. */
  hienCo: DongCoKhoa[];
  /** Khoá của các dòng thêm mới. */
  them: string[];
  /** Dòng sửa. `khoa` bỏ trống nghĩa là không đổi khoá. */
  sua: { id: string; khoa?: string }[];
}

export interface KiemTraTrungKetQua {
  /** Khoá bị lặp sau khi lưu — mỗi khoá liệt kê một lần. */
  trung: string[];
  /** Id của dòng cần sửa nhưng không có trong kho. */
  idKhongTonTai: string[];
}

export function kiemTraTrungKhoa(
  input: KiemTraTrungInput,
): KiemTraTrungKetQua {
  const theoId = new Map(input.hienCo.map((d) => [d.id, d.khoa]));
  const idSua = new Set(input.sua.map((s) => s.id));

  const idKhongTonTai = input.sua
    .filter((s) => !theoId.has(s.id))
    .map((s) => s.id);

  const khoaSauKhiLuu: string[] = [];

  // Dòng cũ không bị đụng tới thì giữ nguyên khoá.
  for (const dong of input.hienCo) {
    if (!idSua.has(dong.id)) khoaSauKhiLuu.push(dong.khoa);
  }

  // Dòng sửa lấy khoá mới nếu có, không thì giữ khoá cũ.
  for (const s of input.sua) {
    const khoa = s.khoa ?? theoId.get(s.id);
    if (khoa !== undefined) khoaSauKhiLuu.push(khoa);
  }

  khoaSauKhiLuu.push(...input.them);

  const dem = new Map<string, number>();
  for (const khoa of khoaSauKhiLuu) {
    dem.set(khoa, (dem.get(khoa) ?? 0) + 1);
  }

  const trung = [...dem.entries()]
    .filter(([, n]) => n > 1)
    .map(([khoa]) => khoa);

  return { trung, idKhongTonTai };
}
