/**
 * Paystack API Client
 * Handles all Paystack API interactions
 */

import axios from 'axios';
import { config } from '../config/env';
import { logger } from '../utils/logger';

const PAYSTACK_BASE_URL = 'https://api.paystack.co';

interface PaystackCustomer {
  id: number;
  customer_code: string;
  email: string;
  first_name: string | null;
  last_name: string | null;
  phone: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

interface PaystackSubscription {
  id: number;
  customer: number;
  plan: number;
  integration: number;
  authorization: number;
  domain: string;
  start: number;
  status: string;
  quantity: number;
  amount: number;
  subscription_code: string;
  email_token: string;
  easy_cron_id: string | null;
  cron_expression: string;
  next_payment_date: string;
  open_invoice: string | null;
  createdAt: string;
  updatedAt: string;
}

interface PaystackPlan {
  id: number;
  name: string;
  plan_code: string;
  description: string | null;
  amount: number;
  interval: string;
  send_invoices: boolean;
  send_sms: boolean;
  currency: string;
  createdAt: string;
  updatedAt: string;
}

interface PaystackTransaction {
  id: number;
  domain: string;
  status: string;
  reference: string;
  amount: number;
  message: string | null;
  gateway_response: string;
  paid_at: string | null;
  created_at: string;
  channel: string;
  currency: string;
  ip_address: string | null;
  metadata: Record<string, unknown>;
  log: unknown;
  fees: number | null;
  fees_split: unknown;
  authorization: {
    authorization_code: string;
    bin: string;
    last4: string;
    exp_month: string;
    exp_year: string;
    channel: string;
    card_type: string;
    bank: string;
    country_code: string;
    brand: string;
    reusable: boolean;
    signature: string;
    account_name: string | null;
  };
  customer: {
    id: number;
    first_name: string | null;
    last_name: string | null;
    email: string;
    customer_code: string;
    phone: string | null;
    metadata: Record<string, unknown>;
    risk_action: string;
  };
  plan: unknown;
  split: unknown;
  order_id: unknown;
  paidAt: string | null;
  createdAt: string;
  requested_amount: number;
  pos_transaction_data: unknown;
  source: unknown;
  fees_breakdown: unknown;
}

class PaystackClient {
  private secretKey: string | null;
  private baseURL: string;

  constructor() {
    this.secretKey = config.paystack.secretKey || null;
    this.baseURL = PAYSTACK_BASE_URL;
  }

  private getHeaders() {
    if (!this.secretKey) {
      throw new Error('Paystack secret key not configured');
    }
    return {
      Authorization: `Bearer ${this.secretKey}`,
      'Content-Type': 'application/json',
    };
  }

  /**
   * Create a customer
   */
  async createCustomer(data: {
    email: string;
    first_name?: string;
    last_name?: string;
    phone?: string;
    metadata?: Record<string, unknown>;
  }): Promise<PaystackCustomer> {
    try {
      const response = await axios.post(
        `${this.baseURL}/customer`,
        data,
        { headers: this.getHeaders() }
      );
      return response.data.data;
    } catch (error) {
      logger.error('Paystack create customer error', { error, data });
      throw error;
    }
  }

  /**
   * Get a customer by email or code
   */
  async getCustomer(identifier: string): Promise<PaystackCustomer | null> {
    try {
      const response = await axios.get(
        `${this.baseURL}/customer/${identifier}`,
        { headers: this.getHeaders() }
      );
      return response.data.data;
    } catch (error: any) {
      if (error.response?.status === 404) {
        return null;
      }
      logger.error('Paystack get customer error', { error, identifier });
      throw error;
    }
  }

  /**
   * Create a subscription
   */
  async createSubscription(data: {
    customer: string; // customer code or email
    plan: string; // plan code
    authorization?: string; // authorization code
    start_date?: string; // ISO date string
  }): Promise<PaystackSubscription> {
    try {
      const response = await axios.post(
        `${this.baseURL}/subscription`,
        data,
        { headers: this.getHeaders() }
      );
      return response.data.data;
    } catch (error) {
      logger.error('Paystack create subscription error', { error, data });
      throw error;
    }
  }

  /**
   * Get a subscription
   */
  async getSubscription(subscriptionCode: string): Promise<PaystackSubscription | null> {
    try {
      const response = await axios.get(
        `${this.baseURL}/subscription/${subscriptionCode}`,
        { headers: this.getHeaders() }
      );
      return response.data.data;
    } catch (error: any) {
      if (error.response?.status === 404) {
        return null;
      }
      logger.error('Paystack get subscription error', { error, subscriptionCode });
      throw error;
    }
  }

  /**
   * Update a subscription
   */
  async updateSubscription(
    subscriptionCode: string,
    data: {
      plan?: string;
      authorization?: string;
    }
  ): Promise<PaystackSubscription> {
    try {
      const response = await axios.put(
        `${this.baseURL}/subscription/${subscriptionCode}`,
        data,
        { headers: this.getHeaders() }
      );
      return response.data.data;
    } catch (error) {
      logger.error('Paystack update subscription error', { error, subscriptionCode, data });
      throw error;
    }
  }

  /**
   * Cancel a subscription
   */
  async cancelSubscription(subscriptionCode: string, token?: string): Promise<PaystackSubscription> {
    try {
      const response = await axios.post(
        `${this.baseURL}/subscription/disable`,
        {
          code: subscriptionCode,
          token: token || '',
        },
        { headers: this.getHeaders() }
      );
      return response.data.data;
    } catch (error) {
      logger.error('Paystack cancel subscription error', { error, subscriptionCode });
      throw error;
    }
  }

  /**
   * Enable a subscription
   */
  async enableSubscription(subscriptionCode: string, token?: string): Promise<PaystackSubscription> {
    try {
      const response = await axios.post(
        `${this.baseURL}/subscription/enable`,
        {
          code: subscriptionCode,
          token: token || '',
        },
        { headers: this.getHeaders() }
      );
      return response.data.data;
    } catch (error) {
      logger.error('Paystack enable subscription error', { error, subscriptionCode });
      throw error;
    }
  }

  /**
   * Get transactions for a customer
   */
  async getTransactions(customerEmail: string, limit = 10): Promise<PaystackTransaction[]> {
    try {
      const response = await axios.get(
        `${this.baseURL}/transaction`,
        {
          params: { customer: customerEmail, perPage: limit },
          headers: this.getHeaders() },
      );
      return response.data.data || [];
    } catch (error) {
      logger.error('Paystack get transactions error', { error, customerEmail });
      return [];
    }
  }

  /**
   * Initialize a transaction (for one-time payments)
   */
  async initializeTransaction(data: {
    email: string;
    amount: number; // in kobo (smallest currency unit)
    reference?: string;
    callback_url?: string;
    plan?: string;
    metadata?: Record<string, unknown>;
  }): Promise<{ authorization_url: string; access_code: string; reference: string }> {
    try {
      const response = await axios.post(
        `${this.baseURL}/transaction/initialize`,
        data,
        { headers: this.getHeaders() }
      );
      return response.data.data;
    } catch (error) {
      logger.error('Paystack initialize transaction error', { error, data });
      throw error;
    }
  }

  /**
   * Verify a transaction
   */
  async verifyTransaction(reference: string): Promise<PaystackTransaction> {
    try {
      const response = await axios.get(
        `${this.baseURL}/transaction/verify/${reference}`,
        { headers: this.getHeaders() }
      );
      return response.data.data;
    } catch (error) {
      logger.error('Paystack verify transaction error', { error, reference });
      throw error;
    }
  }

  /**
   * Get plans
   */
  async getPlans(): Promise<PaystackPlan[]> {
    try {
      const response = await axios.get(
        `${this.baseURL}/plan`,
        { headers: this.getHeaders() }
      );
      return response.data.data || [];
    } catch (error) {
      logger.error('Paystack get plans error', { error });
      return [];
    }
  }
}

export const paystackClient = config.paystack.secretKey ? new PaystackClient() : null;

