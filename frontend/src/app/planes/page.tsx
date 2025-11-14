'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { Check, Dumbbell, User, LogOut } from 'lucide-react';
import { useAuthStore } from '@/store/authStore';

const plans = [
  {
    name: 'Mensual',
    price: 17500,
    period: 'mes',
    features: [
      'Acceso ilimitado al gimnasio',
      'Uso de todos los equipos',
      'Consulta con entrenadores',
      'App móvil incluida',
      'Clases grupales',
    ],
    popular: false,
  },
  {
    name: 'Trimestral',
    price: 47250, // 17,500 * 3 * 0.90 (10% descuento)
    period: '3 meses',
    savings: 'Ahorra 10%',
    originalPrice: 52500, // 17,500 * 3
    features: [
      'Todo del plan Mensual',
      'Ahorro del 10%',
      'Renovación automática',
      'Prioridad en reservas',
    ],
    popular: true,
  },
  {
    name: 'Anual',
    price: 168000, // 17,500 * 12 * 0.80 (20% descuento)
    period: '12 meses',
    savings: 'Ahorra 20%',
    originalPrice: 210000, // 17,500 * 12
    features: [
      'Todo del plan Trimestral',
      'Ahorro del 20%',
      'Regalo de bienvenida',
      'Sesión personalizada gratis',
      'Descuentos en productos',
    ],
    popular: false,
  },
  {
    name: 'Premium',
    price: 25000,
    period: 'mes',
    features: [
      'Todo del plan Mensual',
      'Entrenador personal (2 sesiones/mes)',
      'Consulta con nutricionista',
      'Análisis de composición corporal',
      'Plan nutricional personalizado',
    ],
    popular: false,
  },
];

export default function PlansPage() {
  const { user, isAuthenticated, logout } = useAuthStore();

  const handleLogout = () => {
    logout();
    window.location.href = '/';
  };

  return (
    <div className="min-h-screen bg-white">
      <header className="bg-white/80 backdrop-blur-md shadow-lg border-b border-gray-200/50 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <Link href={isAuthenticated ? (user?.role === 'admin' ? '/admin/dashboard' : '/dashboard') : '/'} className="flex items-center space-x-2">
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

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Elige el Plan Perfecto para Ti
          </h1>
          <p className="text-xl text-gray-600">
            Planes flexibles adaptados a tus necesidades y objetivos
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
          {plans.map((plan, idx) => (
            <div
              key={idx}
              className={`card relative group flex flex-col ${plan.popular ? 'border-2 border-primary-500 shadow-xl shadow-primary-500/20 ring-2 ring-primary-500/20' : 'border-2 border-gray-200 hover:border-primary-300'}`}
            >
              {plan.popular && (
                <div className="absolute -top-4 left-1/2 transform -translate-x-1/2 z-10">
                  <span className="bg-primary-600 text-white px-4 py-1 rounded-full text-sm font-medium shadow-lg">
                    Más Popular
                  </span>
                </div>
              )}

              <div className="text-center mb-6 pt-2">
                <h3 className="text-2xl font-bold text-gray-900 mb-3">{plan.name}</h3>
                <div className="mb-3">
                  {plan.originalPrice && (
                    <div className="text-sm text-gray-500 line-through mb-1">
                      ₡{plan.originalPrice.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.')}
                    </div>
                  )}
                  <div className="flex items-baseline justify-center">
                    <span className="text-4xl font-bold text-primary-600">
                      ₡{plan.price.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.')}
                    </span>
                    {plan.period && (
                      <span className="text-lg text-gray-600 ml-2">/{plan.period}</span>
                    )}
                  </div>
                  {plan.period && plan.period !== 'mes' && (
                    <div className="text-sm text-gray-500 mt-2">
                      ₡{Math.round(plan.price / (plan.period === '3 meses' ? 3 : 12)).toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.')}/mes
                    </div>
                  )}
                </div>
                {plan.savings && (
                  <p className="text-sm text-green-600 font-semibold">{plan.savings}</p>
                )}
              </div>

              <ul className="space-y-3 mb-8 flex-grow">
                {plan.features.map((feature, i) => (
                  <li key={i} className="flex items-start">
                    <Check className="h-5 w-5 text-primary-600 mr-2 flex-shrink-0 mt-0.5" />
                    <span className="text-gray-700 text-sm leading-relaxed">{feature}</span>
                  </li>
                ))}
              </ul>

              <div className="mt-auto pt-4">
                {isAuthenticated ? (
                  <Link
                    href={`/suscripcion?plan=${plan.name.toLowerCase()}`}
                    className={`btn w-full text-center block py-3 px-6 rounded-lg font-medium transition-all duration-200 ${
                      plan.popular 
                        ? 'bg-primary-600 text-white hover:bg-primary-700 shadow-md hover:shadow-lg' 
                        : 'bg-white text-primary-600 border-2 border-primary-600 hover:bg-primary-50 hover:border-primary-700'
                    }`}
                  >
                    Suscribirse
                  </Link>
                ) : (
                  <Link
                    href="/register"
                    className={`btn w-full text-center block py-3 px-6 rounded-lg font-medium transition-all duration-200 ${
                      plan.popular 
                        ? 'bg-primary-600 text-white hover:bg-primary-700 shadow-md hover:shadow-lg' 
                        : 'bg-white text-primary-600 border-2 border-primary-600 hover:bg-primary-50 hover:border-primary-700'
                    }`}
                  >
                    Elegir Plan
                  </Link>
                )}
              </div>
            </div>
          ))}
        </div>

        <div className="mt-16 text-center">
          <p className="text-gray-600 mb-4">
            ¿Tienes preguntas sobre nuestros planes?
          </p>
          <Link href="/contacto" className="text-primary-600 hover:underline font-medium">
            Contáctanos
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
              &copy; 2024 Energym. Todos los derechos reservados.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}

