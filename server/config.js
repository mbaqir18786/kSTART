import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * KickStart 2027 Event Platform Configuration
 * Integrates with AC-Pay (Alumni Cell Pay) for KJ Somaiya College of Engineering.
 */
export const CONFIG = {
  // Service Ports & URLs
  port: Number(process.env.KICKSTART_PORT || 5050),
  publicBaseUrl: (process.env.KICKSTART_PUBLIC_URL || 'http://localhost:5173/kSTART').replace(/\/+$/, ''),

  // AC-Pay Payment Gateway Settings
  acPayApiUrl: (process.env.AC_PAY_API_URL || process.env.BASE_PAYMENT_API_URL || 'http://127.0.0.1:6100').replace(/\/+$/, ''),
  acPayMerchantId: process.env.AC_PAY_MERCHANT_ID || '00000000-0000-0000-0000-000000000001',
  acPayWebhookSecret: process.env.AC_PAY_WEBHOOK_SECRET || process.env.COIN_STORE_WEBHOOK_SECRET || 'youpi_test_webhook_secret_for_coin_store_123',

  // Database Path
  dbPath: process.env.KICKSTART_DB_PATH || path.resolve(__dirname, '../../../AC_Pay/AC-Pay/data/kickstart-registrations.sqlite'),

  // Configurable Ticket Prices (in INR Rupees)
  // These placeholders are calculated and enforced exclusively on the backend.
  ticketPrices: {
    'tech': Number(process.env.KICKSTART_PRICE_TECH || 50),
    'non-tech': Number(process.env.KICKSTART_PRICE_NON_TECH || 40),
    'mock': Number(process.env.KICKSTART_PRICE_MOCK || 30)
  },

  // Ticket Metadata Definitions
  ticketDefinitions: {
    'tech': {
      id: 'tech',
      name: 'Technical Interview',
      desc: 'Technical domain round covering DSA, System Design, and Core Branch concepts with Alumni Tech Leads.',
      tags: 'Core / Tech',
      badge: 'Popular',
      icon: '💻'
    },
    'non-tech': {
      id: 'non-tech',
      name: 'Non-Technical Interview',
      desc: 'Managerial, behavioral, case study, and HR preparation with corporate alumni leaders.',
      tags: 'Consulting / Product / HR',
      badge: 'Essential',
      icon: '📊'
    },
    'mock': {
      id: 'mock',
      name: 'Mock Interview',
      desc: 'Full-simulation trial interview with real-time alumni feedback, scoring rubrics, and resume review.',
      tags: 'Aptitude + Simulation + GD',
      badge: 'Recommended',
      icon: '🎯'
    }
  }
};

