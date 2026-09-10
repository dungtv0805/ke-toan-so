// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { timMuc } from './SidebarSearch';
import type { VisibleModule } from '@/hooks/useVisibleMenu';

const modules: VisibleModule[] = [
  {
    module: { id: 'kho', label: 'Kho', railLabel: 'Kho', icon: null },
    leaves: [{ key: '/kho/nhap-kho', label: 'Nhập kho', module: 'kho', status: 'ok' }],
  },
  {
    module: { id: 'thue', label: 'Thuế', railLabel: 'Thuế', icon: null },
    leaves: [{ key: '/thue/tong-hop', label: 'Bảng tổng hợp thuế', module: 'thue', status: 'ok' }],
  },
];

describe('timMuc', () => {
  it('tìm không dấu vẫn ra', () => {
    expect(timMuc(modules, 'nhap kho').map((r) => r.leaf.key)).toEqual(['/kho/nhap-kho']);
  });

  it('không phân biệt hoa thường', () => {
    expect(timMuc(modules, 'THUE')).toHaveLength(1);
  });

  it('kèm tên phân hệ để biết mục nằm ở đâu', () => {
    expect(timMuc(modules, 'tổng hợp')[0].moduleLabel).toBe('Thuế');
  });

  it('gõ kèm tên phân hệ thì lọc đúng mục cùng tên của phân hệ đó', () => {
    const coQuyTrinh: VisibleModule[] = ['kho', 'thue', 'tong-hop'].map((id) => ({
      module: { id: id as 'kho', label: id === 'kho' ? 'Kho' : id === 'thue' ? 'Thuế' : 'Tổng hợp', railLabel: '', icon: null },
      leaves: [{ key: `/${id}/quy-trinh`, label: 'Quy trình', module: id as 'kho', status: 'ok' as const }],
    }));
    expect(timMuc(coQuyTrinh, 'quy trình').map((r) => r.leaf.key)).toHaveLength(3);
    expect(timMuc(coQuyTrinh, 'quy trinh kho').map((r) => r.leaf.key)).toEqual(['/kho/quy-trinh']);
    expect(timMuc(coQuyTrinh, 'thue quy')).toHaveLength(1);
  });

  it('từ khóa rỗng thì không trả gì', () => {
    expect(timMuc(modules, '  ')).toEqual([]);
  });
});
