'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { Dumbbell, Users, Award, ShoppingBag, User, LogOut } from 'lucide-react';
import { useAuthStore } from '@/store/authStore';

export default function HomePage() {
  const { user, isAuthenticated, logout } = useAuthStore();

  const handleLogout = () => {
    logout();
    window.location.href = '/';
  };
  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-md shadow-lg border-b border-gray-200/50 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center space-x-2">
              <Dumbbell className="h-8 w-8 text-primary-600" />
              <span className="text-2xl font-bold text-gray-900">Energym</span>
            </div>
            <nav className="hidden md:flex space-x-6">
              <Link href="/planes" className="text-gray-700 hover:text-primary-600 transition">
                Planes
              </Link>
              <Link href="/tienda" className="text-gray-700 hover:text-primary-600 transition">
                Tienda
              </Link>
              <Link href="/contacto" className="text-gray-700 hover:text-primary-600 transition">
                Contacto
              </Link>
            </nav>
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

      {/* Hero Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="text-center">
          <h1 className="text-5xl md:text-6xl font-bold text-gray-900 mb-6">
            Transforma tu cuerpo,
            <br />
            <span className="text-primary-600">Transforma tu vida</span>
          </h1>
          <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
            Únete a Energym y alcanza tus objetivos fitness con nuestros planes personalizados,
            equipamiento de última generación y el mejor equipo de entrenadores.
          </p>
          <div className="flex gap-4 justify-center">
            <Link href="/planes" className="btn btn-primary text-lg px-8 py-3">
              Ver Planes
            </Link>
            <Link href="/register" className="btn btn-secondary text-lg px-8 py-3">
              Registrarse
            </Link>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="grid md:grid-cols-3 gap-8">
          <div className="card text-center group">
            <div className="flex justify-center mb-4">
              <div className="bg-gradient-to-br from-primary-100 to-primary-200 p-4 rounded-full shadow-lg shadow-primary-500/20 group-hover:shadow-xl group-hover:shadow-primary-500/30 transition-all duration-300 group-hover:scale-110">
                <Users className="h-8 w-8 text-primary-600" />
              </div>
            </div>
            <h3 className="text-xl font-semibold mb-2 text-gray-900">Entrenadores Expertos</h3>
            <p className="text-gray-600">
              Nuestro equipo de profesionales certificados te guiará en cada paso del camino.
            </p>
          </div>

          <div className="card text-center group">
            <div className="flex justify-center mb-4">
              <div className="bg-gradient-to-br from-primary-100 to-primary-200 p-4 rounded-full shadow-lg shadow-primary-500/20 group-hover:shadow-xl group-hover:shadow-primary-500/30 transition-all duration-300 group-hover:scale-110">
                <Award className="h-8 w-8 text-primary-600" />
              </div>
            </div>
            <h3 className="text-xl font-semibold mb-2 text-gray-900">Planes Personalizados</h3>
            <p className="text-gray-600">
              Rutinas adaptadas a tus objetivos, ya sea perder peso, ganar masa muscular o mejorar tu condición.
            </p>
          </div>

          <div className="card text-center group">
            <div className="flex justify-center mb-4">
              <div className="bg-gradient-to-br from-primary-100 to-primary-200 p-4 rounded-full shadow-lg shadow-primary-500/20 group-hover:shadow-xl group-hover:shadow-primary-500/30 transition-all duration-300 group-hover:scale-110">
                <ShoppingBag className="h-8 w-8 text-primary-600" />
              </div>
            </div>
            <h3 className="text-xl font-semibold mb-2 text-gray-900">Tienda de Suplementos</h3>
            <p className="text-gray-600">
              Productos de calidad premium para complementar tu entrenamiento y nutrición.
            </p>
          </div>
        </div>
      </section>

      {/* Plans Preview */}
      <section className="bg-gray-50 py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-center mb-12">Nuestros Planes</h2>
          <div className="grid md:grid-cols-4 gap-6">
            {[
              { name: 'Mensual', price: 17500, features: ['Acceso ilimitado', 'Entrenadores', 'App móvil'] },
              { name: 'Trimestral', price: 47250, features: ['3 meses', 'Ahorra 10%', 'Todos los beneficios'] },
              { name: 'Anual', price: 168000, features: ['12 meses', 'Ahorra 20%', 'Regalo especial'] },
              { name: 'Premium', price: 25000, features: ['Todo incluido', 'Entrenador personal', 'Nutricionista'] },
            ].map((plan, idx) => (
                  <div key={idx} className="card border-2 border-gray-200 hover:border-primary-500 hover:shadow-2xl hover:shadow-primary-500/20 transition-all duration-300 bg-white group">
                <h3 className="text-xl font-bold mb-2">{plan.name}</h3>
                <div className="mb-4">
                  <span className="text-3xl font-bold text-primary-600">₡{plan.price.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.')}</span>
                  <span className="text-gray-600">/mes</span>
                </div>
                <ul className="space-y-2 mb-6">
                  {plan.features.map((feature, i) => (
                    <li key={i} className="flex items-center text-sm text-gray-600">
                      <span className="text-primary-600 mr-2">✓</span>
                      {feature}
                    </li>
                  ))}
                </ul>
                <Link href="/planes" className="btn btn-primary w-full">
                  Elegir Plan
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

          {/* Footer */}
          <footer className="bg-gray-900 text-white py-12 mt-20 relative overflow-hidden">
            {/* Línea azul mejorada con gradiente y sombra */}
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-primary-400 via-primary-600 to-primary-400 shadow-lg shadow-primary-500/50"></div>
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="grid md:grid-cols-3 gap-8">
                <div>
                  <div className="flex items-center space-x-2 mb-4">
                    <Dumbbell className="h-6 w-6" />
                    <span className="text-xl font-bold">Energym</span>
                  </div>
                  <p className="text-gray-400">
                    Tu gimnasio de confianza para alcanzar tus objetivos fitness.
                  </p>
                </div>
                <div>
                  <h4 className="font-semibold mb-4">Enlaces</h4>
                  <ul className="space-y-2 text-gray-400">
                    <li><Link href="/planes" className="hover:text-white transition">Planes</Link></li>
                    <li><Link href="/tienda" className="hover:text-white transition">Tienda</Link></li>
                    <li><Link href="/contacto" className="hover:text-white transition">Contacto</Link></li>
                  </ul>
                </div>
                <div>
                  <h4 className="font-semibold mb-4">Contacto</h4>
                  <p className="text-gray-400">
                    Email: info@energym.com<br />
                    Teléfono: +1 (555) 123-4567
                  </p>
                </div>
              </div>
              <div className="border-t border-gray-800 mt-8 pt-8 text-center text-gray-400">
                <p>&copy; 2024 Energym. Todos los derechos reservados.</p>
              </div>
            </div>
          </footer>
    </div>
  );
}

