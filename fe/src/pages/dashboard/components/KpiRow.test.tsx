// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, beforeAll } from 'vitest';
import { render, screen } from '@testing-library/react';
import KpiRow, { type KpiItem } from './KpiRow';

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
  w.ResizeObserver =
    w.ResizeObserver ||
    class {
      observe() {}
      unobserve() {}
      disconnect() {}
    };
});

const item = (o: Partial<KpiItem>): KpiItem => ({
  key: 'k',
  label: 'Chỉ tiêu',
  value: 0,
  icon: null,
  ...o,
});

describe('KpiRow', () => {
  it('value = null hiện "—", KHÔNG hiện 0 ₫', () => {
    render(<KpiRow items={[item({ key: 'ebitda', label: 'EBITDA', value: null })]} />);
    expect(screen.getByText('—')).toBeTruthy();
    expect(screen.queryByText(/0\s*₫/)).toBeNull();
  });

  it('value = 0 vẫn hiện số 0 — "bằng không" khác "không có dữ liệu"', () => {
    render(<KpiRow items={[item({ key: 'ebitda', label: 'EBITDA', value: 0 })]} />);
    expect(screen.queryByText('—')).toBeNull();
  });

  it('số thường vẫn định dạng như cũ', () => {
    render(<KpiRow items={[item({ key: 'ty', label: 'Tỷ suất', value: 12.5, format: 'phanTram' })]} />);
    expect(screen.getByText('12,5%')).toBeTruthy();
  });
});
