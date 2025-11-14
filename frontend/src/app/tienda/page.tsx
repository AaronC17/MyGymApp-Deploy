'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Dumbbell, ShoppingCart, User, LogOut } from 'lucide-react';
import api from '@/lib/api';
import { useAuthStore } from '@/store/authStore';
import Image from 'next/image';

interface Product {
  _id: string;
  name: string;
  description: string;
  price: number;
  category: string;
  stock: number;
  imageUrl?: string;
}

export default function TiendaPage() {
  const { user, isAuthenticated, logout } = useAuthStore();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [category, setCategory] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState('');

  const handleLogout = () => {
    logout();
    window.location.href = '/';
  };

  useEffect(() => {
    fetchProducts();
  }, [category]);

  const fetchProducts = async () => {
    try {
      setLoading(true);
      const params: any = { isActive: true };
      if (category) params.category = category;

      const response = await api.get('/products', { params });
      setProducts(response.data.products);
    } catch (error) {
      console.error('Error fetching products:', error);
    } finally {
      setLoading(false);
    }
  };

  const categories = [
    { value: '', label: 'Todos' },
    { value: 'protein', label: 'Proteínas' },
    { value: 'accessories', label: 'Accesorios' },
    { value: 'clothing', label: 'Ropa' },
  ];

  const priceFormatter = useMemo(
    () =>
      new Intl.NumberFormat('es-CR', {
        style: 'currency',
        currency: 'CRC',
        minimumFractionDigits: 0,
      }),
    []
  );

  const filteredProducts = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    if (!term) return products;
    return products.filter(
      (product) =>
        product.name.toLowerCase().includes(term) ||
        product.description.toLowerCase().includes(term)
    );
  }, [products, searchTerm]);

  return (
    <div className="min-h-screen bg-white">
      <header className="bg-white/80 backdrop-blur-md shadow-lg border-b border-gray-200/50 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <Link href="/" className="flex items-center space-x-2">
              <Dumbbell className="h-8 w-8 text-primary-600" />
              <span className="text-2xl font-bold text-gray-900">Energym</span>
            </Link>
            <div className="flex items-center space-x-4">
              {isAuthenticated ? (
                <>
                  <Link 
                    href={user?.role === 'admin' ? '/admin/dashboard' : '/dashboard'}
                    className="flex items-center space-x-2 text-gray-700 hover:text-primary-600"
                  >
                    <User className="h-5 w-5" />
                    <span className="hidden md:inline">{user?.name}</span>
                  </Link>
                  <button 
                    onClick={handleLogout}
                    className="flex items-center space-x-2 text-gray-700 hover:text-red-600"
                  >
                    <LogOut className="h-5 w-5" />
                    <span className="hidden md:inline">Salir</span>
                  </button>
                </>
              ) : (
                <Link href="/login" className="btn btn-primary">
                  Iniciar Sesión
                </Link>
              )}
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
        <section className="rounded-3xl bg-gradient-to-r from-primary-600 to-primary-500 text-white p-8 shadow-lg">
          <p className="uppercase tracking-[0.35em] text-xs text-white/70">Tienda oficial</p>
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="space-y-3">
              <h1 className="text-3xl font-bold">Equipa tus rutinas con productos curados por Energym</h1>
              <p className="text-white/80 max-w-2xl">
                Suplementos, accesorios y apparel seleccionados por nuestros coaches para complementar cualquier plan de entrenamiento.
              </p>
            </div>
            <div className="flex gap-3">
              <button className="rounded-2xl bg-white text-primary-700 px-5 py-3 text-sm font-semibold shadow">
                Ver catálogo
              </button>
              <button className="rounded-2xl border border-white/60 px-5 py-3 text-sm text-white/90">
                Ayuda con compras
              </button>
            </div>
          </div>
        </section>

        <section className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="relative w-full md:max-w-md">
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar por nombre o ingrediente"
              className="w-full rounded-2xl border border-gray-200 bg-white py-3 pl-4 pr-4 text-sm text-gray-700 shadow-sm focus:border-primary-400 focus:outline-none"
            />
          </div>
          <div className="flex flex-wrap gap-2">
            {categories.map((cat) => (
              <button
                key={cat.value}
                onClick={() => setCategory(cat.value)}
                className={`rounded-2xl px-4 py-2 text-sm font-medium transition ${
                  category === cat.value
                    ? 'bg-primary-600 text-white shadow'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>
        </section>

        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Cargando productos...</p>
          </div>
        ) : filteredProducts.length === 0 ? (
          <div className="text-center py-12">
            <ShoppingCart className="h-16 w-16 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600">No hay productos disponibles</p>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredProducts.map((product) => (
              <div
                key={product._id}
                className="rounded-3xl border border-gray-100 bg-white p-5 shadow-sm transition hover:-translate-y-1 hover:shadow-xl"
              >
                <div className="flex items-center justify-between text-xs text-gray-500 mb-3">
                  <span className="rounded-full bg-gray-100 px-3 py-1 uppercase tracking-[0.2em]">
                    {product.category || 'General'}
                  </span>
                  <span className={product.stock > 0 ? 'text-emerald-600' : 'text-red-500'}>
                    {product.stock > 0 ? 'Disponible' : 'Agotado'}
                  </span>
                </div>
                {product.imageUrl ? (
                  <div className="relative w-full h-48 mb-4 rounded-2xl overflow-hidden bg-gray-50">
                    <Image
                      src={product.imageUrl}
                      alt={product.name}
                      fill
                      className="object-cover transition duration-500 hover:scale-105"
                    />
                  </div>
                ) : (
                  <div className="w-full h-48 bg-gray-200 rounded-2xl mb-4 flex items-center justify-center">
                    <ShoppingCart className="h-12 w-12 text-gray-400" />
                  </div>
                )}
                
                <h3 className="text-xl font-semibold mb-2 text-gray-900">{product.name}</h3>
                <p className="text-gray-600 text-sm mb-4 line-clamp-2">{product.description}</p>
                
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-2xl font-bold text-primary-600">{priceFormatter.format(product.price)}</p>
                    <p className="text-xs text-gray-500">Stock: {product.stock}</p>
                  </div>
                  <button className="rounded-2xl bg-primary-600 px-4 py-2 text-sm font-semibold text-white shadow hover:bg-primary-500">
                    Agregar
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

