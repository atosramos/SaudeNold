/**
 * Serviço de integração com Google Play Billing
 * Para compra de licenças PRO
 */

import { Platform } from 'react-native';

// Importar react-native-iap apenas em plataformas nativas
let RNIap = null;
if (Platform.OS !== 'web') {
  try {
    RNIap = require('react-native-iap');
  } catch (error) {
    console.warn('react-native-iap não disponível:', error);
  }
}

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

// IDs dos produtos (devem corresponder aos IDs no Google Play Console)
const PRODUCT_IDS = [
  'pro_1_month',
  'pro_6_months',
  'pro_1_year',
];

// Flag para controlar se o serviço foi inicializado
let isInitialized = false;
let availableProducts = [];

/**
 * Inicializa o serviço de compras in-app
 */
export const initializePurchases = async () => {
  if (Platform.OS !== 'android') {
    return { success: false, error: 'Compras in-app disponíveis apenas no Android' };
  }

  if (isInitialized) {
    return { success: true };
  }

  try {
    // Conectar ao Google Play
    await RNIap.initConnection();
    
    // Buscar produtos disponíveis
    const products = await RNIap.getProducts({ skus: PRODUCT_IDS });
    availableProducts = products;
    
    isInitialized = true;
    
    console.log('Compras in-app inicializadas. Produtos disponíveis:', products.length);
    
    return { success: true, products };
  } catch (error) {
    console.error('Erro ao inicializar compras in-app:', error);
    return { 
      success: false, 
      error: `Erro ao inicializar: ${error.message}` 
    };
  }
};

/**
 * Finaliza conexão com Google Play (chamar quando app fechar)
 */
export const endConnection = async () => {
  if (Platform.OS === 'web' || !RNIap) {
    return;
  }
  
  try {
    if (isInitialized) {
      await RNIap.endConnection();
      isInitialized = false;
      availableProducts = [];
    }
  } catch (error) {
    console.error('Erro ao finalizar conexão:', error);
  }
};

/**
 * Verifica se Google Play Billing está disponível
 */
export const isGooglePayAvailable = async () => {
  if (Platform.OS === 'web') {
    return false;
  }
  
  if (Platform.OS !== 'android') {
    return false;
  }
  
  if (!RNIap) {
    return false;
  }
  
  try {
    if (!isInitialized) {
      const initResult = await initializePurchases();
      return initResult.success;
    }
    return true;
  } catch (error) {
    console.error('Erro ao verificar disponibilidade:', error);
    return false;
  }
};

/**
 * Obtém informações dos produtos disponíveis
 */
export const getAvailableProducts = async () => {
  try {
    if (!isInitialized) {
      await initializePurchases();
    }
    return availableProducts;
  } catch (error) {
    console.error('Erro ao obter produtos:', error);
    return [];
  }
};

/**
 * Inicia processo de compra via Google Play Billing
 * @param {string} licenseType - Tipo de licença a comprar
 * @returns {Promise<Object>} Resultado da compra
 */
export const purchaseLicenseWithGooglePay = async (licenseType) => {
  try {
    if (Platform.OS !== 'android') {
      return {
        success: false,
        error: 'Compras in-app disponíveis apenas no Android',
      };
    }
    
    const product = LICENSE_PRODUCTS[licenseType];
    if (!product) {
      return {
        success: false,
        error: 'Tipo de licença inválido',
      };
    }
    
    // Garantir que o serviço está inicializado
    if (!isInitialized) {
      const initResult = await initializePurchases();
      if (!initResult.success) {
        return {
          success: false,
          error: 'Não foi possível inicializar compras in-app',
        };
      }
    }
    
    // Iniciar processo de compra
    console.log('Iniciando compra:', product.id);
    
    const purchase = await RNIap.requestPurchase({
      sku: product.id,
      skuType: RNIap.PurchaseType.INAPP,
    });
    
    console.log('Compra iniciada:', purchase);
    
    // Aguardar confirmação da compra
    const purchaseResult = await RNIap.purchaseUpdatedListener;
    
    // Processar compra quando confirmada
    return new Promise((resolve) => {
      const subscription = purchaseResult.subscribe(async (purchaseResponse) => {
        try {
          if (purchaseResponse.transactionReceipt) {
            // Compra confirmada - enviar para o servidor
            const serverResult = await processPurchaseWithServer(
              purchaseResponse,
              licenseType
            );
            
            if (serverResult.success) {
              // Rastrear compra bem-sucedida
              const price = LICENSE_PRODUCTS[licenseType]?.priceValue || 0;
              trackPurchase(licenseType, price, 'BRL');
              
              // Confirmar compra no Google Play
              await RNIap.finishTransaction({
                purchase: purchaseResponse,
                isConsumable: true,
              });
              
              resolve({
                success: true,
                licenseKey: serverResult.licenseKey,
                purchaseId: purchaseResponse.transactionIdentifier || purchaseResponse.orderId,
              });
            } else {
              resolve({
                success: false,
                error: serverResult.error || 'Erro ao processar compra no servidor',
              });
            }
          } else {
            resolve({
              success: false,
              error: 'Compra não confirmada',
            });
          }
        } catch (error) {
          console.error('Erro ao processar compra:', error);
          resolve({
            success: false,
            error: `Erro ao processar compra: ${error.message}`,
          });
        } finally {
          subscription.remove();
        }
      });
    });
  } catch (error) {
    console.error('Erro ao processar compra com Google Play:', error);
    
    // Tratar erros específicos
    if (error.code === 'E_USER_CANCELLED') {
      return {
        success: false,
        error: 'Compra cancelada pelo usuário',
        cancelled: true,
      };
    }
    
    return {
      success: false,
      error: `Erro ao processar pagamento: ${error.message}`,
    };
  }
};

/**
 * Processa compra no servidor e obtém chave de licença
 */
const processPurchaseWithServer = async (purchase, licenseType) => {
  try {
    const purchaseId = purchase.orderId || purchase.transactionIdentifier || purchase.transactionId;
    const transactionId = purchase.transactionId || purchase.orderId || purchase.transactionIdentifier;
    
    // Mapear productId para licenseType
    const productToLicenseType = {
      'pro_1_month': '1_month',
      'pro_6_months': '6_months',
      'pro_1_year': '1_year',
    };
    
    const mappedLicenseType = productToLicenseType[purchase.productId];
    if (!mappedLicenseType) {
      return {
        success: false,
        error: 'Tipo de produto não reconhecido',
      };
    }
    
    // Mapear preços
    const licensePrices = {
      '1_month': '9.90',
      '6_months': '49.90',
      '1_year': '89.90',
    };
    
    // Enviar dados da compra para o servidor via webhook
    const webhookData = {
      purchase_id: purchaseId,
      transaction_id: transactionId,
      status: 'completed',
      license_type: mappedLicenseType,
      user_id: null, // Pode ser obtido do app se houver sistema de usuários
      amount: licensePrices[mappedLicenseType],
      currency: 'BRL',
    };
    
    console.log('Enviando webhook para servidor:', webhookData);
    
    const response = await licensesAPI.googlePayWebhook(webhookData);
    
    // Aguardar um pouco para o servidor processar
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Verificar status da compra
    if (purchaseId) {
      const statusResponse = await licensesAPI.getPurchaseStatus(purchaseId);
      
      if (statusResponse.data && statusResponse.data.licenseKey) {
        return {
          success: true,
          licenseKey: statusResponse.data.licenseKey,
        };
      }
      
      // Se ainda não tem chave, tentar gerar
      if (statusResponse.data && statusResponse.data.status === 'completed') {
        // Mapear productId para licenseType
        const productToLicenseType = {
          'pro_1_month': '1_month',
          'pro_6_months': '6_months',
          'pro_1_year': '1_year',
        };
        
        const mappedLicenseType = productToLicenseType[purchase.productId];
        if (mappedLicenseType) {
          // Tentar gerar licença
          const generateResponse = await licensesAPI.generate(mappedLicenseType, null, purchaseId);
          if (generateResponse.data && generateResponse.data.licenseKey) {
            return {
              success: true,
              licenseKey: generateResponse.data.licenseKey,
            };
          }
        }
      }
    }
    
    return {
      success: false,
      error: 'Servidor não retornou chave de licença. Tente novamente ou use uma chave manual.',
    };
  } catch (error) {
    console.error('Erro ao processar compra no servidor:', error);
    return {
      success: false,
      error: `Erro no servidor: ${error.response?.data?.detail || error.message}`,
    };
  }
};

/**
 * Verifica compras pendentes e as processa
 */
export const checkPendingPurchases = async () => {
  if (Platform.OS === 'web' || !RNIap) {
    return { success: false, error: 'Não disponível na web' };
  }
  
  try {
    if (Platform.OS !== 'android' || !isInitialized) {
      return { success: false, error: 'Serviço não inicializado' };
    }
    
    // Buscar compras pendentes
    const purchases = await RNIap.getAvailablePurchases();
    
    if (purchases.length === 0) {
      return { success: true, purchases: [] };
    }
    
    console.log('Compras pendentes encontradas:', purchases.length);
    
    // Processar cada compra pendente
    const processedPurchases = [];
    
    for (const purchase of purchases) {
      try {
        // Mapear productId para licenseType
        const licenseType = getLicenseTypeFromProductId(purchase.productId);
        
        if (licenseType) {
          // Processar no servidor
          const serverResult = await processPurchaseWithServer(purchase, licenseType);
          
          if (serverResult.success) {
            // Confirmar compra
            await RNIap.finishTransaction({
              purchase,
              isConsumable: true,
            });
            
            processedPurchases.push({
              purchaseId: purchase.orderId || purchase.transactionIdentifier,
              licenseKey: serverResult.licenseKey,
              licenseType,
            });
          }
        }
      } catch (error) {
        console.error('Erro ao processar compra pendente:', error);
      }
    }
    
    return {
      success: true,
      purchases: processedPurchases,
    };
  } catch (error) {
    console.error('Erro ao verificar compras pendentes:', error);
    return {
      success: false,
      error: `Erro ao verificar compras: ${error.message}`,
    };
  }
};

/**
 * Verifica status de uma compra específica no servidor
 */
export const checkPurchaseStatus = async (purchaseId) => {
  try {
    const response = await licensesAPI.getPurchaseStatus(purchaseId);
    
    if (response.data) {
      return {
        success: true,
        status: response.data.status,
        licenseKey: response.data.licenseKey,
        purchaseDate: response.data.purchaseDate,
      };
    }
    
    return {
      success: false,
      error: 'Não foi possível verificar status da compra',
    };
  } catch (error) {
    console.error('Erro ao verificar status da compra:', error);
    return {
      success: false,
      error: 'Erro ao verificar status: ' + (error.response?.data?.detail || error.message),
    };
  }
};

/**
 * Mapeia productId para licenseType
 */
const getLicenseTypeFromProductId = (productId) => {
  const mapping = {
    'pro_1_month': LICENSE_TYPES.MONTH_1,
    'pro_6_months': LICENSE_TYPES.MONTH_6,
    'pro_1_year': LICENSE_TYPES.YEAR_1,
  };
  return mapping[productId] || null;
};
