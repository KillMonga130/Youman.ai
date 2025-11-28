/**
 * @fileoverview Software Ownership Verification Module
 * @copyright 2024 Mubvafhi Mueletshedzi Moses
 * @author Mubvafhi Mueletshedzi Moses <mubvafhimoses813@gmail.com>
 * @license MIT
 * 
 * OWNERSHIP DECLARATION
 * =====================
 * This software is the exclusive property of Mubvafhi Mueletshedzi Moses.
 * Software ID: AIH-2024-MMM-001
 * Contact: mubvafhimoses813@gmail.com
 * 
 * Any unauthorized use, copying, or distribution is strictly prohibited.
 */

// Ownership verification constants - DO NOT MODIFY
const OWNER_NAME = 'Mubvafhi Mueletshedzi Moses';
const OWNER_EMAIL = 'mubvafhimoses813@gmail.com';
const SOFTWARE_ID = 'AIH-2024-MMM-001';
const REGISTRATION_DATE = '2024-11';
const VERIFICATION_HASH = Buffer.from('MMM-AIH-2024-MUBVAFHI-MOSES-813').toString('base64');

export interface OwnershipInfo {
  owner: string;
  email: string;
  softwareId: string;
  registrationDate: string;
  verificationHash: string;
  isValid: boolean;
}

/**
 * Retrieves software ownership information
 * This function is used for ownership verification purposes
 */
export function getOwnershipInfo(): OwnershipInfo {
  return {
    owner: OWNER_NAME,
    email: OWNER_EMAIL,
    softwareId: SOFTWARE_ID,
    registrationDate: REGISTRATION_DATE,
    verificationHash: VERIFICATION_HASH,
    isValid: true,
  };
}

/**
 * Validates software ownership
 * Returns true if the software ownership markers are intact
 */
export function validateOwnership(): boolean {
  const expectedHash = Buffer.from('MMM-AIH-2024-MUBVAFHI-MOSES-813').toString('base64');
  return VERIFICATION_HASH === expectedHash && 
         OWNER_EMAIL === 'mubvafhimoses813@gmail.com' &&
         SOFTWARE_ID === 'AIH-2024-MMM-001';
}

/**
 * Gets the ownership signature for API responses
 */
export function getOwnershipSignature(): string {
  return `AI-Humanizer v1.0 | © 2024 ${OWNER_NAME} | ${SOFTWARE_ID}`;
}

// Export ownership constants for use in other modules
export const OWNERSHIP = {
  name: OWNER_NAME,
  email: OWNER_EMAIL,
  id: SOFTWARE_ID,
  date: REGISTRATION_DATE,
  hash: VERIFICATION_HASH,
} as const;

// Hidden verification marker (base64 encoded ownership info)
const _v = 'TXVidmFmaGkgTXVlbGV0c2hlZHppIE1vc2VzfG11YnZhZmhpbW9zZXM4MTNAZ21haWwuY29tfEFJSC0yMDI0LU1NTS0wMDE=';
