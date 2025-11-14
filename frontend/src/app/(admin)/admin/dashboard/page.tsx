'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';
import api from '@/lib/api';
import { Users, DollarSign, Calendar, Package, TrendingUp, LogOut, Dumbbell } from 'lucide-react';
import Link from 'next/link';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

interface Stats {
  activeClients: number;
  totalRevenue: number;
  monthlyRevenue: number;
  expiringMemberships: number;
  productSales: number;
  monthlyGrowth: number;
}

export default function AdminDashboard() {
  const router = useRouter();
  const { user, logout, isAuthenticated } = useAuthStore();
  const [stats, setStats] = useState<Stats | null>(null);
  const [revenueData, setRevenueData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/login');
      return;
    }

    if (user?.role !== 'admin') {
      router.push('/dashboard');
      return;
    }

    fetchData();
  }, [isAuthenticated, user, router]);

  const fetchData = async () => {
    try {
      const [statsRes, revenueRes] = await Promise.all([
        api.get('/admin/stats'),
        api.get('/admin/revenue', { params: { period: 'monthly' } }),
      ]);

      setStats(statsRes.data);
      setRevenueData(revenueRes.data.revenue);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

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

  const statCards = [
    {
      title: 'Clientes Activos',
      value: stats?.activeClients || 0,
      icon: Users,
      color: 'bg-blue-500',
    },
    {
      title: 'Ingresos Mensuales',
      value: `₡${(stats?.monthlyRevenue || 0).toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.')}`,
      icon: DollarSign,
      color: 'bg-green-500',
    },
    {
      title: 'Por Expirar',
      value: stats?.expiringMemberships || 0,
      icon: Calendar,
      color: 'bg-yellow-500',
    },
    {
      title: 'Productos Activos',
      value: stats?.productSales || 0,
      icon: Package,
      color: 'bg-purple-500',
    },
  ];

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-md shadow-lg border-b border-gray-200/50 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Panel Administrativo</h1>
              {user && (
                <p className="text-sm text-gray-600 mt-1">
                  Bienvenido, {user.name} ({user.email})
                </p>
              )}
            </div>
            <button 
              onClick={handleLogout} 
              className="flex items-center space-x-2 text-gray-700 hover:text-red-600 transition"
              title="Cerrar sesión"
            >
              <LogOut className="h-5 w-5" />
              <span className="hidden md:inline">Salir</span>
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {statCards.map((stat, idx) => (
            <div key={idx} className="card">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">{stat.title}</p>
                  <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
                </div>
                <div className={`${stat.color} p-3 rounded-lg shadow-lg`}>
                  <stat.icon className="h-6 w-6 text-white" />
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Growth Indicator */}
        {stats && (
          <div className="card mb-8">
            <div className="flex items-center space-x-2">
              <TrendingUp className="h-5 w-5 text-green-600" />
              <span className="text-sm text-gray-600">Crecimiento mensual:</span>
              <span className={`text-lg font-semibold ${stats.monthlyGrowth >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {stats.monthlyGrowth >= 0 ? '+' : ''}{stats.monthlyGrowth.toFixed(1)}%
              </span>
            </div>
          </div>
        )}

        {/* Revenue Chart */}
        <div className="card mb-8">
          <h2 className="text-xl font-semibold mb-4">Ingresos Mensuales</h2>
          {revenueData.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={revenueData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="period" />
                <YAxis />
                <Tooltip 
                  formatter={(value: number) => `₡${value.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.')}`}
                />
                <Bar dataKey="amount" fill="#0ea5e9" />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-300 flex items-center justify-center text-gray-500">
              <p>No hay datos de ingresos disponibles</p>
            </div>
          )}
        </div>

        {/* Quick Links */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Link href="/admin/clientes" className="card cursor-pointer">
            <div className="flex items-center space-x-3 mb-3">
              <div className="bg-blue-100 p-2 rounded-lg">
                <Users className="h-6 w-6 text-blue-600" />
              </div>
              <h3 className="text-lg font-semibold">Clientes</h3>
            </div>
            <p className="text-gray-600 text-sm">Administrar clientes y membresías</p>
          </Link>
          <Link href="/admin/planes" className="card cursor-pointer">
            <div className="flex items-center space-x-3 mb-3">
              <div className="bg-purple-100 p-2 rounded-lg">
                <Calendar className="h-6 w-6 text-purple-600" />
              </div>
              <h3 className="text-lg font-semibold">Planes</h3>
            </div>
            <p className="text-gray-600 text-sm">Gestionar planes de membresía</p>
          </Link>
          <Link href="/admin/pagos" className="card cursor-pointer">
            <div className="flex items-center space-x-3 mb-3">
              <div className="bg-green-100 p-2 rounded-lg">
                <DollarSign className="h-6 w-6 text-green-600" />
              </div>
              <h3 className="text-lg font-semibold">Pagos</h3>
            </div>
            <p className="text-gray-600 text-sm">Registrar pagos y generar reportes</p>
          </Link>
          <Link href="/admin/inventario" className="card cursor-pointer">
            <div className="flex items-center space-x-3 mb-3">
              <div className="bg-orange-100 p-2 rounded-lg">
                <Package className="h-6 w-6 text-orange-600" />
              </div>
              <h3 className="text-lg font-semibold">Inventario</h3>
            </div>
            <p className="text-gray-600 text-sm">Gestionar productos y stock</p>
          </Link>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-gray-50 border-t border-gray-200 mt-20 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <div className="flex items-center space-x-2 mb-4 md:mb-0">
              <Dumbbell className="h-5 w-5 text-primary-600" />
              <span className="text-lg font-bold text-gray-900">Energym</span>
            </div>
            <p className="text-gray-600 text-sm">
              &copy; 2024 Energym. Panel Administrativo
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}

