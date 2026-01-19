/**
 * Serviço de integração com Google Play Billing - Versão Web
 * Stub que retorna valores padrão para web (compras não disponíveis)
 */

import { Platform } from 'react-native';
import { LICENSE_TYPES } from './proLicense';
import { licensesAPI } from './api';

/**
 * Tipos de licença disponíveis para compra
 */
export const LICENSE_PRODUCTS = {
  [LICENSE_TYPES.MONTH_1]: {
    id: 'pro_1_month',
    price: 'R$ 9,90',
    priceValue: 9.90,
    currency: 'BRL',
    description: 'Licença PRO por 1 mês',
  },
  [LICENSE_TYPES.MONTH_6]: {
    id: 'pro_6_months',
    price: 'R$ 49,90',
    priceValue: 49.90,
    currency: 'BRL',
    description: 'Licença PRO por 6 meses',
  },
  [LICENSE_TYPES.YEAR_1]: {
    id: 'pro_1_year',
    price: 'R$ 89,90',
    priceValue: 89.90,
    currency: 'BRL',
    description: 'Licença PRO por 1 ano',
  },
};

/**
 * Verifica se Google Pay está disponível (sempre false na web)
 */
export const isGooglePayAvailable = () => {
  return false;
};

/**
 * Inicializa o serviço de compras in-app (stub para web)
 */
export const initializePurchases = async () => {
  return { 
    success: false, 
    error: 'Compras in-app não disponíveis na versão web. Use o aplicativo Android.' 
  };
};

/**
 * Finaliza conexão com Google Play (stub para web)
 */
export const endConnection = async () => {
  // Nada a fazer na web
};

/**
 * Verifica compras pendentes (stub para web)
 */
export const checkPendingPurchases = async () => {
  return { success: false, error: 'Não disponível na web' };
};

/**
 * Compra uma licença via Google Pay (stub para web)
 */
export const purchaseLicenseWithGooglePay = async (licenseType) => {
  return {
    success: false,
    error: 'Compras in-app não estão disponíveis na versão web. Por favor, use o aplicativo Android para comprar licenças PRO.',
  };
};
