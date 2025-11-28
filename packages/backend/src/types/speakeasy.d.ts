/**
 * Type declarations for speakeasy module
 */
declare module 'speakeasy' {
  interface GenerateSecretOptions {
    length?: number;
    name?: string;
    issuer?: string;
    symbols?: boolean;
  }

  interface GeneratedSecret {
    ascii: string;
    hex: string;
    base32: string;
    otpauth_url?: string;
  }

  interface TotpVerifyOptions {
    secret: string;
    encoding?: 'ascii' | 'hex' | 'base32';
    token: string;
    window?: number;
    step?: number;
    time?: number;
  }

  interface TotpOptions {
    secret: string;
    encoding?: 'ascii' | 'hex' | 'base32';
    step?: number;
    time?: number;
  }

  interface OtpauthURLOptions {
    secret: string;
    label: string;
    issuer?: string;
    encoding?: 'ascii' | 'hex' | 'base32';
    type?: 'totp' | 'hotp';
    algorithm?: 'sha1' | 'sha256' | 'sha512';
    digits?: number;
    period?: number;
    counter?: number;
  }

  export function generateSecret(options?: GenerateSecretOptions): GeneratedSecret;
  export function otpauthURL(options: OtpauthURLOptions): string;
  
  export namespace totp {
    function verify(options: TotpVerifyOptions): boolean;
  }
  
  export function totp(options: TotpOptions): string;
}
