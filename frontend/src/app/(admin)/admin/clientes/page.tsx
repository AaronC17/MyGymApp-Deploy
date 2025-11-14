'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';
import api from '@/lib/api';
import { Users, Search, Plus, Edit, Trash2, ArrowLeft, LogOut, Calendar, XCircle, CheckCircle } from 'lucide-react';
import Link from 'next/link';

interface Client {
  _id: string;
  email: string;
  name: string;
  phone?: string;
  role: string;
  createdAt: string;
  membership?: {
    _id: string;
    status: string;
    endDate: string;
    startDate: string;
    planType: string;
    price: number;
  };
}

export default function ClientesPage() {
  const router = useRouter();
  const { user, logout, isAuthenticated } = useAuthStore();
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [showMembershipModal, setShowMembershipModal] = useState(false);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
  });
  const [membershipData, setMembershipData] = useState({
    planType: 'monthly',
    price: 17500,
    startDate: new Date().toISOString().split('T')[0],
    endDate: '',
    status: 'active',
  });

  useEffect(() => {
    if (!isAuthenticated || user?.role !== 'admin') {
      router.push('/login');
      return;
    }
    fetchClients();
  }, [isAuthenticated, user]);

  const fetchClients = async () => {
    try {
      const response = await api.get('/clients', {
        params: { search: searchTerm },
      });
      setClients(response.data.clients || []);
    } catch (error) {
      console.error('Error fetching clients:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (searchTerm !== '') {
      const debounce = setTimeout(() => {
        fetchClients();
      }, 300);
      return () => clearTimeout(debounce);
    } else {
      fetchClients();
    }
  }, [searchTerm]);

  const handleDelete = async (id: string) => {
    if (!confirm('¿Estás seguro de eliminar este cliente?')) return;

    try {
      await api.delete(`/clients/${id}`);
      fetchClients();
    } catch (error) {
      console.error('Error deleting client:', error);
      alert('Error al eliminar cliente');
    }
  };

  const calculateEndDate = (planType: string, startDate: string): string => {
    if (!startDate) return '';
    
    // Parse date string - input type="date" always provides YYYY-MM-DD format
    let year: number, month: number, day: number;
    
    // Check if it's already in YYYY-MM-DD format (standard for input type="date")
    if (startDate.includes('-') && startDate.split('-').length === 3) {
      const parts = startDate.split('-');
      year = parseInt(parts[0], 10);
      month = parseInt(parts[1], 10);
      day = parseInt(parts[2], 10);
      
      // Debug log
      console.log('Parsing date:', { startDate, year, month, day });
    } else {
      // Try to parse as Date object (fallback)
      const date = new Date(startDate);
      if (isNaN(date.getTime())) {
        console.error('Invalid date:', startDate);
        return '';
      }
      year = date.getFullYear();
      month = date.getMonth() + 1; // getMonth() returns 0-11
      day = date.getDate();
    }
    
    // Validate date components
    if (isNaN(year) || isNaN(month) || isNaN(day) || month < 1 || month > 12 || day < 1 || day > 31) {
      console.error('Invalid date components:', { year, month, day });
      return '';
    }
    
    let endYear = year;
    let endMonth = month;
    let endDay = day;
    
    switch (planType) {
      case 'monthly':
        endMonth += 1;
        break;
      case 'quarterly':
        // Add exactly 3 months
        endMonth += 3;
        break;
      case 'annual':
        endYear += 1;
        break;
      case 'premium':
        endMonth += 1;
        break;
      default:
        endMonth += 1;
    }
    
    // Handle month overflow (if month > 12, increment year)
    while (endMonth > 12) {
      endMonth -= 12;
      endYear += 1;
    }
    
    // Create date to validate and handle day overflow (e.g., Jan 31 + 1 month = Feb 28/29)
    const tempDate = new Date(endYear, endMonth - 1, endDay);
    // If day overflowed (e.g., Jan 31 -> Feb 31 becomes Mar 3), adjust
    if (tempDate.getMonth() !== endMonth - 1) {
      // Day overflowed, use last day of the month
      const lastDay = new Date(endYear, endMonth, 0).getDate();
      endDay = Math.min(day, lastDay);
    }
    
    // Format as YYYY-MM-DD (ensure correct format for input type="date")
    const formattedMonth = String(endMonth).padStart(2, '0');
    const formattedDay = String(endDay).padStart(2, '0');
    const result = `${endYear}-${formattedMonth}-${formattedDay}`;
    
    console.log('Calculated end date:', { 
      planType, 
      startDate, 
      start: { year, month, day }, 
      end: { endYear, endMonth, endDay }, 
      result 
    });
    
    return result;
  };

  const PLAN_PRICES: { [key: string]: number } = {
    monthly: 17500,
    quarterly: 47250,
    annual: 168000,
    premium: 25000,
  };

  // Helper function to format date to YYYY-MM-DD for input type="date"
  const formatDateForInput = (date: string | Date): string => {
    if (!date) return '';
    
    // If it's already a string in YYYY-MM-DD format, return it
    if (typeof date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return date;
    }
    
    // If it's a string with ISO format (includes T), extract YYYY-MM-DD
    if (typeof date === 'string' && date.includes('T')) {
      return date.split('T')[0];
    }
    
    // Try to parse as Date and format
    let dateObj: Date;
    if (date instanceof Date) {
      dateObj = date;
    } else {
      dateObj = new Date(date);
    }
    
    // Check if date is valid
    if (isNaN(dateObj.getTime())) {
      console.error('Invalid date:', date);
      return '';
    }
    
    // Format as YYYY-MM-DD (use local date, not UTC, to avoid timezone issues)
    const year = dateObj.getFullYear();
    const month = String(dateObj.getMonth() + 1).padStart(2, '0');
    const day = String(dateObj.getDate()).padStart(2, '0');
    
    return `${year}-${month}-${day}`;
  };

  const openMembershipModal = (client: Client) => {
    setSelectedClient(client);
    if (client.membership) {
      // Editing existing membership - recalculate end date based on plan type
      // Parse date correctly to YYYY-MM-DD format
      const startDate = formatDateForInput(client.membership.startDate);
      console.log('Parsed start date:', { 
        original: client.membership.startDate, 
        formatted: startDate 
      });
      
      const calculatedEndDate = calculateEndDate(client.membership.planType, startDate);
      setMembershipData({
        planType: client.membership.planType,
        price: client.membership.price,
        startDate: startDate,
        endDate: calculatedEndDate, // Use calculated date instead of stored date
        status: client.membership.status,
      });
    } else {
      // Creating new membership
      const startDate = new Date().toISOString().split('T')[0];
      setMembershipData({
        planType: 'monthly',
        price: 17500,
        startDate: startDate,
        endDate: calculateEndDate('monthly', startDate),
        status: 'active',
      });
    }
    setShowMembershipModal(true);
  };

  const handleMembershipSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedClient) return;

    try {
      if (selectedClient.membership) {
        // Update existing membership
        await api.put(`/memberships/${selectedClient.membership._id}`, {
          planType: membershipData.planType,
          price: membershipData.price,
          startDate: membershipData.startDate,
          endDate: membershipData.endDate,
          status: membershipData.status,
        });
        alert('Membresía actualizada exitosamente');
      } else {
        // Create new membership
        await api.post('/memberships', {
          userId: selectedClient._id,
          planType: membershipData.planType,
          price: membershipData.price,
          startDate: membershipData.startDate,
          endDate: membershipData.endDate,
          status: membershipData.status,
        });
        alert('Membresía creada exitosamente');
      }
      setShowMembershipModal(false);
      setSelectedClient(null);
      fetchClients();
    } catch (error: any) {
      console.error('Error saving membership:', error);
      alert(error.response?.data?.error || 'Error al guardar membresía');
    }
  };

  const handleSuspendMembership = async (membershipId: string) => {
    if (!confirm('¿Estás seguro de suspender esta membresía?')) return;

    try {
      await api.delete(`/memberships/${membershipId}?suspend=true`);
      alert('Membresía suspendida exitosamente');
      fetchClients();
    } catch (error: any) {
      console.error('Error suspending membership:', error);
      alert(error.response?.data?.error || 'Error al suspender membresía');
    }
  };

  const handleDeleteMembership = async (membershipId: string) => {
    if (!confirm('¿Estás seguro de eliminar esta membresía? Esta acción no se puede deshacer.')) return;

    try {
      await api.delete(`/memberships/${membershipId}`);
      alert('Membresía eliminada exitosamente');
      fetchClients();
    } catch (error: any) {
      console.error('Error deleting membership:', error);
      alert(error.response?.data?.error || 'Error al eliminar membresía');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingClient) {
        await api.put(`/clients/${editingClient._id}`, formData);
      } else {
        await api.post('/clients', formData);
      }
      setShowModal(false);
      setEditingClient(null);
      setFormData({ name: '', email: '', phone: '', password: '' });
      fetchClients();
    } catch (error: any) {
      alert(error.response?.data?.error || 'Error al guardar cliente');
    }
  };

  const openEditModal = (client: Client) => {
    setEditingClient(client);
    setFormData({
      name: client.name,
      email: client.email,
      phone: client.phone || '',
      password: '',
    });
    setShowModal(true);
  };

  const openCreateModal = () => {
    setEditingClient(null);
    setFormData({ name: '', email: '', phone: '', password: '' });
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

  const getStatusColor = (status?: string) => {
    if (!status) return 'bg-gray-100 text-gray-800';
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

  const getPlanTypeLabel = (planType: string): string => {
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
        return planType;
    }
  };

  return (
    <div className="min-h-screen bg-white">
      <header className="bg-white shadow-md border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center space-x-4">
              <Link href="/admin/dashboard" className="text-gray-700 hover:text-primary-600">
                <ArrowLeft className="h-5 w-5" />
              </Link>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Gestión de Clientes</h1>
                <p className="text-sm text-gray-600">Administra los clientes del gimnasio</p>
              </div>
            </div>
            <button onClick={logout} className="text-gray-700 hover:text-red-600">
              <LogOut className="h-5 w-5" />
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Search and Actions */}
        <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar por nombre o email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="input pl-10"
            />
          </div>
          <button onClick={openCreateModal} className="btn btn-primary flex items-center space-x-2">
            <Plus className="h-5 w-5" />
            <span>Nuevo Cliente</span>
          </button>
        </div>

        {/* Clients Table */}
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Nombre</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Email</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Teléfono</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Membresía</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Fecha Registro</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Acciones</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {clients.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-8 text-center text-gray-500">
                      No hay clientes registrados
                    </td>
                  </tr>
                ) : (
                  clients.map((client) => (
                    <tr key={client._id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="bg-primary-100 p-2 rounded-full mr-3">
                            <Users className="h-4 w-4 text-primary-600" />
                          </div>
                          <span className="font-medium text-gray-900">{client.name}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-gray-600">{client.email}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-gray-600">{client.phone || '-'}</td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {client.membership ? (
                          <div className="space-y-1">
                            <div className="flex items-center space-x-2">
                              <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(client.membership.status)}`}>
                                {client.membership.status === 'active' ? 'Activa' : client.membership.status === 'suspended' ? 'Suspendida' : 'Expirada'}
                              </span>
                              <button
                                onClick={() => openMembershipModal(client)}
                                className="text-primary-600 hover:text-primary-900"
                                title="Editar membresía"
                              >
                                <Edit className="h-3 w-3" />
                              </button>
                            </div>
                            <div className="text-xs text-gray-500">
                              Expira: {new Date(client.membership.endDate).toLocaleDateString('es-CR', {
                                year: 'numeric',
                                month: 'short',
                                day: 'numeric',
                              })}
                            </div>
                            <div className="text-xs text-gray-500">
                              Plan: {getPlanTypeLabel(client.membership.planType)}
                            </div>
                          </div>
                        ) : (
                          <div className="flex items-center space-x-2">
                            <span className="text-gray-400 text-sm">Sin membresía</span>
                            <button
                              onClick={() => openMembershipModal(client)}
                              className="text-primary-600 hover:text-primary-900 text-xs"
                              title="Agregar membresía"
                            >
                              <Plus className="h-3 w-3" />
                            </button>
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-gray-600">
                        {new Date(client.createdAt).toLocaleDateString('es-CR')}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex justify-end space-x-2">
                          <button
                            onClick={() => openMembershipModal(client)}
                            className="text-blue-600 hover:text-blue-900"
                            title="Gestionar membresía"
                          >
                            <Calendar className="h-5 w-5" />
                          </button>
                          <button
                            onClick={() => openEditModal(client)}
                            className="text-primary-600 hover:text-primary-900"
                            title="Editar"
                          >
                            <Edit className="h-5 w-5" />
                          </button>
                          <button
                            onClick={() => handleDelete(client._id)}
                            className="text-red-600 hover:text-red-900"
                            title="Eliminar"
                          >
                            <Trash2 className="h-5 w-5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Stats */}
        <div className="mt-6 grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="card">
            <p className="text-sm text-gray-600">Total Clientes</p>
            <p className="text-2xl font-bold text-gray-900">{clients.length}</p>
          </div>
          <div className="card">
            <p className="text-sm text-gray-600">Con Membresía Activa</p>
            <p className="text-2xl font-bold text-green-600">
              {clients.filter(c => c.membership?.status === 'active').length}
            </p>
          </div>
          <div className="card">
            <p className="text-sm text-gray-600">Por Expirar (7 días)</p>
            <p className="text-2xl font-bold text-yellow-600">
              {clients.filter(c => {
                if (!c.membership?.endDate) return false;
                const endDate = new Date(c.membership.endDate);
                const today = new Date();
                const daysUntilExpiry = Math.ceil((endDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
                return daysUntilExpiry <= 7 && daysUntilExpiry >= 0;
              }).length}
            </p>
          </div>
          <div className="card">
            <p className="text-sm text-gray-600">Sin Membresía</p>
            <p className="text-2xl font-bold text-gray-600">
              {clients.filter(c => !c.membership).length}
            </p>
          </div>
        </div>
      </main>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-md w-full p-6 shadow-xl border border-gray-200">
            <h2 className="text-xl font-bold mb-4">
              {editingClient ? 'Editar Cliente' : 'Nuevo Cliente'}
            </h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="label">Nombre</label>
                <input
                  type="text"
                  required
                  className="input"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                />
              </div>
              <div>
                <label className="label">Email</label>
                <input
                  type="email"
                  required
                  className="input"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  disabled={!!editingClient}
                />
              </div>
              <div>
                <label className="label">Teléfono</label>
                <input
                  type="tel"
                  className="input"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                />
              </div>
              {!editingClient && (
                <div>
                  <label className="label">Contraseña</label>
                  <input
                    type="password"
                    required
                    minLength={6}
                    className="input"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  />
                </div>
              )}
              <div className="flex space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowModal(false);
                    setEditingClient(null);
                  }}
                  className="btn btn-secondary flex-1"
                >
                  Cancelar
                </button>
                <button type="submit" className="btn btn-primary flex-1">
                  {editingClient ? 'Actualizar' : 'Crear'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Membership Modal */}
      {showMembershipModal && selectedClient && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-md w-full p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold">
                {selectedClient.membership ? 'Editar Membresía' : 'Agregar Membresía'}
              </h2>
              <button
                onClick={() => {
                  setShowMembershipModal(false);
                  setSelectedClient(null);
                }}
                className="text-gray-500 hover:text-gray-700"
              >
                <XCircle className="h-5 w-5" />
              </button>
            </div>

            <div className="mb-4 p-3 bg-secondary-100 rounded-lg border border-gray-200">
              <p className="text-sm text-gray-600">Cliente:</p>
              <p className="font-semibold">{selectedClient.name}</p>
              <p className="text-sm text-gray-500">{selectedClient.email}</p>
            </div>

            <form onSubmit={handleMembershipSubmit} className="space-y-4">
              <div>
                <label className="label">Tipo de Plan</label>
                <select
                  required
                  className="input"
                  value={membershipData.planType}
                  onChange={(e) => {
                    const newPlanType = e.target.value;
                    const newPrice = PLAN_PRICES[newPlanType];
                    // Always recalculate end date when plan type changes
                    const newEndDate = calculateEndDate(newPlanType, membershipData.startDate);
                    setMembershipData({
                      ...membershipData,
                      planType: newPlanType,
                      price: newPrice,
                      endDate: newEndDate, // Automatically update end date
                    });
                  }}
                >
                  <option value="monthly">Mensual (₡17,500)</option>
                  <option value="quarterly">Trimestral (₡47,250)</option>
                  <option value="annual">Anual (₡168,000)</option>
                  <option value="premium">Premium (₡25,000)</option>
                </select>
              </div>

              <div>
                <label className="label">Precio (₡)</label>
                <input
                  type="number"
                  required
                  min="0"
                  className="input"
                  value={membershipData.price}
                  onChange={(e) => setMembershipData({ ...membershipData, price: parseInt(e.target.value) || 0 })}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">Fecha Inicio</label>
                  <input
                    type="date"
                    required
                    className="input"
                    value={membershipData.startDate}
                    onChange={(e) => {
                      const newStartDate = e.target.value; // This is always in YYYY-MM-DD format
                      console.log('Start date changed:', newStartDate);
                      // Always recalculate end date when start date changes
                      const newEndDate = calculateEndDate(membershipData.planType, newStartDate);
                      console.log('Calculated end date:', newEndDate);
                      setMembershipData({
                        ...membershipData,
                        startDate: newStartDate,
                        endDate: newEndDate, // Automatically update end date
                      });
                    }}
                  />
                </div>
                <div>
                  <label className="label">Fecha Fin</label>
                  <input
                    type="date"
                    required
                    className="input"
                    value={membershipData.endDate}
                    onChange={(e) => {
                      // Allow manual override of end date if needed
                      console.log('End date manually changed:', e.target.value);
                      setMembershipData({ ...membershipData, endDate: e.target.value });
                    }}
                    title="Se calcula automáticamente según el plan. Puedes ajustarla manualmente si es necesario."
                  />
                </div>
              </div>

              <div>
                <label className="label">Estado</label>
                <select
                  required
                  className="input"
                  value={membershipData.status}
                  onChange={(e) => setMembershipData({ ...membershipData, status: e.target.value })}
                >
                  <option value="active">Activa</option>
                  <option value="suspended">Suspendida</option>
                  <option value="expired">Expirada</option>
                </select>
              </div>

              <div className="flex space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowMembershipModal(false);
                    setSelectedClient(null);
                  }}
                  className="btn btn-secondary flex-1"
                >
                  Cancelar
                </button>
                <button type="submit" className="btn btn-primary flex-1">
                  {selectedClient.membership ? 'Actualizar' : 'Crear'} Membresía
                </button>
              </div>

              {selectedClient.membership && (
                <div className="pt-4 border-t space-y-2">
                  <button
                    type="button"
                    onClick={() => handleSuspendMembership(selectedClient.membership!._id)}
                    className="btn btn-secondary w-full"
                  >
                    Suspender Membresía
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDeleteMembership(selectedClient.membership!._id)}
                    className="btn bg-red-600 hover:bg-red-700 text-white w-full"
                  >
                    Eliminar Membresía
                  </button>
                </div>
              )}
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

