export interface DecodedToken {
  sub: string; // User ID
  email: string;
  vaiTro: string; // Role
  permissions: string[];
  iat: number;
  exp: number;
}

export interface UserPayload {
  id: string;
  email: string;
  vaiTro: string;
  permissions: string[];
}
