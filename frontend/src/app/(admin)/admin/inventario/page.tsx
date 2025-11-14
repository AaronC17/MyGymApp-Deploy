'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';
import api from '@/lib/api';
import { Package, Plus, Edit, Trash2, ArrowLeft, LogOut, Search, Upload, X } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';

interface Product {
  _id: string;
  name: string;
  description: string;
  price: number;
  category: string;
  stock: number;
  quantitySold?: number;
  imageUrl?: string;
  isActive: boolean;
}

export default function InventarioPage() {
  const router = useRouter();
  const { user, logout, isAuthenticated } = useAuthStore();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [showImageModal, setShowImageModal] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [selectedProductForImage, setSelectedProductForImage] = useState<Product | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    price: 0,
    category: 'protein',
    stock: 0,
    isActive: true,
  });

  useEffect(() => {
    if (!isAuthenticated || user?.role !== 'admin') {
      router.push('/login');
      return;
    }
    fetchProducts();
  }, [isAuthenticated, user]);

  const fetchProducts = async () => {
    try {
      const params: any = { isActive: 'all' };
      if (categoryFilter) params.category = categoryFilter;
      const response = await api.get('/products', { params });
      setProducts(response.data.products || []);
    } catch (error) {
      console.error('Error fetching products:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, [categoryFilter]);

  const handleDelete = async (id: string) => {
    if (!confirm('¿Estás seguro de eliminar este producto?')) return;
    try {
      await api.delete(`/products/${id}`);
      fetchProducts();
    } catch (error) {
      console.error('Error deleting product:', error);
      alert('Error al eliminar producto');
    }
  };

  const openImageUploadModal = (product: Product) => {
    setSelectedProductForImage(product);
    setSelectedFile(null);
    setPreviewUrl(null);
    setShowImageModal(true);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        alert('Por favor selecciona un archivo de imagen');
        return;
      }
      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        alert('La imagen no debe exceder 5MB');
        return;
      }
      setSelectedFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreviewUrl(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleImageUpload = async () => {
    if (!selectedFile || !selectedProductForImage) return;

    setUploadingImage(true);
    try {
      const formData = new FormData();
      formData.append('image', selectedFile);

      const response = await api.post(
        `/products/${selectedProductForImage._id}/upload`,
        formData
      );

      if (response.data.imageUrl) {
        console.log('Image URL received:', response.data.imageUrl);
        // Recargar productos desde el servidor para asegurar que se actualice correctamente
        await fetchProducts();
        setShowImageModal(false);
        setSelectedFile(null);
        setPreviewUrl(null);
        setSelectedProductForImage(null);
        alert('Imagen subida exitosamente');
      } else {
        alert('Error: No se recibió la URL de la imagen');
      }
    } catch (error: any) {
      console.error('Error uploading image:', error);
      console.error('Error response:', error.response);
      const errorMessage = error.response?.data?.error 
        || error.response?.data?.message 
        || error.message 
        || 'Error al subir la imagen';
      alert(errorMessage);
    } finally {
      setUploadingImage(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      // Preparar datos para enviar
      const dataToSend = {
        name: formData.name.trim(),
        description: formData.description.trim(),
        price: parseFloat(formData.price.toString()),
        category: formData.category,
        stock: parseInt(formData.stock.toString(), 10),
        isActive: formData.isActive,
      };

      if (editingProduct) {
        await api.put(`/products/${editingProduct._id}`, dataToSend);
      } else {
        await api.post('/products', dataToSend);
      }
      setShowModal(false);
      setEditingProduct(null);
      setFormData({ name: '', description: '', price: 0, category: 'protein', stock: 0, isActive: true });
      fetchProducts();
    } catch (error: any) {
      console.error('Error saving product:', error);
      const errorMessage = error.response?.data?.details 
        ? Array.isArray(error.response.data.details) 
          ? error.response.data.details.join(', ')
          : error.response.data.details
        : error.response?.data?.error || error.response?.data?.message || 'Error al guardar producto';
      alert(errorMessage);
    }
  };

  const openEditModal = (product: Product) => {
    setEditingProduct(product);
    setFormData({
      name: product.name,
      description: product.description || '',
      price: product.price,
      category: product.category,
      stock: product.stock,
      isActive: product.isActive,
    });
    setShowModal(true);
  };

  const openCreateModal = () => {
    setEditingProduct(null);
    setFormData({ name: '', description: '', price: 0, category: 'protein', stock: 0, isActive: true });
    setShowModal(true);
  };

  const filteredProducts = products.filter(product =>
    product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    product.description.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getCategoryText = (category: string) => {
    const categories: { [key: string]: string } = {
      protein: 'Proteínas',
      accessories: 'Accesorios',
      clothing: 'Ropa',
    };
    return categories[category] || category;
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
                <h1 className="text-2xl font-bold text-gray-900">Inventario</h1>
                <p className="text-sm text-gray-600">Gestiona los productos del gimnasio</p>
              </div>
            </div>
            <button onClick={logout} className="text-gray-700 hover:text-red-600">
              <LogOut className="h-5 w-5" />
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Filters and Actions */}
        <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4">
          <div className="flex flex-1 gap-4 max-w-2xl">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                type="text"
                placeholder="Buscar productos..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="input pl-10"
              />
            </div>
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="input"
            >
              <option value="">Todas las categorías</option>
              <option value="protein">Proteínas</option>
              <option value="accessories">Accesorios</option>
              <option value="clothing">Ropa</option>
            </select>
          </div>
          <button onClick={openCreateModal} className="btn btn-primary flex items-center space-x-2">
            <Plus className="h-5 w-5" />
            <span>Nuevo Producto</span>
          </button>
        </div>

        {/* Products Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filteredProducts.length === 0 ? (
            <div className="col-span-full text-center py-12">
              <Package className="h-16 w-16 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600">No hay productos disponibles</p>
            </div>
          ) : (
            filteredProducts.map((product) => (
              <div key={product._id} className="card group hover:shadow-2xl transition-all duration-300">
                {product.imageUrl ? (
                  <div className="relative w-full h-48 mb-4 rounded-lg overflow-hidden bg-secondary-100 border border-gray-200 shadow-md group-hover:shadow-xl transition-shadow duration-300">
                    <Image
                      src={product.imageUrl}
                      alt={product.name}
                      fill
                      className="object-cover group-hover:scale-105 transition-transform duration-300"
                      unoptimized={product.imageUrl.includes('localhost')}
                      onError={(e) => {
                        console.error('Error loading image:', product.imageUrl);
                        e.currentTarget.style.display = 'none';
                      }}
                    />
                  </div>
                ) : (
                  <div className="w-full h-48 bg-gray-200 rounded-lg mb-4 flex items-center justify-center">
                    <Package className="h-12 w-12 text-gray-400" />
                  </div>
                )}

                <div className="flex justify-between items-start mb-2">
                  <div className="flex-1">
                    <h3 className="font-semibold text-gray-900">{product.name}</h3>
                    <p className="text-xs text-gray-500">{getCategoryText(product.category)}</p>
                  </div>
                  <div className="flex space-x-2 ml-2">
                    <button
                      onClick={() => openImageUploadModal(product)}
                      className="text-blue-600 hover:text-blue-900"
                      title="Subir imagen"
                    >
                      <Upload className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => openEditModal(product)}
                      className="text-primary-600 hover:text-primary-900"
                      title="Editar"
                    >
                      <Edit className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(product._id)}
                      className="text-red-600 hover:text-red-900"
                      title="Eliminar"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                <p className="text-sm text-gray-600 mb-3 line-clamp-2">{product.description}</p>

                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="text-xl font-bold text-primary-600">
                        ₡{product.price.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.')}
                      </p>
                      <p className="text-xs text-gray-500">
                        Stock: <span className={product.stock > 0 ? 'text-green-600' : 'text-red-600'}>
                          {product.stock}
                        </span>
                      </p>
                    </div>
                    <span className={`px-2 py-1 rounded text-xs font-medium ${
                      product.isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                    }`}>
                      {product.isActive ? 'Activo' : 'Inactivo'}
                    </span>
                  </div>
                  <div className="pt-2 border-t">
                    <p className="text-xs text-gray-600">
                      Vendidos: <span className="font-semibold text-primary-600">
                        {product.quantitySold || 0}
                      </span>
                    </p>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Stats */}
        <div className="mt-8 grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="card">
            <p className="text-sm text-gray-600">Total Productos</p>
            <p className="text-2xl font-bold text-gray-900">{products.length}</p>
          </div>
          <div className="card">
            <p className="text-sm text-gray-600">Productos Activos</p>
            <p className="text-2xl font-bold text-green-600">
              {products.filter(p => p.isActive).length}
            </p>
          </div>
          <div className="card">
            <p className="text-sm text-gray-600">Total Vendidos</p>
            <p className="text-2xl font-bold text-blue-600">
              {products.reduce((sum, p) => sum + (p.quantitySold || 0), 0)}
            </p>
          </div>
          <div className="card">
            <p className="text-sm text-gray-600">Valor Total Inventario</p>
            <p className="text-2xl font-bold text-primary-600">
              ₡{products.reduce((sum, p) => sum + (p.price * p.stock), 0).toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.')}
            </p>
          </div>
        </div>
      </main>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-md w-full p-6 max-h-[90vh] overflow-y-auto shadow-xl border border-gray-200">
            <h2 className="text-xl font-bold mb-4">
              {editingProduct ? 'Editar Producto' : 'Nuevo Producto'}
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
                <label className="label">Descripción</label>
                <textarea
                  required
                  rows={3}
                  className="input"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">Precio (₡)</label>
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
                  <label className="label">Stock</label>
                  <input
                    type="number"
                    required
                    min="0"
                    className="input"
                    value={formData.stock}
                    onChange={(e) => setFormData({ ...formData, stock: parseInt(e.target.value) || 0 })}
                  />
                </div>
              </div>
              <div>
                <label className="label">Categoría</label>
                <select
                  required
                  className="input"
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                >
                  <option value="protein">Proteínas</option>
                  <option value="accessories">Accesorios</option>
                  <option value="clothing">Ropa</option>
                </select>
              </div>
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="isActive"
                  checked={formData.isActive}
                  onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                  className="mr-2"
                />
                <label htmlFor="isActive" className="text-sm text-gray-700">
                  Producto activo
                </label>
              </div>
              <div className="flex space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowModal(false);
                    setEditingProduct(null);
                  }}
                  className="btn btn-secondary flex-1"
                >
                  Cancelar
                </button>
                <button type="submit" className="btn btn-primary flex-1">
                  {editingProduct ? 'Actualizar' : 'Crear'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Image Upload Modal */}
      {showImageModal && selectedProductForImage && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold">Subir Imagen</h2>
              <button
                onClick={() => {
                  setShowImageModal(false);
                  setSelectedFile(null);
                  setPreviewUrl(null);
                  setSelectedProductForImage(null);
                }}
                className="text-gray-500 hover:text-gray-700"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <p className="text-sm text-gray-600 mb-2">
                  Producto: <span className="font-semibold">{selectedProductForImage.name}</span>
                </p>
                {selectedProductForImage.imageUrl && (
                  <div className="mb-4">
                    <p className="text-sm text-gray-600 mb-2">Imagen actual:</p>
                    <div className="relative w-full h-32 rounded-lg overflow-hidden border bg-secondary-100">
                      <Image
                        src={selectedProductForImage.imageUrl}
                        alt={selectedProductForImage.name}
                        fill
                        className="object-cover"
                        unoptimized={selectedProductForImage.imageUrl.includes('localhost')}
                      />
                    </div>
                  </div>
                )}
              </div>

              <div>
                <label className="label">Seleccionar imagen</label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleFileSelect}
                  className="input"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Formatos: JPG, PNG, GIF. Tamaño máximo: 5MB
                </p>
              </div>

              {previewUrl && (
                <div>
                  <p className="text-sm text-gray-600 mb-2">Vista previa:</p>
                  <div className="relative w-full h-48 rounded-lg overflow-hidden border">
                    <Image
                      src={previewUrl}
                      alt="Preview"
                      fill
                      className="object-cover"
                    />
                  </div>
                </div>
              )}

              <div className="flex space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowImageModal(false);
                    setSelectedFile(null);
                    setPreviewUrl(null);
                    setSelectedProductForImage(null);
                  }}
                  className="btn btn-secondary flex-1"
                  disabled={uploadingImage}
                >
                  Cancelar
                </button>
                <button
                  onClick={handleImageUpload}
                  disabled={!selectedFile || uploadingImage}
                  className="btn btn-primary flex-1 flex items-center justify-center space-x-2"
                >
                  {uploadingImage ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      <span>Subiendo...</span>
                    </>
                  ) : (
                    <>
                      <Upload className="h-4 w-4" />
                      <span>Subir Imagen</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

