export interface DecodedToken {
  sub: string; // User ID
  email: string;
  tenantId: string; // Current tenant
  vaiTro?: string;        // optional: token Identity không có
  permissions?: string[]; // optional: token Identity không có
  iat: number;
  exp: number;
}

export interface UserPayload {
  id: string;
  email: string;
  tenantId: string;
  vaiTro?: string;
  permissions?: string[];
}

// Temp token payload for 2-step login (no tenantId)
export interface TempTokenPayload {
  id: string;
  email: string;
}

export interface DecodedTempToken {
  sub: string; // User ID
  email: string;
  type: 'temp';
  iat: number;
  exp: number;
}
