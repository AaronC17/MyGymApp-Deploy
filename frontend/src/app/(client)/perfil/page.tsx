'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';
import api from '@/lib/api';
import { User, ArrowLeft, Save, LogOut } from 'lucide-react';
import Link from 'next/link';

interface UserProfile {
  _id: string;
  email: string;
  name: string;
  phone?: string;
  weight?: number;
  goal?: string;
}

export default function PerfilPage() {
  const router = useRouter();
  const { user, logout, isAuthenticated, updateUser } = useAuthStore();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    weight: '',
    goal: '',
  });
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/login');
      return;
    }

    if (user?.role === 'admin') {
      router.push('/admin/dashboard');
      return;
    }

    fetchProfile();
  }, [isAuthenticated, user]);

  const fetchProfile = async () => {
    try {
      const response = await api.get(`/clients/${user?._id}`);
      const profile: UserProfile = response.data;
      setFormData({
        name: profile.name || '',
        phone: profile.phone || '',
        weight: profile.weight?.toString() || '',
        goal: profile.goal || '',
      });
    } catch (error) {
      console.error('Error fetching profile:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMessage(null);

    try {
      const updateData: any = {
        name: formData.name,
        phone: formData.phone,
      };

      if (formData.weight) {
        updateData.weight = parseFloat(formData.weight);
      }

      if (formData.goal) {
        updateData.goal = formData.goal;
      }

      const response = await api.put(`/clients/${user?._id}`, updateData);
      updateUser(response.data);
      setMessage({ type: 'success', text: 'Perfil actualizado exitosamente' });
    } catch (error: any) {
      setMessage({ type: 'error', text: error.response?.data?.error || 'Error al actualizar perfil' });
    } finally {
      setSaving(false);
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
                <h1 className="text-2xl font-bold text-gray-900">Mi Perfil</h1>
                <p className="text-sm text-gray-600">Actualiza tu información personal</p>
              </div>
            </div>
            <button onClick={logout} className="text-gray-700 hover:text-red-600">
              <LogOut className="h-5 w-5" />
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="card">
          {message && (
            <div className={`mb-6 px-4 py-3 rounded-lg ${
              message.type === 'success'
                ? 'bg-green-50 border border-green-200 text-green-700'
                : 'bg-red-50 border border-red-200 text-red-700'
            }`}>
              {message.text}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* User Info */}
            <div className="flex items-center space-x-4 pb-6 border-b">
              <div className="bg-primary-100 p-4 rounded-full">
                <User className="h-8 w-8 text-primary-600" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-gray-900">{user?.name}</h2>
                <p className="text-sm text-gray-600">{user?.email}</p>
              </div>
            </div>

            {/* Form Fields */}
            <div>
              <label htmlFor="name" className="label">
                Nombre Completo
              </label>
              <input
                id="name"
                type="text"
                required
                className="input"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </div>

            <div>
              <label htmlFor="phone" className="label">
                Teléfono
              </label>
              <input
                id="phone"
                type="tel"
                className="input"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                placeholder="+506 8888-8888"
              />
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <label htmlFor="weight" className="label">
                  Peso (kg)
                </label>
                <input
                  id="weight"
                  type="number"
                  min="0"
                  step="0.1"
                  className="input"
                  value={formData.weight}
                  onChange={(e) => setFormData({ ...formData, weight: e.target.value })}
                  placeholder="75.5"
                />
              </div>

              <div>
                <label htmlFor="goal" className="label">
                  Objetivo
                </label>
                <select
                  id="goal"
                  className="input"
                  value={formData.goal}
                  onChange={(e) => setFormData({ ...formData, goal: e.target.value })}
                >
                  <option value="">Selecciona un objetivo</option>
                  <option value="Perder peso">Perder peso</option>
                  <option value="Ganar masa muscular">Ganar masa muscular</option>
                  <option value="Mejorar condición física">Mejorar condición física</option>
                  <option value="Mantenerse en forma">Mantenerse en forma</option>
                  <option value="Preparación para competencia">Preparación para competencia</option>
                </select>
              </div>
            </div>

            {/* Submit Button */}
            <div className="flex justify-end pt-4 border-t">
              <button
                type="submit"
                disabled={saving}
                className="btn btn-primary flex items-center space-x-2"
              >
                <Save className="h-5 w-5" />
                <span>{saving ? 'Guardando...' : 'Guardar Cambios'}</span>
              </button>
            </div>
          </form>
        </div>
      </main>
    </div>
  );
}

