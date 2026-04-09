export interface AuthResponse {
  user: {
    id: string;
    email: string;
    name: string;
    phone: string | null;
    companyName: string | null;
    role: string;
    status: string;
    emailVerified: boolean;
    phoneVerified: boolean;
    twoFactorEnabled: boolean;
    lastLoginAt: Date | null;
    createdAt: Date;
  };
  accessToken: string;
  refreshToken: string;
}

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

export interface TwoFactorSetupResponse {
  secret: string;
  otpauthUrl: string;
  qrCodeDataUrl: string;
}
