/**
 * 💳 Payment Simulation Module
 * 
 * Simula respuestas de gateway de pagos (Stripe, PayPal, etc.)
 * SOLO PARA DESARROLLO Y TESTING
 * 
 * En producción, integrar con gateway real:
 * - Stripe API
 * - PayPal REST API
 * - MercadoPago
 * - OpenPay, etc.
 */

const crypto = require('crypto');

// Fallback local logger to avoid runtime crash when external logger module is absent.
const logger = {
    info: (...args) => console.log(...args),
    warn: (...args) => console.warn(...args),
    error: (...args) => console.error(...args),
    audit: (...args) => console.log(...args),
};

// Test card numbers
const TEST_CARDS = {
    'success': '4242424242424242',      // ✓ Pago exitoso
    'decline': '4000000000000002',      // ✗ Rechazado
    'insufficient': '4000000000000341', // ✗ Fondos insuficientes
    '3d-secure': '4000002500003155',   // 3D Secure requerido
    'expired': '4000000000000069'       // Tarjeta expirada
};

/**
 * Procesar pago simulado
 */
class PaymentSimulator {

    /**
     * Validar número de tarjeta (Luhn algorithm)
     */
    static validateCardNumber(cardNumber) {
        const digits = cardNumber.replace(/\D/g, '');
        if (digits.length !== 16) return false;

        let sum = 0;
        for (let i = 0; i < digits.length; i++) {
            let digit = parseInt(digits[i]);
            if (i % 2 === 0) {
                digit *= 2;
                if (digit > 9) digit -= 9;
            }
            sum += digit;
        }

        return sum % 10 === 0;
    }

    /**
     * Validar expiración
     */
    static validateExpiry(month, year) {
        const now = new Date();
        const expiry = new Date(year, month, 0); // Último día del mes
        return expiry > now;
    }

    /**
     * Validar CVV (3-4 dígitos)
     */
    static validateCVV(cvv) {
        return /^\d{3,4}$/.test(cvv);
    }

    /**
     * Generar Transaction ID
     */
    static generateTransactionId() {
        return `TXN_${Date.now()}_${crypto.randomBytes(4).toString('hex').toUpperCase()}`;
    }

    /**
     * Procesar pago
     * 
     * @param {Object} paymentData - Datos del pago
     * @param {string} paymentData.cardNumber - Número de tarjeta
     * @param {number} paymentData.amount - Monto en centavos (ej: 5000 = $50.00)
     * @param {string} paymentData.currency - Moneda (USD, MXN, etc.)
     * @param {string} paymentData.cardholderName - Nombre
     * @param {string} paymentData.email - Email del cliente
     * @param {string} paymentData.orderId - ID del pedido
     * @param {string} paymentData.description - Descripción del pago
     * 
     * @returns {Object} Resultado del pago
     */
    static async processPayment(paymentData) {
        const txnId = this.generateTransactionId();
        const timestamp = new Date();

        // Logging inicial
        logger.info('PAYMENT_ATTEMPT', {
            transactionId: txnId,
            orderId: paymentData.orderId,
            amount: paymentData.amount,
            currency: paymentData.currency,
            cardLast4: paymentData.cardNumber.slice(-4),
            email: paymentData.email
        });

        try {
            // 1. VALIDACIONES BÁSICAS
            // ========================

            // Validar monto
            if (!paymentData.amount || paymentData.amount <= 0) {
                logger.warn('PAYMENT_INVALID_AMOUNT', {
                    amount: paymentData.amount,
                    txnId
                });
                return {
                    success: false,
                    error: 'Monto inválido',
                    code: 'INVALID_AMOUNT',
                    transactionId: txnId
                };
            }

            // Validar tarjeta
            if (!this.validateCardNumber(paymentData.cardNumber)) {
                logger.warn('PAYMENT_INVALID_CARD', { txnId });
                return {
                    success: false,
                    error: 'Número de tarjeta inválido',
                    code: 'INVALID_CARD',
                    transactionId: txnId
                };
            }

            // Validar expiración
            if (!this.validateExpiry(paymentData.expMonth, paymentData.expYear)) {
                logger.warn('PAYMENT_EXPIRED_CARD', { txnId });
                return {
                    success: false,
                    error: 'Tarjeta expirada',
                    code: 'EXPIRED_CARD',
                    transactionId: txnId
                };
            }

            // Validar CVV
            if (!this.validateCVV(paymentData.cvv)) {
                logger.warn('PAYMENT_INVALID_CVV', { txnId });
                return {
                    success: false,
                    error: 'CVV inválido',
                    code: 'INVALID_CVV',
                    transactionId: txnId
                };
            }

            // 2. SIMULACIÓN DE RESULTADO
            // ===========================

            const cardNumberPlain = paymentData.cardNumber;
            let result;

            if (cardNumberPlain === TEST_CARDS.success) {
                result = this._successfulPayment(paymentData, txnId, timestamp);
            }
            else if (cardNumberPlain === TEST_CARDS.decline) {
                result = this._declinedPayment(paymentData, txnId, 'Tarjeta rechazada por banco');
            }
            else if (cardNumberPlain === TEST_CARDS.insufficient) {
                result = this._declinedPayment(paymentData, txnId, 'Fondos insuficientes');
            }
            else if (cardNumberPlain === TEST_CARDS.expired) {
                result = this._declinedPayment(paymentData, txnId, 'Tarjeta expirada');
            }
            else if (cardNumberPlain === TEST_CARDS['3d-secure']) {
                result = this._3dSecureRequired(paymentData, txnId);
            }
            else {
                // Cualquier otra tarjeta = éxito (para testing)
                result = this._successfulPayment(paymentData, txnId, timestamp);
            }

            // 3. LOGGING
            // ==========

            if (result.success) {
                logger.audit('PAYMENT_SUCCESS', {
                    transactionId: txnId,
                    orderId: paymentData.orderId,
                    amount: paymentData.amount,
                    currency: paymentData.currency,
                    email: paymentData.email,
                    timestamp: timestamp.toISOString()
                });
            } else {
                logger.warn('PAYMENT_FAILED', {
                    transactionId: txnId,
                    orderId: paymentData.orderId,
                    reason: result.error,
                    code: result.code,
                    email: paymentData.email
                });
            }

            return result;

        } catch (error) {
            logger.error('PAYMENT_EXCEPTION', {
                transactionId: txnId,
                error: error.message,
                stack: error.stack
            });

            return {
                success: false,
                error: 'Error al procesar pago. Intenta de nuevo.',
                code: 'PROCESSING_ERROR',
                transactionId: txnId
            };
        }
    }

    /**
     * Pago exitoso
     */
    static _successfulPayment(paymentData, txnId, timestamp) {
        return {
            success: true,
            transactionId: txnId,
            status: 'completed',
            amount: paymentData.amount,
            currency: paymentData.currency,
            cardLast4: paymentData.cardNumber.slice(-4),
            timestamp: timestamp.toISOString(),
            message: 'Pago procesado exitosamente',

            // Info para recubo si es necesario
            refundableUntil: new Date(timestamp.getTime() + 90 * 24 * 60 * 60 * 1000).toISOString(), // 90 días

            // Webhook que el frontend puede usar para confirmar
            webhookUrl: `/api/v1/payment/webhook/${txnId}`
        };
    }

    /**
     * Pago rechazado
     */
    static _declinedPayment(paymentData, txnId, reason) {
        return {
            success: false,
            transactionId: txnId,
            status: 'declined',
            error: reason,
            code: 'PAYMENT_DECLINED',
            cardLast4: paymentData.cardNumber.slice(-4),
            timestamp: new Date().toISOString(),

            // Sugerencias
            attempts: 1,
            maxAttempts: 3,
            message: `${reason}. Verifica tus datos e intenta con otra tarjeta.`
        };
    }

    /**
     * 3D Secure requerido
     */
    static _3dSecureRequired(paymentData, txnId) {
        return {
            success: false,
            transactionId: txnId,
            status: 'pending_3d_secure',
            error: 'Verificación 3D Secure requerida',
            code: 'REQUIRES_3D_SECURE',

            // URL para redirigir a verificación
            verificationUrl: `/api/v1/payment/3d-secure/${txnId}`,

            // Token temporal
            temporaryToken: crypto.randomBytes(16).toString('hex'),

            message: 'Se requiere autenticación adicional. Redirigiendo...'
        };
    }

    /**
     * Obtener estado de transacción
     */
    static async getTransactionStatus(transactionId) {
        logger.info('TRANSACTION_STATUS_CHECK', { transactionId });

        // En producción, consultar a gateway real
        // Por ahora, simular basado en ID

        if (!transactionId || !transactionId.startsWith('TXN_')) {
            return { error: 'Transaction ID inválido' };
        }

        // Simular: transacciones recientes exitosas
        return {
            transactionId,
            status: 'completed',
            timestamp: new Date().toISOString()
        };
    }

    /**
     * Reembolso
     */
    static async refundPayment(transactionId, amount) {
        const refundId = `REFUND_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;

        logger.audit('REFUND_PROCESSED', {
            refundId,
            originalTransactionId: transactionId,
            amount,
            timestamp: new Date().toISOString()
        });

        return {
            success: true,
            refundId,
            originalTransactionId: transactionId,
            amount,
            status: 'completed',
            timestamp: new Date().toISOString()
        };
    }
}

/**
 * Express Route Handler
 */
const paymentRoutes = (app) => {

    /**
     * POST /api/v1/payment/simulate
     * Procesar pago simulado
     * 
     * Body:
     * {
     *   "cardNumber": "4242424242424242",
     *   "expMonth": 12,
     *   "expYear": 2025,
     *   "cvv": "123",
     *   "cardholderName": "Juan Perez",
     *   "email": "juan@example.com",
     *   "amount": 10000,  // centavos ($100.00)
     *   "currency": "USD",
     *   "orderId": "ORD_123456",
     *   "description": "Compra en ElRinconAzul"
     * }
     */
    app.post('/api/v1/payment/simulate', async (req, res) => {
        const { cardNumber, expMonth, expYear, cvv, cardholderName, email, amount, currency, orderId, description } = req.body;

        // Validar entrada
        if (!cardNumber || !amount || !email || !orderId) {
            return res.status(400).json({
                error: 'Campos requeridos: cardNumber, amount, email, orderId'
            });
        }

        const result = await PaymentSimulator.processPayment({
            cardNumber,
            expMonth,
            expYear,
            cvv,
            cardholderName,
            email,
            amount,
            currency: currency || 'USD',
            orderId,
            description: description || 'Payment'
        });

        // HTTP status basado en resultado
        const statusCode = result.success ? 200 : 402; // 402 Payment Required

        res.status(statusCode).json(result);
    });

    /**
     * GET /api/v1/payment/transaction/:transactionId
     * Obtener estado de transacción
     */
    app.get('/api/v1/payment/transaction/:transactionId', async (req, res) => {
        const { transactionId } = req.params;

        const result = await PaymentSimulator.getTransactionStatus(transactionId);
        res.json(result);
    });

    /**
     * POST /api/v1/payment/refund
     * Procesar reembolso
     * 
     * Body:
     * {
     *   "transactionId": "TXN_...",
     *   "amount": 10000  // centavos (opcional, si es null reembolso completo)
     * }
     */
    app.post('/api/v1/payment/refund', async (req, res) => {
        const { transactionId, amount } = req.body;

        if (!transactionId) {
            return res.status(400).json({
                error: 'transactionId requerido'
            });
        }

        const result = await PaymentSimulator.refundPayment(transactionId, amount);
        res.json(result);
    });

    /**
     * GET /api/v1/payment/test-cards
     * Lista de tarjetas de prueba (solo para desarrollo)
     */
    app.get('/api/v1/payment/test-cards', (req, res) => {
        if (process.env.NODE_ENV === 'production') {
            return res.status(403).json({ error: 'Not available in production' });
        }

        res.json({
            message: 'Test Card Numbers (Development Only)',
            cards: {
                'success': {
                    number: TEST_CARDS.success,
                    description: 'Pago exitoso',
                    expiry: '12/25',
                    cvv: '123'
                },
                'decline': {
                    number: TEST_CARDS.decline,
                    description: 'Rechazado por banco',
                    expiry: '12/25',
                    cvv: '123'
                },
                'insufficient': {
                    number: TEST_CARDS.insufficient,
                    description: 'Fondos insuficientes',
                    expiry: '12/25',
                    cvv: '123'
                },
                'expired': {
                    number: TEST_CARDS.expired,
                    description: 'Tarjeta expirada',
                    expiry: '12/20',
                    cvv: '123'
                },
                '3d-secure': {
                    number: TEST_CARDS['3d-secure'],
                    description: '3D Secure requerido',
                    expiry: '12/25',
                    cvv: '123'
                }
            }
        });
    });
};

module.exports = { PaymentSimulator, paymentRoutes };
