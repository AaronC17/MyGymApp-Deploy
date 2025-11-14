'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';
import api from '@/lib/api';
import { CreditCard, ArrowLeft, Download, LogOut } from 'lucide-react';
import Link from 'next/link';

interface Payment {
  _id: string;
  amount: number;
  paymentMethod: string;
  status: string;
  paidAt: string;
  membershipId: {
    planType: string;
  } | null;
  receiptUrl?: string;
}

export default function RecibosPage() {
  const router = useRouter();
  const { user, logout, isAuthenticated } = useAuthStore();
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/login');
      return;
    }

    if (user?.role === 'admin') {
      router.push('/admin/dashboard');
      return;
    }

    fetchPayments();
  }, [isAuthenticated, user]);

  const fetchPayments = async () => {
    try {
      const response = await api.get('/payments', {
        params: { userId: user?._id },
      });
      setPayments(response.data.payments || []);
    } catch (error) {
      console.error('Error fetching payments:', error);
    } finally {
      setLoading(false);
    }
  };

  const getPaymentMethodText = (method: string) => {
    const methods: { [key: string]: string } = {
      cash: 'Efectivo',
      card: 'Tarjeta',
      transfer: 'Transferencia',
    };
    return methods[method] || method;
  };

  const handleDownload = async (paymentId: string) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api'}/payments/receipt/${paymentId}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Error al descargar el recibo');
      }

      // Get the blob
      const blob = await response.blob();
      
      // Create download link
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `recibo-${paymentId}.pdf`;
      document.body.appendChild(a);
      a.click();
      
      // Cleanup
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Error downloading receipt:', error);
      alert('Error al descargar el recibo');
    }
  };

  if (loading) {
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
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center space-x-4">
              <Link href="/dashboard" className="text-gray-700 hover:text-primary-600">
                <ArrowLeft className="h-5 w-5" />
              </Link>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Mis Recibos</h1>
                <p className="text-sm text-gray-600">Historial de pagos y recibos</p>
              </div>
            </div>
            <button onClick={logout} className="text-gray-700 hover:text-red-600">
              <LogOut className="h-5 w-5" />
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {payments.length === 0 ? (
          <div className="card text-center py-12">
            <CreditCard className="h-16 w-16 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600 mb-2">No tienes recibos aún</p>
            <p className="text-sm text-gray-500">Los recibos aparecerán aquí después de realizar un pago</p>
          </div>
        ) : (
          <div className="space-y-4">
            {payments.map((payment) => (
              <div key={payment._id} className="card">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-2">
                      <div className="bg-primary-100 p-2 rounded-lg">
                        <CreditCard className="h-5 w-5 text-primary-600" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-gray-900">
                          Pago {payment.membershipId ? `- Plan ${(() => {
                            const planType = payment.membershipId.planType;
                            switch (planType) {
                              case 'monthly': return 'Mensual';
                              case 'quarterly': return 'Trimestral';
                              case 'annual': return 'Anual';
                              case 'premium': return 'Premium';
                              default: return planType ? planType.charAt(0).toUpperCase() + planType.slice(1) : 'General';
                            }
                          })()}` : ''}
                        </h3>
                        <p className="text-sm text-gray-500">
                          {new Date(payment.paidAt).toLocaleDateString('es-CR', {
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric',
                          })}
                        </p>
                      </div>
                    </div>

                    <div className="grid md:grid-cols-3 gap-4 mt-4">
                      <div>
                        <p className="text-xs text-gray-500 mb-1">Monto</p>
                        <p className="text-lg font-bold text-primary-600">
                          ₡{payment.amount.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.')}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500 mb-1">Método de Pago</p>
                        <p className="text-sm font-medium text-gray-900">
                          {getPaymentMethodText(payment.paymentMethod)}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500 mb-1">Estado</p>
                        <span className={`px-2 py-1 rounded text-xs font-medium ${
                          payment.status === 'completed'
                            ? 'bg-green-100 text-green-800'
                            : payment.status === 'pending'
                            ? 'bg-yellow-100 text-yellow-800'
                            : 'bg-red-100 text-red-800'
                        }`}>
                          {payment.status === 'completed' ? 'Completado' : payment.status === 'pending' ? 'Pendiente' : 'Fallido'}
                        </span>
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={() => handleDownload(payment._id)}
                    className="btn btn-secondary flex items-center space-x-2 ml-4"
                    title="Descargar recibo"
                  >
                    <Download className="h-4 w-4" />
                    <span className="hidden md:inline">Descargar</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

