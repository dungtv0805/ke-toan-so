import { useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';

interface PagePermissions {
  canView: boolean;
  canCreate: boolean;
  canEdit: boolean;
  canDelete: boolean;
  canExport: boolean;
}

export function usePagePermission(moduleKey: string): PagePermissions {
  const { hasPermission } = useAuth();

  return useMemo(() => ({
    canView: hasPermission(`${moduleKey}:xem`),
    canCreate: hasPermission(`${moduleKey}:them`),
    canEdit: hasPermission(`${moduleKey}:sua`),
    canDelete: hasPermission(`${moduleKey}:xoa`),
    canExport: hasPermission(`${moduleKey}:xuat`),
  }), [moduleKey, hasPermission]);
}
