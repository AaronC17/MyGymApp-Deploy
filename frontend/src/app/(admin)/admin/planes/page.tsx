'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';
import api from '@/lib/api';
import { Calendar, Edit, Trash2, ArrowLeft, LogOut, Plus, X } from 'lucide-react';
import Link from 'next/link';

interface Plan {
  _id?: string;
  name: string;
  planType: string;
  price: number;
  duration: number; // meses
  features: string[];
}

const defaultPlans: Plan[] = [
  {
    name: 'Mensual',
    planType: 'monthly',
    price: 17500,
    duration: 1,
    features: ['Acceso ilimitado', 'Uso de equipos', 'Clases grupales'],
  },
  {
    name: 'Trimestral',
    planType: 'quarterly',
    price: 47250,
    duration: 3,
    features: ['Todo del Mensual', 'Ahorro del 10%', 'Renovación automática'],
  },
  {
    name: 'Anual',
    planType: 'annual',
    price: 168000,
    duration: 12,
    features: ['Todo del Trimestral', 'Ahorro del 20%', 'Regalo especial'],
  },
  {
    name: 'Premium',
    planType: 'premium',
    price: 25000,
    duration: 1,
    features: ['Todo del Mensual', 'Entrenador personal', 'Nutricionista'],
  },
];

export default function PlanesPage() {
  const router = useRouter();
  const { user, logout, isAuthenticated } = useAuthStore();
  const [plans, setPlans] = useState<Plan[]>(defaultPlans);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingPlan, setEditingPlan] = useState<Plan | null>(null);
  const [formData, setFormData] = useState<Plan>({
    name: '',
    planType: 'monthly',
    price: 0,
    duration: 1,
    features: [],
  });

  useEffect(() => {
    if (!isAuthenticated || user?.role !== 'admin') {
      router.push('/login');
      return;
    }
    setLoading(false);
  }, [isAuthenticated, user]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Filter out empty features
    const cleanedFormData = {
      ...formData,
      features: formData.features.filter(f => f.trim() !== '')
    };
    
    if (editingPlan) {
      setPlans(plans.map(p => p._id === editingPlan._id ? { ...cleanedFormData, _id: editingPlan._id } : p));
    } else {
      setPlans([...plans, { ...cleanedFormData, _id: Date.now().toString() }]);
    }
    setShowModal(false);
    setEditingPlan(null);
    setFormData({ name: '', planType: 'monthly', price: 0, duration: 1, features: [] });
  };

  const handleDelete = (id: string) => {
    if (!confirm('¿Estás seguro de eliminar este plan?')) return;
    setPlans(plans.filter(p => p._id !== id));
  };

  const openEditModal = (plan: Plan) => {
    setEditingPlan(plan);
    setFormData(plan);
    setShowModal(true);
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
              <Link href="/admin/dashboard" className="text-gray-700 hover:text-primary-600">
                <ArrowLeft className="h-5 w-5" />
              </Link>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Gestión de Planes</h1>
                <p className="text-sm text-gray-600">Administra los planes de membresía</p>
              </div>
            </div>
            <button onClick={logout} className="text-gray-700 hover:text-red-600">
              <LogOut className="h-5 w-5" />
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          {plans.map((plan) => (
            <div key={plan._id || plan.name} className="card relative">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="text-xl font-bold text-gray-900">{plan.name}</h3>
                  <p className="text-sm text-gray-600 capitalize">{plan.planType}</p>
                </div>
                <div className="flex space-x-2">
                  <button
                    onClick={() => openEditModal(plan)}
                    className="text-primary-600 hover:text-primary-900"
                    title="Editar"
                  >
                    <Edit className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(plan._id!)}
                    className="text-red-600 hover:text-red-900"
                    title="Eliminar"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>

              <div className="mb-4">
                <div className="flex items-baseline">
                  <span className="text-3xl font-bold text-primary-600">
                    ₡{plan.price.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.')}
                  </span>
                  <span className="text-gray-600 ml-2">/{plan.duration === 1 ? 'mes' : `${plan.duration} meses`}</span>
                </div>
                {plan.duration > 1 && (
                  <p className="text-sm text-gray-500 mt-1">
                    ₡{Math.round(plan.price / plan.duration).toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.')}/mes
                  </p>
                )}
              </div>

              <ul className="space-y-2 mb-4">
                {plan.features.map((feature, i) => (
                  <li key={i} className="flex items-start text-sm text-gray-600">
                    <span className="text-primary-600 mr-2">✓</span>
                    {feature}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </main>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-md w-full p-6 shadow-xl border border-gray-200">
            <h2 className="text-xl font-bold mb-4">
              {editingPlan ? 'Editar Plan' : 'Nuevo Plan'}
            </h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="label">Nombre del Plan</label>
                <input
                  type="text"
                  required
                  className="input"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                />
              </div>
              <div>
                <label className="label">Tipo</label>
                <select
                  required
                  className="input"
                  value={formData.planType}
                  onChange={(e) => setFormData({ ...formData, planType: e.target.value })}
                >
                  <option value="monthly">Mensual</option>
                  <option value="quarterly">Trimestral</option>
                  <option value="annual">Anual</option>
                  <option value="premium">Premium</option>
                </select>
              </div>
              <div>
                <label className="label">Precio (colones)</label>
                <input
                  type="number"
                  required
                  min="0"
                  className="input"
                  value={formData.price}
                  onChange={(e) => setFormData({ ...formData, price: parseInt(e.target.value) || 0 })}
                />
              </div>
              <div>
                <label className="label">Duración (meses)</label>
                <input
                  type="number"
                  required
                  min="1"
                  className="input"
                  value={formData.duration}
                  onChange={(e) => setFormData({ ...formData, duration: parseInt(e.target.value) || 1 })}
                />
              </div>
              <div>
                <label className="label">Características del Plan</label>
                <div className="space-y-2">
                  {formData.features.map((feature, index) => (
                    <div key={index} className="flex items-center space-x-2">
                      <input
                        type="text"
                        className="input flex-1"
                        value={feature}
                        onChange={(e) => {
                          const newFeatures = [...formData.features];
                          newFeatures[index] = e.target.value;
                          setFormData({ ...formData, features: newFeatures });
                        }}
                        placeholder="Característica del plan"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          const newFeatures = formData.features.filter((_, i) => i !== index);
                          setFormData({ ...formData, features: newFeatures });
                        }}
                        className="text-red-600 hover:text-red-800 p-2"
                        title="Eliminar característica"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={() => {
                      setFormData({ ...formData, features: [...formData.features, ''] });
                    }}
                    className="btn btn-secondary w-full flex items-center justify-center space-x-2"
                  >
                    <Plus className="h-4 w-4" />
                    <span>Agregar Característica</span>
                  </button>
                </div>
              </div>
              <div className="flex space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowModal(false);
                    setEditingPlan(null);
                  }}
                  className="btn btn-secondary flex-1"
                >
                  Cancelar
                </button>
                <button type="submit" className="btn btn-primary flex-1">
                  {editingPlan ? 'Actualizar' : 'Crear'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

