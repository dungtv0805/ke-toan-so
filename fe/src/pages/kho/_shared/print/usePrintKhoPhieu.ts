import { useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import type { PhieuKho } from '@/types';
import { printKhoPhieu } from './printKhoPhieu';

/** Hook trả về hàm in phiếu kho. Tự động lấy tên công ty từ currentTenant. */
export function usePrintKhoPhieu() {
  const { currentTenant } = useAuth();
  return useCallback(
    (phieu: PhieuKho) => {
      printKhoPhieu(phieu, {
        tenCongTy: currentTenant?.tenantName ?? '',
        diaChiCongTy: '',
      });
    },
    [currentTenant],
  );
}
