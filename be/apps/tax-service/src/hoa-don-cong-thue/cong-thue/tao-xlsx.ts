import { taoZipBuffer, type MucZip } from './tao-zip';

/**
 * Ghi file Excel (.xlsx) tối giản — không thêm thư viện.
 *
 * .xlsx thực chất là một file ZIP chứa vài file XML, mà bộ ghi ZIP thì đã có
 * sẵn ở tao-zip.ts. Thêm exceljs chỉ để xuất mấy bảng phẳng là không đáng: gói
 * đó nặng vài chục MB phụ thuộc, mà thêm gói npm vào container này là cái bẫy
 * đã gây sự cố thật (xem skill db-deploy).
 *
 * Ô chữ dùng `inlineStr` thay vì bảng sharedStrings: tốn thêm ít byte nhưng bỏ
 * được cả một file phụ và toàn bộ phần đánh chỉ mục dễ sai.
 */

export interface Sheet {
  /** Tên sheet hiện ở tab dưới cùng Excel. */
  ten: string;
  /** Dòng đầu là tiêu đề cột. Số để nguyên kiểu number thì Excel mới tính được. */
  hang: Array<Array<string | number | null | undefined>>;
}

const thoat = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/** 0 -> A, 25 -> Z, 26 -> AA. */
export function chuCot(i: number): string {
  let s = '';
  for (let n = i + 1; n > 0; n = Math.floor((n - 1) / 26)) {
    s = String.fromCharCode(65 + ((n - 1) % 26)) + s;
  }
  return s;
}

/** Tên sheet của Excel: tối đa 31 ký tự, không được chứa : \ / ? * [ ] */
function tenSheetHopLe(ten: string): string {
  return (ten || 'Sheet1').replace(/[:\\/?*[\]]/g, '-').slice(0, 31);
}

function oExcel(giaTri: string | number | null | undefined, diaChi: string): string {
  if (giaTri === null || giaTri === undefined || giaTri === '') return '';
  if (typeof giaTri === 'number' && Number.isFinite(giaTri)) {
    return `<c r="${diaChi}"><v>${giaTri}</v></c>`;
  }
  return `<c r="${diaChi}" t="inlineStr"><is><t xml:space="preserve">${thoat(String(giaTri))}</t></is></c>`;
}

function sheetXml(s: Sheet): string {
  const hang = s.hang
    .map((cot, i) => {
      const o = cot.map((v, j) => oExcel(v, `${chuCot(j)}${i + 1}`)).join('');
      return `<row r="${i + 1}">${o}</row>`;
    })
    .join('');

  return (
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
    '<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">' +
    `<sheetData>${hang}</sheetData>` +
    '</worksheet>'
  );
}

/** @returns nội dung file .xlsx mở được bằng Excel, LibreOffice, Google Sheets. */
export async function taoXlsx(sheets: Sheet[]): Promise<Buffer> {
  const ds = sheets.length ? sheets : [{ ten: 'Sheet1', hang: [] }];

  const contentTypes =
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
    '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">' +
    '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>' +
    '<Default Extension="xml" ContentType="application/xml"/>' +
    '<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>' +
    ds
      .map(
        (_, i) =>
          `<Override PartName="/xl/worksheets/sheet${i + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`,
      )
      .join('') +
    '</Types>';

  const rels =
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
    '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
    '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>' +
    '</Relationships>';

  const workbook =
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
    '<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" ' +
    'xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets>' +
    ds
      .map(
        (s, i) =>
          `<sheet name="${thoat(tenSheetHopLe(s.ten))}" sheetId="${i + 1}" r:id="rId${i + 1}"/>`,
      )
      .join('') +
    '</sheets></workbook>';

  const workbookRels =
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
    '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
    ds
      .map(
        (_, i) =>
          `<Relationship Id="rId${i + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${i + 1}.xml"/>`,
      )
      .join('') +
    '</Relationships>';

  const muc: MucZip[] = [
    { ten: '[Content_Types].xml', noiDung: Buffer.from(contentTypes, 'utf8') },
    { ten: '_rels/.rels', noiDung: Buffer.from(rels, 'utf8') },
    { ten: 'xl/workbook.xml', noiDung: Buffer.from(workbook, 'utf8') },
    { ten: 'xl/_rels/workbook.xml.rels', noiDung: Buffer.from(workbookRels, 'utf8') },
    ...ds.map((s, i) => ({
      ten: `xl/worksheets/sheet${i + 1}.xml`,
      noiDung: Buffer.from(sheetXml(s), 'utf8'),
    })),
  ];

  return taoZipBuffer(muc);
}
