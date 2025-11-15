'use client';
export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';
import api from '@/lib/api';
import { Calendar, CreditCard, User, LogOut, CheckCircle, Dumbbell, Sparkles } from 'lucide-react';
import Link from 'next/link';

interface Membership {
  _id: string;
  planType: string;
  startDate: string;
  endDate: string;
  status: string;
  price: number;
}

export default function ClientDashboard() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, logout, isAuthenticated } = useAuthStore();
  const [membership, setMembership] = useState<Membership | null>(null);
  const [loading, setLoading] = useState(true);
  const [showSuccess, setShowSuccess] = useState(false);

  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/login');
      return;
    }

    if (user?.role === 'admin') {
      router.push('/admin/dashboard');
      return;
    }

    if (searchParams.get('subscription') === 'success') {
      setShowSuccess(true);
      router.replace('/dashboard', { scroll: false });
      setTimeout(() => setShowSuccess(false), 5000);
    }

    const fetchMembership = async () => {
      if (!user?._id) {
        setLoading(false);
        return;
      }

      try {
        const response = await api.get('/memberships', {
          params: { userId: user._id, status: 'active' },
        });
        if (response.data.memberships && response.data.memberships.length > 0) {
          setMembership(response.data.memberships[0]);
        }
      } catch (error: any) {
        if (error.response?.status !== 401) {
          console.error('Error fetching membership:', error);
        }
      } finally {
        setLoading(false);
      }
    };

    fetchMembership();
  }, [isAuthenticated, user, router, searchParams]);

  const handleLogout = () => {
    logout();
    router.push('/');
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

  const getStatusColor = (status: string): string => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-800';
      case 'suspended':
        return 'bg-yellow-100 text-yellow-800';
      case 'expired':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusText = (status: string): string => {
    switch (status) {
      case 'active':
        return 'Activa';
      case 'suspended':
        return 'Suspendida';
      case 'expired':
        return 'Expirada';
      default:
        return 'Desconocido';
    }
  };

  const formatPlanType = (planType: string): string => {
    switch (planType) {
      case 'monthly':
        return 'Mensual';
      case 'quarterly':
        return 'Trimestral';
      case 'annual':
        return 'Anual';
      case 'premium':
        return 'Premium';
      default:
        return planType.charAt(0).toUpperCase() + planType.slice(1);
    }
  };

  return (
    <div className="min-h-screen bg-white">
      <header className="bg-white/80 backdrop-blur-md shadow-lg border-b border-gray-200/50 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <h1 className="text-2xl font-bold text-gray-900">Mi Dashboard</h1>
            <div className="flex items-center space-x-4">
              <Link href="/perfil" className="text-gray-700 hover:text-primary-600">
                <User className="h-5 w-5" />
              </Link>
              <button onClick={handleLogout} className="text-gray-700 hover:text-red-600">
                <LogOut className="h-5 w-5" />
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {showSuccess && (
          <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg flex items-center space-x-3">
            <CheckCircle className="h-6 w-6 text-green-600" />
            <div>
              <p className="font-semibold text-green-800">¡Suscripción exitosa!</p>
              <p className="text-sm text-green-700">Tu membresía ha sido activada correctamente.</p>
            </div>
          </div>
        )}

        <div className="grid md:grid-cols-2 gap-6">
          <div className="card">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold">Mi Membresía</h2>
              {membership && (
                <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(membership.status)}`}>
                  {getStatusText(membership.status)}
                </span>
              )}
            </div>

            {membership ? (
              <div className="space-y-4">
                <div className="flex items-center text-gray-600">
                  <Calendar className="h-5 w-5 mr-2" />
                  <span>
                    Vence: {new Date(membership.endDate).toLocaleDateString('es-ES', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                    })}
                  </span>
                </div>
                <div className="flex items-center text-gray-600">
                  <CreditCard className="h-5 w-5 mr-2" />
                  <span>Plan: {formatPlanType(membership.planType)}</span>
                </div>
                <div className="pt-4 border-t">
                  <p className="text-2xl font-bold text-primary-600">
                    ₡{membership.price.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.')}
                    <span className="text-sm text-gray-600 font-normal">/mes</span>
                  </p>
                </div>
              </div>
            ) : (
              <div className="text-center py-8">
                <p className="text-gray-600 mb-4">No tienes una membresía activa</p>
                <Link href="/planes" className="btn btn-primary">
                  Ver Planes
                </Link>
              </div>
            )}
          </div>

          <div className="card">
            <h2 className="text-xl font-semibold mb-4">Accesos Rápidos</h2>
            <div className="space-y-3">
              <Link href="/planes" className="block p-4 bg-secondary-100 rounded-lg hover:bg-secondary-200 transition border border-gray-200">
                <div className="flex items-center justify-between">
                  <span className="font-medium">Ver Planes</span>
                  <Calendar className="h-5 w-5 text-gray-400" />
                </div>
              </Link>

              <Link href="/recibos" className="block p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition">
                <div className="flex items-center justify-between">
                  <span className="font-medium">Ver Recibos</span>
                  <CreditCard className="h-5 w-5 text-gray-400" />
                </div>
              </Link>

              <Link href="/perfil" className="block p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition">
                <div className="flex items-center justify-between">
                  <span className="font-medium">Editar Perfil</span>
                  <User className="h-5 w-5 text-gray-400" />
                </div>
              </Link>

              {membership && membership.planType === 'premium' && (
                <Link href="/ai-hub" className="block p-4 bg-gradient-to-r from-primary-50 to-primary-100 rounded-lg hover:from-primary-100 hover:to-primary-200 transition border-2 border-primary-200">
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-primary-700">AI Hub</span>
                    <Sparkles className="h-5 w-5 text-primary-600" />
                  </div>
                  <p className="text-xs text-primary-600 mt-1">Asistente Inteligente Premium</p>
                </Link>
              )}
            </div>
          </div>
        </div>
      </main>

      <footer className="bg-gray-50 border-t border-gray-200 mt-20 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <div className="flex items-center space-x-2 mb-4 md:mb-0">
              <Dumbbell className="h-5 w-5 text-primary-600" />
              <span className="text-lg font-bold text-gray-900">Energym</span>
            </div>
            <p className="text-gray-600 text-sm">
              &copy; 2024 Energym. Todos los derechos reservados.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
