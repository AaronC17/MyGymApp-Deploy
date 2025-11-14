'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  Dumbbell,
  Mail,
  Phone,
  MapPin,
  User,
  LogOut,
  Clock,
  MessageCircle,
} from 'lucide-react';
import { useAuthStore } from '@/store/authStore';

export default function ContactoPage() {
  const { user, isAuthenticated, logout } = useAuthStore();
  const [formData, setFormData] = useState({
    name: user?.name || '',
    email: user?.email || '',
    message: '',
  });
  const [submitted, setSubmitted] = useState(false);

  const contactMethods = [
    {
      title: 'Visítanos',
      description: '123 Calle Principal, Ciudad, Estado 12345',
      icon: MapPin,
      accent: 'from-rose-500/20 to-rose-500/0',
    },
    {
      title: 'Llámanos',
      description: '+1 (555) 123-4567',
      icon: Phone,
      accent: 'from-amber-500/20 to-amber-500/0',
    },
    {
      title: 'Escríbenos',
      description: 'info@energym.com',
      icon: Mail,
      accent: 'from-sky-500/20 to-sky-500/0',
    },
  ];

  const handleLogout = () => {
    logout();
    window.location.href = '/';
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Aquí iría la lógica para enviar el formulario
    setSubmitted(true);
    setTimeout(() => setSubmitted(false), 3000);
  };

  return (
    <div className="min-h-screen bg-white">
      <header className="bg-white/80 backdrop-blur-md shadow border-b border-gray-200/60 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between py-4">
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

      <main className="relative max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-16 space-y-16">
        <div className="absolute inset-0 -z-10 opacity-60">
          <div className="absolute -top-10 left-1/4 h-44 w-44 bg-gradient-to-br from-primary-200 to-transparent rounded-full blur-3xl" />
          <div className="absolute top-20 right-0 h-64 w-64 bg-gradient-to-bl from-purple-100 to-transparent rounded-full blur-3xl" />
          <div className="absolute bottom-0 left-0 right-0 mx-auto h-72 w-72 bg-gradient-to-t from-primary-50 to-transparent rounded-full blur-3xl" />
        </div>

        <section className="text-center space-y-5">
          <p className="uppercase tracking-[0.4em] text-xs text-primary-500">Contacto</p>
          <h1 className="text-4xl font-bold text-gray-900">Hablemos sobre tu siguiente objetivo</h1>
          <p className="text-gray-600 max-w-2xl mx-auto">
            Escríbenos para resolver dudas sobre planes, agendar evaluaciones o coordinar retos personalizados. Respondemos en menos de 24 horas.
          </p>
        </section>

        <section className="relative rounded-4xl border border-gray-200/80 bg-white/70 shadow-sm">
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary-200 to-transparent" />
            <div className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-primary-200 to-transparent" />
          </div>
          <div className="grid gap-8 p-8 md:p-10 lg:grid-cols-3">
            {contactMethods.map(({ title, description, icon: Icon }) => (
              <div
                key={title}
                className="flex flex-col items-center text-center space-y-4"
              >
                <div className="h-14 w-14 rounded-full bg-primary-50 text-primary-600 flex items-center justify-center shadow-sm">
                  <Icon className="h-5 w-5" />
                </div>
                <p className="text-sm uppercase tracking-[0.3em] text-gray-400">{title}</p>
                <p className="text-lg font-semibold text-gray-900">{description}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="grid gap-10 lg:grid-cols-2">
          <div className="relative rounded-3xl border border-gray-200 p-8 bg-white shadow-md overflow-hidden">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(59,130,246,0.08),_transparent_55%)]" />
            <div className="relative space-y-6">
              <div className="space-y-2">
                <p className="uppercase tracking-[0.3em] text-xs text-primary-500">Horarios</p>
                <h2 className="text-2xl font-semibold text-gray-900">Siempre disponibles</h2>
              </div>
              <div className="grid grid-cols-2 gap-6">
                {[
                  { label: 'Semana', value: '6:00 AM – 10:00 PM' },
                  { label: 'Sábados', value: '8:00 AM – 8:00 PM' },
                  { label: 'Domingos', value: '9:00 AM – 6:00 PM' },
                  { label: 'Atención digital', value: '24/7' },
                ].map(({ label, value }) => (
                  <div key={label} className="space-y-1">
                    <div className="flex items-center gap-2 text-gray-500">
                      <Clock className="h-4 w-4" />
                      <span>{label}</span>
                    </div>
                    <p className="text-lg font-semibold">{value}</p>
                  </div>
                ))}
              </div>

              <div className="border-t border-gray-200 pt-6 space-y-4">
                <h3 className="text-sm uppercase tracking-[0.3em] text-gray-400">Visítanos</h3>
                <p className="text-gray-700">123 Calle Principal, Ciudad, Estado 12345</p>
                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary-50 text-primary-700">
                  <MessageCircle className="h-4 w-4" />
                  <span>Soporte por WhatsApp</span>
                </div>
              </div>
            </div>
          </div>

          <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-white via-primary-50/40 to-white p-[1px] shadow-xl">
            <div className="relative rounded-[26px] bg-white/90 p-8">
              <div className="absolute inset-x-6 top-0 h-1 rounded-full bg-gradient-to-r from-primary-300 via-primary-400 to-primary-300" />
              <div className="relative space-y-2 pb-6">
                <p className="uppercase tracking-[0.4em] text-xs text-primary-500">Formulario</p>
                <h2 className="text-2xl font-semibold text-gray-900">Envíanos un mensaje</h2>
                <p className="text-gray-500">Nos pondremos en contacto contigo en menos de un día hábil.</p>
              </div>

              {submitted ? (
                <div className="rounded-2xl bg-green-50 border border-green-200 text-green-800 p-4 text-center">
                  <p className="font-semibold">¡Mensaje enviado!</p>
                  <p className="text-sm">Revisaremos tu solicitud y te responderemos pronto.</p>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-6">
                  <div className="grid gap-5 md:grid-cols-2">
                    <div className="space-y-2">
                      <label htmlFor="name" className="text-sm font-semibold tracking-[0.2em] text-gray-500">
                        Nombre completo
                      </label>
                      <input
                        id="name"
                        type="text"
                        required
                        className="w-full rounded-2xl border border-gray-200 bg-gray-50/60 px-4 py-3 text-gray-900 shadow-inner focus:border-transparent focus:outline-none focus:ring-2 focus:ring-primary-300"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      />
                    </div>

                    <div className="space-y-2">
                      <label htmlFor="email" className="text-sm font-semibold tracking-[0.2em] text-gray-500">
                        Correo electrónico
                      </label>
                      <input
                        id="email"
                        type="email"
                        required
                        className="w-full rounded-2xl border border-gray-200 bg-gray-50/60 px-4 py-3 text-gray-900 shadow-inner focus:border-transparent focus:outline-none focus:ring-2 focus:ring-primary-300"
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label htmlFor="message" className="text-sm font-semibold tracking-[0.2em] text-gray-500">
                      ¿En qué podemos ayudarte?
                    </label>
                    <textarea
                      id="message"
                      required
                      rows={6}
                      className="w-full rounded-3xl border border-gray-200 bg-gray-50/60 px-4 py-4 text-gray-900 shadow-inner focus:border-transparent focus:outline-none focus:ring-2 focus:ring-primary-300"
                      value={formData.message}
                      onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                    />
                  </div>

                  <button
                    type="submit"
                    className="w-full rounded-2xl bg-primary-600 py-3.5 text-base font-semibold text-white shadow-lg shadow-primary-600/30 transition hover:bg-primary-500"
                  >
                    Enviar mensaje
                  </button>
                </form>
              )}
            </div>
          </div>
        </section>

        <section className="rounded-3xl bg-gradient-to-r from-primary-600 via-primary-500 to-primary-600 text-white p-8 md:p-10 flex flex-col md:flex-row items-center justify-between gap-6 shadow-xl">
          <div className="space-y-3">
            <p className="uppercase tracking-[0.4em] text-xs text-white/70">Soporte prioritario</p>
            <h3 className="text-2xl font-semibold">¿Necesitas atención inmediata?</h3>
            <p className="text-white/90 max-w-xl">
              Nuestro equipo responde más rápido a través de llamada o correo directo durante horarios laborales extendidos.
            </p>
          </div>
          <div className="flex flex-wrap gap-4">
            <a
              href="tel:+15551234567"
              className="px-6 py-3 rounded-2xl bg-white/15 border border-white/30 hover:bg-white/25 transition"
            >
              Llamar ahora
            </a>
            <a
              href="mailto:info@energym.com"
              className="px-6 py-3 rounded-2xl bg-white text-primary-700 font-semibold shadow-md"
            >
              Escribir correo
            </a>
          </div>
        </section>
      </main>
    </div>
  );
}

