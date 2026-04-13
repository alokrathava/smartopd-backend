/**
 * Payment methods supported by SmartOPD
 */
export enum PaymentMethod {
  // India - Primary
  RAZORPAY = 'RAZORPAY',

  // Cash and Cheque
  CASH = 'CASH',
  CHEQUE = 'CHEQUE',

  // Insurance
  INSURANCE = 'INSURANCE',

  // International
  STRIPE = 'STRIPE',

  // Bank Transfer
  BANK_TRANSFER = 'BANK_TRANSFER',

  // Custom/Override
  CUSTOM_OVERRIDE = 'CUSTOM_OVERRIDE',
}

export enum PaymentStatus {
  PENDING = 'PENDING',
  INITIATED = 'INITIATED',
  SUCCESS = 'SUCCESS',
  FAILED = 'FAILED',
  REFUNDED = 'REFUNDED',
  DISPUTED = 'DISPUTED',
}
