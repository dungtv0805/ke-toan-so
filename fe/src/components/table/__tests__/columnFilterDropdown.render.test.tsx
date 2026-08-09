// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, beforeAll, beforeEach } from 'vitest';
import { render, renderHook, screen, fireEvent, waitFor, within } from '@testing-library/react';
import { Table } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { useTableColumnFilters } from '../useTableColumnFilters';
import ColumnFilterDropdown from '../ColumnFilterDropdown';
import { matchAllFilters, type ColumnFilter } from '../columnFilter';
import { readPinnedKeys, savePinnedKeys } from '../columnPin';

beforeAll(() => {
  const w = window as unknown as Record<string, unknown>;
  w.matchMedia =
    w.matchMedia ||
    ((q: string) => ({
      matches: false,
      media: q,
      onchange: null,
      addListener() {},
      removeListener() {},
      addEventListener() {},
      removeEventListener() {},
      dispatchEvent: () => false,
    }));
  // jsdom không có ResizeObserver — antd Table/Dropdown cần
  w.ResizeObserver =
    w.ResizeObserver ||
    class {
      observe() {}
      unobserve() {}
      disconnect() {}
    };
});

beforeEach(() => localStorage.clear());

interface Row {
  key: string;
  ten: string;
}

const DATA: Row[] = [
  { key: '1', ten: 'CÔNG TY G-LIFE' },
  { key: '2', ten: 'Công ty Vinamilk' },
];

const Demo: React.FC = () => {
  const { filterable, matches, hasPinned } = useTableColumnFilters('demo-page');
  const columns: ColumnsType<Row> = [
    filterable<Row>({ title: 'Tên đối tượng', dataIndex: 'ten', key: 'ten', width: 200 }),
    { title: 'Ghi chú', dataIndex: 'ghiChu', key: 'ghiChu', width: 200 },
  ];
  const rows = DATA.filter((r) => matches(r, (row, key) => (key === 'ten' ? row.ten : undefined)));
  return (
    <Table
      columns={columns}
      dataSource={rows}
      pagination={false}
      // Giống trang thật: cột ghim chỉ có tác dụng khi bảng cuộn ngang được.
      scroll={{ x: hasPinned ? 'max-content' : undefined }}
    />
  );
};

interface NumRow {
  key: string;
  ten: string;
  no: number;
}

const NUM_DATA: NumRow[] = [
  { key: '1', ten: 'Tiền mặt', no: 1230000 },
  { key: '2', ten: 'Tiền gửi', no: 0 },
];

const NumDemo: React.FC = () => {
  const { filterable, matches } = useTableColumnFilters('demo-num');
  const columns: ColumnsType<NumRow> = [
    { title: 'Tên', dataIndex: 'ten', key: 'ten', width: 160 },
    filterable<NumRow>(
      { title: 'Nợ', dataIndex: 'no', key: 'no', width: 140 },
      { type: 'number', filterTitle: 'Phát sinh Nợ' },
    ),
  ];
  const rows = NUM_DATA.filter((r) => matches(r, (row, key) => (key === 'no' ? row.no : undefined)));
  return <Table columns={columns} dataSource={rows} pagination={false} />;
};

interface SelRow {
  key: string;
  ma: string;
}

const SEL_DATA: SelRow[] = [
  { key: '1', ma: '131' },
  { key: '2', ma: '331' },
];

/** Cột chọn-từ-danh-mục, KHÔNG có ghim cột (không truyền onTogglePin). */
const SelectDemo: React.FC = () => {
  const [filter, setFilter] = React.useState<ColumnFilter | undefined>(undefined);
  const rows = SEL_DATA.filter((r) =>
    matchAllFilters(r, { ma: filter }, (row, key) => (key === 'ma' ? row.ma : undefined)),
  );
  const columns: ColumnsType<SelRow> = [
    {
      title: 'Tài khoản',
      dataIndex: 'ma',
      key: 'ma',
      width: 200,
      filterDropdown: ({ close }: { close: () => void }) => (
        <ColumnFilterDropdown
          title="Tài khoản"
          kind="select"
          options={[
            { value: '131', label: '131 - Phải thu khách hàng' },
            { value: '331', label: '331 - Phải trả người bán' },
          ]}
          filter={filter}
          onApply={setFilter}
          onClose={close}
        />
      ),
    },
  ];
  return <Table columns={columns} dataSource={rows} pagination={false} />;
};

const openDropdown = () => {
  // antd bọc filterIcon trong span.ant-dropdown-trigger ở header cột
  const trigger = document.querySelector('.ant-dropdown-trigger') as HTMLElement;
  expect(trigger).toBeTruthy();
  fireEvent.click(trigger);
};

describe('lọc theo cột ở header (render thật)', () => {
  it('gõ giá trị + bấm Lọc → bảng chỉ còn dòng khớp; Bỏ lọc → hiện lại đủ', async () => {
    render(<Demo />);
    expect(screen.getByText('Công ty Vinamilk')).toBeTruthy();

    openDropdown();
    fireEvent.change(await screen.findByPlaceholderText('Nhập giá trị lọc'), {
      target: { value: 'g-life' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Lọc' }));

    await waitFor(() => expect(screen.queryByText('Công ty Vinamilk')).toBeNull());
    expect(screen.getByText('CÔNG TY G-LIFE')).toBeTruthy();

    openDropdown();
    fireEvent.click(await screen.findByRole('button', { name: 'Bỏ lọc' }));
    await waitFor(() => expect(screen.getByText('Công ty Vinamilk')).toBeTruthy());
  });

  it('bấm "Cố định cột này" → cột được ghim và lưu lại localStorage', async () => {
    render(<Demo />);

    openDropdown();
    fireEvent.click(await screen.findByRole('button', { name: /Cố định cột này/ }));

    await waitFor(() => expect(readPinnedKeys('demo-page')).toEqual(['ten']));

    // Mở lại: nút đã đổi thành "Bỏ cố định cột"
    openDropdown();
    expect(await screen.findByRole('button', { name: /Bỏ cố định cột/ })).toBeTruthy();
  });

  it('cột đã ghim (đọc từ localStorage) → antd nhận fixed: left', () => {
    savePinnedKeys('demo-page', ['ten']);
    const { result } = renderHook(() => useTableColumnFilters('demo-page'));

    const col = result.current.filterable({ title: 'Tên đối tượng', key: 'ten' });
    expect(col.fixed).toBe('left');
    expect(result.current.hasPinned).toBe(true);

    const other = result.current.filterable({ title: 'Ghi chú', key: 'ghiChu' });
    expect(other.fixed).toBeUndefined();
  });

  it('cột số: chọn "Lớn hơn" + nhập số → chỉ còn dòng khớp', async () => {
    render(<NumDemo />);
    expect(screen.getByText('Tiền gửi')).toBeTruthy();

    openDropdown();
    // Nhãn dùng filterTitle, không phải title cột
    expect(await screen.findByText('Lọc Phát sinh Nợ')).toBeTruthy();

    fireEvent.mouseDown(document.querySelector('.ant-select') as HTMLElement);
    fireEvent.click(await screen.findByTitle('Lớn hơn'));
    fireEvent.change(screen.getByPlaceholderText('Nhập số'), { target: { value: '1.000.000' } });
    fireEvent.click(screen.getByRole('button', { name: 'Lọc' }));

    await waitFor(() => expect(screen.queryByText('Tiền gửi')).toBeNull());
    expect(screen.getByText('Tiền mặt')).toBeTruthy();
  });

  it('cột chọn: mở popover là danh sách bung sẵn, chọn một mục → áp ngay', async () => {
    render(<SelectDemo />);
    expect(screen.getByText('331')).toBeTruthy();

    openDropdown();
    expect(await screen.findByText('Lọc Tài khoản')).toBeTruthy();
    // Không có ghim cột khi component không nhận onTogglePin
    expect(screen.queryByRole('button', { name: /Cố định cột này/ })).toBeNull();

    // Không bấm thêm lần nào vào ô chọn — danh sách phải có sẵn
    fireEvent.click(await screen.findByTitle('131 - Phải thu khách hàng'));

    // Chỉ soi trong thân bảng — danh sách chọn cũng chứa chữ "331".
    const body = () => within(document.querySelector('.ant-table-tbody') as HTMLElement);
    await waitFor(() => expect(body().queryByText('331')).toBeNull());
    expect(body().getByText('131')).toBeTruthy();
  });

  it('cột chọn: chỉ MỘT popover — danh sách nằm luôn trong đó, không bung thêm tầng nữa', async () => {
    render(<SelectDemo />);
    openDropdown();

    const popover = (await screen.findByText('Lọc Tài khoản')).parentElement as HTMLElement;
    // Cả ô tìm kiếm lẫn danh sách đều nằm trong cùng một khung
    expect(within(popover).getByPlaceholderText('Tìm tài khoản...')).toBeTruthy();
    expect(within(popover).getAllByRole('option')).toHaveLength(2);
    // Không còn Select của antd (thứ tự tự bung popup thứ hai)
    expect(document.querySelector('.ant-select-dropdown')).toBeNull();
  });

  it('cột chọn: gõ vào ô tìm kiếm thì danh sách lọc theo, bỏ dấu vẫn khớp', async () => {
    render(<SelectDemo />);
    openDropdown();

    const search = await screen.findByPlaceholderText('Tìm tài khoản...');
    fireEvent.change(search, { target: { value: 'phai tra' } });

    await waitFor(() => expect(screen.getAllByRole('option')).toHaveLength(1));
    expect(screen.getByRole('option').getAttribute('title')).toBe('331 - Phải trả người bán');

    fireEvent.change(search, { target: { value: 'khong co gi' } });
    await waitFor(() => expect(screen.getByText('Không có dữ liệu')).toBeTruthy());
  });

  it('cột chọn: đang lọc thì có mục "(Bỏ lọc)" để trả bảng về đủ dòng', async () => {
    render(<SelectDemo />);

    openDropdown();
    fireEvent.click(await screen.findByTitle('131 - Phải thu khách hàng'));
    const body = () => within(document.querySelector('.ant-table-tbody') as HTMLElement);
    await waitFor(() => expect(body().queryByText('331')).toBeNull());

    openDropdown();
    fireEvent.click(await screen.findByTitle('(Bỏ lọc)'));
    await waitFor(() => expect(body().getByText('331')).toBeTruthy());
  });

  it('cột số: gõ chữ → báo lỗi và không cho bấm Lọc', async () => {
    render(<NumDemo />);

    openDropdown();
    fireEvent.change(await screen.findByPlaceholderText('Nhập số'), { target: { value: 'abc' } });

    expect(screen.getByText('Giá trị không hợp lệ')).toBeTruthy();
    expect((screen.getByRole('button', { name: 'Lọc' }) as HTMLButtonElement).disabled).toBe(true);
  });
});
