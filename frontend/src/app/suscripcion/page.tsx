'use client';
export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';
import api from '@/lib/api';
import { Check, CreditCard, ArrowLeft, Loader2 } from 'lucide-react';
import Link from 'next/link';

const PLAN_MAPPING: { [key: string]: { planType: string; name: string; price: number; duration: string } } = {
  mensual: { planType: 'monthly', name: 'Mensual', price: 17500, duration: '1 mes' },
  trimestral: { planType: 'quarterly', name: 'Trimestral', price: 47250, duration: '3 meses' },
  anual: { planType: 'annual', name: 'Anual', price: 168000, duration: '12 meses' },
  premium: { planType: 'premium', name: 'Premium', price: 25000, duration: '1 mes' },
};

export default function SuscripcionPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, isAuthenticated } = useAuthStore();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'card' | 'transfer'>('card');
  
  const planKey = searchParams.get('plan') || 'mensual';
  const plan = PLAN_MAPPING[planKey] || PLAN_MAPPING.mensual;

  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/login?redirect=/suscripcion?plan=' + planKey);
      return;
    }

    if (user?.role === 'admin') {
      router.push('/admin/dashboard');
      return;
    }
  }, [isAuthenticated, user, router, planKey]);

  const handleSubscribe = async () => {
    setLoading(true);
    setError('');

    try {
      const response = await api.post('/subscribe', {
        planType: plan.planType,
        paymentMethod,
      });

      if (response.data.success) {
        router.push('/dashboard?subscription=success');
      }
    } catch (err: any) {
      console.error('Subscribe error:', err);
      console.error('Error response:', err.response?.data);
      console.error('Error status:', err.response?.status);
      
      if (err.response?.data?.error) {
        setError(err.response.data.error);
      } else if (err.response?.data?.details && Array.isArray(err.response.data.details)) {
        setError(err.response.data.details.join(', '));
      } else if (err.response?.data?.message) {
        setError(err.response.data.message);
      } else if (err.message) {
        setError(err.message);
      } else {
        setError('Error al procesar la suscripción. Por favor, intenta nuevamente.');
      }
    } finally {
      setLoading(false);
    }
  };

  if (!isAuthenticated || user?.role === 'admin') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Cargando...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      <header className="bg-white/80 backdrop-blur-md shadow-lg border-b border-gray-200/50 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center py-4">
            <Link href="/planes" className="text-gray-700 hover:text-primary-600">
              <ArrowLeft className="h-5 w-5" />
            </Link>
            <h1 className="text-2xl font-bold text-gray-900 ml-4">Confirmar Suscripción</h1>
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid md:grid-cols-2 gap-8">
          <div className="card">
            <h2 className="text-xl font-semibold mb-4">Resumen del Plan</h2>
            <div className="space-y-4">
              <div>
                <p className="text-sm text-gray-600">Plan seleccionado</p>
                <p className="text-2xl font-bold text-primary-600">{plan.name}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Duración</p>
                <p className="text-lg font-medium">{plan.duration}</p>
              </div>
              <div className="pt-4 border-t">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-gray-600">Precio</span>
                  <span className="text-3xl font-bold text-primary-600">
                    ₡{plan.price.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.')}
                  </span>
                </div>
                {plan.planType === 'quarterly' && (
                  <p className="text-sm text-green-600">Ahorras 10%</p>
                )}
                {plan.planType === 'annual' && (
                  <p className="text-sm text-green-600">Ahorras 20%</p>
                )}
              </div>
            </div>
          </div>

          <div className="card">
            <h2 className="text-xl font-semibold mb-4">Método de Pago</h2>
            <p className="text-sm text-gray-600 mb-4">
              Esta es una simulación. No se realizará ningún cargo real.
            </p>

            <div className="space-y-3">
              <button
                onClick={() => setPaymentMethod('card')}
                className={`w-full p-4 border-2 rounded-lg text-left transition ${
                  paymentMethod === 'card'
                    ? 'border-primary-500 bg-primary-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <CreditCard className="h-5 w-5 text-gray-600" />
                    <span className="font-medium">Tarjeta</span>
                  </div>
                  {paymentMethod === 'card' && (
                    <Check className="h-5 w-5 text-primary-600" />
                  )}
                </div>
              </button>

              <button
                onClick={() => setPaymentMethod('cash')}
                className={`w-full p-4 border-2 rounded-lg text-left transition ${
                  paymentMethod === 'cash'
                    ? 'border-primary-500 bg-primary-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <CreditCard className="h-5 w-5 text-gray-600" />
                    <span className="font-medium">Efectivo</span>
                  </div>
                  {paymentMethod === 'cash' && (
                    <Check className="h-5 w-5 text-primary-600" />
                  )}
                </div>
              </button>

              <button
                onClick={() => setPaymentMethod('transfer')}
                className={`w-full p-4 border-2 rounded-lg text-left transition ${
                  paymentMethod === 'transfer'
                    ? 'border-primary-500 bg-primary-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <CreditCard className="h-5 w-5 text-gray-600" />
                    <span className="font-medium">Transferencia</span>
                  </div>
                  {paymentMethod === 'transfer' && (
                    <Check className="h-5 w-5 text-primary-600" />
                  )}
                </div>
              </button>
            </div>

            {error && (
              <div className="mt-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">
                {error}
              </div>
            )}

            <div className="mt-6 space-y-3">
              <button
                onClick={handleSubscribe}
                disabled={loading}
                className="btn btn-primary w-full flex items-center justify-center space-x-2"
              >
                {loading ? (
                  <>
                    <Loader2 className="h-5 w-5 animate-spin" />
                    <span>Procesando...</span>
                  </>
                ) : (
                  <>
                    <CreditCard className="h-5 w-5" />
                    <span>Confirmar Suscripción</span>
                  </>
                )}
              </button>
              <Link href="/planes" className="btn btn-secondary w-full text-center">
                Cancelar
              </Link>
            </div>
          </div>
        </div>

        <div className="mt-8 card bg-blue-50 border-blue-200">
          <p className="text-sm text-blue-800">
            <strong>Nota:</strong> Esta es una simulación de suscripción. 
            En un entorno de producción, aquí se integraría un procesador de pagos real 
            como Stripe, PayPal o un sistema de pagos local.
          </p>
        </div>
      </main>
    </div>
  );
}
