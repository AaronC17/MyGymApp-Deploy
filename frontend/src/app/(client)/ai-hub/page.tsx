'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';
import api from '@/lib/api';
import { Send, Bot, User, Sparkles, ArrowLeft, LogOut, ChefHat, Dumbbell, Camera, Image as ImageIcon, TrendingUp, Settings, BarChart3, Upload, X, CheckCircle, Save, AlertCircle, Download, Trash2, FileText, Calendar } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import Toast from '@/components/Toast';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  timestamp?: Date;
  images?: string[]; // URLs of images attached to the message
  pdfUrl?: string; // URL of PDF attached to the message
}

interface BodyPhoto {
  _id: string;
  url: string;
  date: string;
  type: 'front' | 'side' | 'back';
  notes?: string;
}

interface UserProfile {
  weight?: number;
  height?: number;
  age?: number;
  goal?: string;
  bodyFat?: number;
  muscleMass?: number;
  fitnessLevel?: 'beginner' | 'intermediate' | 'advanced';
  trainingExperience?: {
    years?: number;
    months?: number;
  };
  injuries?: Array<{ type: string; description?: string }>;
  injuriesText?: string; // Raw text for editing
  preferences?: {
    workoutDays?: number[];
    preferredTime?: string;
    equipment?: string[];
  };
  bodyPhotos?: BodyPhoto[];
}

export default function AIHubPage() {
  const router = useRouter();
  const { user, isAuthenticated, logout } = useAuthStore();
  // Separate message states for each tab
  const [chatMessages, setChatMessages] = useState<Message[]>([]);
  const [mealMessages, setMealMessages] = useState<Message[]>([]);
  const [workoutMessages, setWorkoutMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  // Separate loading states for each chat
  const [chatLoading, setChatLoading] = useState(false);
  const [mealLoading, setMealLoading] = useState(false);
  const [workoutLoading, setWorkoutLoading] = useState(false);
  
  // Get current loading state based on active tab
  const getCurrentLoading = () => {
    switch (activeTab) {
      case 'chat': return chatLoading;
      case 'meal': return mealLoading;
      case 'workout': return workoutLoading;
      default: return false;
    }
  };
  const [activeTab, setActiveTab] = useState<'chat' | 'meal' | 'workout' | 'progress' | 'settings'>('chat');
  const [chatImages, setChatImages] = useState<File[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const [photoUploadCount, setPhotoUploadCount] = useState<{ count: number; resetTime: string } | null>(null);
  
  // Get current messages based on active tab
  const getCurrentMessages = () => {
    switch (activeTab) {
      case 'chat': return chatMessages;
      case 'meal': return mealMessages;
      case 'workout': return workoutMessages;
      default: return [];
    }
  };
  
  const setCurrentMessages = (messages: Message[]) => {
    switch (activeTab) {
      case 'chat': setChatMessages(messages); break;
      case 'meal': setMealMessages(messages); break;
      case 'workout': setWorkoutMessages(messages); break;
    }
  };
  const [mealPlanData, setMealPlanData] = useState({ 
    preferences: [] as string[], 
    dietType: '',
  });
  const [calculatedCalories, setCalculatedCalories] = useState<number | null>(null);
  const [mealPlanInput, setMealPlanInput] = useState('');
  const [mealPlanPdf, setMealPlanPdf] = useState<File | null>(null);
  const [mealPlanPdfPreview, setMealPlanPdfPreview] = useState<string | null>(null);
  // Removed workoutData.focus - now extracted from user profile
  const [workoutInput, setWorkoutInput] = useState('');
  const [workoutPdf, setWorkoutPdf] = useState<File | null>(null);
  const [workoutPdfPreview, setWorkoutPdfPreview] = useState<string | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [showPhotoUpload, setShowPhotoUpload] = useState(false);
  const [selectedPhotoType, setSelectedPhotoType] = useState<'front' | 'side' | 'back'>('front');
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [selectedPhotosForAnalysis, setSelectedPhotosForAnalysis] = useState<string[]>([]);
  const [analysisLoading, setAnalysisLoading] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<string | null>(null);
  // Removed showSettings - now using activeTab === 'settings' instead
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [hasPremium, setHasPremium] = useState(false);
  const [checkingPremium, setCheckingPremium] = useState(true);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' | 'warning' } | null>(null);
  const [saving, setSaving] = useState(false);
  const [localProfile, setLocalProfile] = useState<UserProfile | null>(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/login');
      return;
    }

    checkPremiumAccess();
    loadProfile();
    loadHistory();
    if (user?._id) {
      loadPhotoUploadCount();
    }
  }, [isAuthenticated, user?._id]);

  const loadPhotoUploadCount = () => {
    if (!user?._id) return;
    
    const storageKey = `chatPhotoUploadCount_${user._id}`;
    const stored = localStorage.getItem(storageKey);
    if (stored) {
      const data = JSON.parse(stored);
      const resetTime = new Date(data.resetTime);
      if (new Date() >= resetTime) {
        // Reset if 12 hours have passed
        localStorage.removeItem(storageKey);
        setPhotoUploadCount(null);
      } else {
        setPhotoUploadCount(data);
      }
    }
  };

  const updatePhotoUploadCount = (count: number) => {
    if (!user?._id) return;
    
    const storageKey = `chatPhotoUploadCount_${user._id}`;
    const resetTime = new Date();
    resetTime.setHours(resetTime.getHours() + 12);
    const data = { count, resetTime: resetTime.toISOString() };
    localStorage.setItem(storageKey, JSON.stringify(data));
    setPhotoUploadCount(data);
  };

  useEffect(() => {
    scrollToBottom();
  }, [chatMessages, mealMessages, workoutMessages, activeTab]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const checkPremiumAccess = async () => {
    try {
      // Check if user has premium membership by checking their active memberships
      const response = await api.get('/memberships', {
        params: { userId: user?._id, status: 'active' },
      });
      const hasPremiumMembership = response.data.memberships?.some(
        (m: any) => m.planType === 'premium' && new Date(m.endDate) >= new Date()
      );
      setHasPremium(hasPremiumMembership || false);
    } catch (error: any) {
      console.error('Error checking premium access:', error);
      setHasPremium(false);
    } finally {
      setCheckingPremium(false);
    }
  };

  const calculateCalories = (profile: UserProfile | null): number | null => {
    if (!profile?.weight || !profile?.height || !profile?.age) {
      return null;
    }

    // Mifflin-St Jeor equation (neutral calculation)
    const tmb = (10 * profile.weight) + (6.25 * profile.height) - (5 * profile.age) - 78;

    // Activity factor based on fitness level and workout days
    let activityFactor = 1.2; // Sedentary (default)
    
    const workoutDays = profile.preferences?.workoutDays?.length || 0;
    const fitnessLevel = profile.fitnessLevel || 'beginner';
    
    if (workoutDays >= 5 || fitnessLevel === 'advanced') {
      activityFactor = 1.725; // Very active
    } else if (workoutDays >= 3 || fitnessLevel === 'intermediate') {
      activityFactor = 1.55; // Active
    } else if (workoutDays >= 1) {
      activityFactor = 1.375; // Lightly active
    }

    // Calculate TDEE
    let tdee = tmb * activityFactor;

    // Adjust based on goal
    if (profile.goal) {
      const goalLower = profile.goal.toLowerCase();
      if (goalLower.includes('bajar') || goalLower.includes('pérdida') || goalLower.includes('perdida') || goalLower.includes('definición')) {
        tdee = tdee * 0.85; // 15% deficit
      } else if (goalLower.includes('subir') || goalLower.includes('ganar') || goalLower.includes('masa')) {
        tdee = tdee * 1.15; // 15% surplus
      }
    }

    return Math.round(tdee);
  };

  const loadProfile = async () => {
    try {
      const response = await api.get('/user/profile');
      const user = response.data.user;
      setUserProfile(user);
      // Convert injuries array to text for editing
      const injuriesText = user.injuries && user.injuries.length > 0
        ? user.injuries.map((i: any) => typeof i === 'string' ? i : (i.type || '')).join('\n')
        : '';
      // Ensure trainingExperience is always an object with years and months
      const trainingExperience = user.trainingExperience || { years: 0, months: 0 };
      const profileWithText = { 
        ...user, 
        injuriesText,
        trainingExperience: {
          years: trainingExperience.years || 0,
          months: trainingExperience.months || 0,
        },
      };
      setLocalProfile(profileWithText);
      
      // Calculate calories based on profile
      const calories = calculateCalories(profileWithText);
      setCalculatedCalories(calories);
      
      setHasUnsavedChanges(false);
    } catch (error) {
      console.error('Error loading profile:', error);
    }
  };

  const showToast = (message: string, type: 'success' | 'error' | 'info' | 'warning' = 'info') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const loadHistory = async () => {
    try {
      const type = activeTab === 'chat' ? 'chat' : activeTab === 'meal' ? 'meal_plan' : activeTab === 'workout' ? 'workout_routine' : 'chat';
      const response = await api.get(`/ai/history?type=${type}`);
      if (response.data.conversations && response.data.conversations.length > 0) {
        const latest = response.data.conversations[0];
        // Get API base URL without /api suffix
        const API_BASE = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api').replace('/api', '');
        
        let messages = (latest.messages || []).map((msg: any) => ({
          ...msg,
          images: msg.images ? msg.images.map((img: string) => {
            // Convert relative paths to full URLs
            if (img.startsWith('/uploads/')) {
              return `${API_BASE}${img}`;
            }
            return img;
          }) : undefined,
          pdfUrl: msg.pdfUrl ? (
            msg.pdfUrl.startsWith('/uploads/')
              ? `${API_BASE}${msg.pdfUrl}`
              : msg.pdfUrl
          ) : undefined,
        }));
        
        // Filter out technical prompts for meal plan and workout routine when in chat tab
        if (activeTab === 'chat') {
          messages = messages.filter((msg: Message) => {
            if (msg.role === 'user') {
              const content = msg.content.toLowerCase();
              // Filter out technical prompts that are used to generate meal plans or routines
              const isMealPlanPrompt = content.includes('genera un plan alimenticio') || 
                                       content.includes('plan alimenticio semanal personalizado') ||
                                       content.includes('calorías diarias objetivo') ||
                                       content.includes('preferencias dietéticas');
              const isWorkoutPrompt = content.includes('genera una rutina') ||
                                      content.includes('rutina de ejercicios') ||
                                      content.includes('rutina semanal personalizada') ||
                                      content.includes('enfoque de entrenamiento');
              
              return !isMealPlanPrompt && !isWorkoutPrompt;
            }
            return true;
          });
        }
        
        setCurrentMessages(messages);
      } else {
        setCurrentMessages([]);
      }
    } catch (error) {
      console.error('Error loading history:', error);
      setCurrentMessages([]);
    }
  };
  
  // Load history when tab changes
  useEffect(() => {
    if (hasPremium && activeTab !== 'progress' && activeTab !== 'settings') {
      loadHistory();
    }
  }, [activeTab, hasPremium]);

  const handleClearChat = async () => {
    if (confirm('¿Estás seguro de que quieres borrar el chat? Esta acción no se puede deshacer.')) {
      try {
        // Delete conversation from backend
        const type = 'chat';
        const response = await api.get(`/ai/history?type=${type}`);
        if (response.data.conversations && response.data.conversations.length > 0) {
          const latest = response.data.conversations[0];
          await api.delete(`/ai/history/${latest._id}`);
          // Clear local state after successful deletion
          setChatMessages([]);
          showToast('Chat borrado permanentemente', 'success');
        } else {
          // No conversation found, just clear local state
          setChatMessages([]);
          showToast('Chat borrado', 'info');
        }
      } catch (error: any) {
        console.error('Error deleting chat:', error);
        const errorMsg = error.response?.data?.error || 'Error al borrar el chat';
        showToast(errorMsg, 'error');
      }
    }
  };

  const handleClearMealPlan = async () => {
    if (confirm('¿Estás seguro de que quieres borrar el plan alimenticio? Esta acción no se puede deshacer.')) {
      try {
        // Delete conversation from backend
        const type = 'meal_plan';
        const response = await api.get(`/ai/history?type=${type}`);
        if (response.data.conversations && response.data.conversations.length > 0) {
          const latest = response.data.conversations[0];
          await api.delete(`/ai/history/${latest._id}`);
          // Clear local state after successful deletion
          setMealMessages([]);
          setMealPlanInput('');
          showToast('Plan alimenticio borrado permanentemente', 'success');
        } else {
          // No conversation found, just clear local state
          setMealMessages([]);
          setMealPlanInput('');
          showToast('Plan alimenticio borrado', 'info');
        }
      } catch (error: any) {
        console.error('Error deleting meal plan:', error);
        const errorMsg = error.response?.data?.error || 'Error al borrar el plan alimenticio';
        showToast(errorMsg, 'error');
      }
    }
  };

  const handleClearWorkout = async () => {
    if (confirm('¿Estás seguro de que quieres borrar la rutina? Esta acción no se puede deshacer.')) {
      try {
        // Delete conversation from backend
        const type = 'workout_routine';
        const response = await api.get(`/ai/history?type=${type}`);
        if (response.data.conversations && response.data.conversations.length > 0) {
          const latest = response.data.conversations[0];
          await api.delete(`/ai/history/${latest._id}`);
          // Clear local state after successful deletion
          setWorkoutMessages([]);
          setWorkoutInput('');
          showToast('Rutina borrada permanentemente', 'success');
        } else {
          // No conversation found, just clear local state
          setWorkoutMessages([]);
          setWorkoutInput('');
          showToast('Rutina borrada', 'info');
        }
      } catch (error: any) {
        console.error('Error deleting workout:', error);
        const errorMsg = error.response?.data?.error || 'Error al borrar la rutina';
        showToast(errorMsg, 'error');
      }
    }
  };

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    const currentCount = photoUploadCount?.count || 0;
    const remaining = 5 - currentCount;
    
    if (remaining <= 0) {
      showToast('Has alcanzado el límite de 5 fotos cada 12 horas. Intenta más tarde.', 'warning');
      return;
    }

    const newFiles = Array.from(files).slice(0, remaining);
    const totalFiles = chatImages.length + newFiles.length;
    
    if (totalFiles > 5) {
      showToast(`Solo puedes subir hasta 5 fotos. Ya tienes ${chatImages.length} seleccionadas.`, 'warning');
      return;
    }

    const newImages = [...chatImages, ...newFiles];
    setChatImages(newImages);

    // Create previews
    const newPreviews: string[] = [];
    newFiles.forEach(file => {
      const reader = new FileReader();
      reader.onload = (e) => {
        if (e.target?.result) {
          newPreviews.push(e.target.result as string);
          if (newPreviews.length === newFiles.length) {
            setImagePreviews([...imagePreviews, ...newPreviews]);
          }
        }
      };
      reader.readAsDataURL(file);
    });
  };

  const removeImage = (index: number) => {
    const newImages = chatImages.filter((_, i) => i !== index);
    const newPreviews = imagePreviews.filter((_, i) => i !== index);
    setChatImages(newImages);
    setImagePreviews(newPreviews);
  };

  const handleSend = async () => {
    if (!input.trim() && chatImages.length === 0) return;
    if (chatLoading) return;

    // Create preview URLs for images before sending (temporary for display)
    const tempImageUrls: string[] = [];
    chatImages.forEach(image => {
      const url = URL.createObjectURL(image);
      tempImageUrls.push(url);
    });

    const userMessage: Message = {
      role: 'user',
      content: input || (chatImages.length > 0 ? `[${chatImages.length} imagen${chatImages.length > 1 ? 'es' : ''} adjunta${chatImages.length > 1 ? 's' : ''}]` : ''),
      timestamp: new Date(),
      images: tempImageUrls, // Temporary URLs, will be replaced with server URLs
    };

    const currentMsgs = getCurrentMessages();
    setCurrentMessages([...currentMsgs, userMessage]);
    const messageToSend = input;
    setInput('');
    setChatLoading(true);

    try {
      const formData = new FormData();
      formData.append('message', messageToSend || '');
      chatImages.forEach((image, index) => {
        formData.append(`images`, image);
      });

      const response = await api.post('/ai/chat', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      // Update photo upload count
      if (chatImages.length > 0) {
        const currentCount = photoUploadCount?.count || 0;
        updatePhotoUploadCount(currentCount + chatImages.length);
      }

      // Get current messages (should include the user message we just added)
      const currentMsgsAfterSend = getCurrentMessages();
      
      // Update user message with server image URLs if present
      let updatedUserMessage = userMessage;
      if (response.data.imageUrls && response.data.imageUrls.length > 0) {
        // Clean up temporary object URLs
        tempImageUrls.forEach(url => URL.revokeObjectURL(url));
        
        // Convert relative paths to full URLs
        updatedUserMessage = {
          ...userMessage,
          images: response.data.imageUrls.map((img: string) => {
            if (img.startsWith('/uploads/')) {
              return `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'}${img}`;
            }
            return img;
          }),
        };
      }

      const assistantMessage: Message = {
        role: 'assistant',
        content: response.data.message,
        timestamp: new Date(),
      };
      
      // Ensure we keep all previous messages (including the user message) and add the assistant response
      // Replace the last message (user message) with the updated version if images were updated
      const previousMsgs = currentMsgsAfterSend.slice(0, -1); // All messages except the last one (user message)
      const finalMsgs = [...previousMsgs, updatedUserMessage, assistantMessage];
      setCurrentMessages(finalMsgs);
      
      // Clear images after successful send
      setChatImages([]);
      setImagePreviews([]);
    } catch (error: any) {
      console.error('Error sending message:', error);
      const errorDetails = error.response?.data;
      let errorText = 'Error al procesar tu mensaje. Por favor, intenta de nuevo.';
      
      if (errorDetails?.error) {
        errorText = errorDetails.error;
        if (errorDetails.message) {
          errorText += `: ${errorDetails.message}`;
        }
      } else if (errorDetails?.message) {
        errorText = errorDetails.message;
      } else if (error.message) {
        errorText = error.message;
      }

      const errorMessage: Message = {
        role: 'assistant',
        content: errorText,
        timestamp: new Date(),
      };
      const updatedMsgs = [...getCurrentMessages(), errorMessage];
      setCurrentMessages(updatedMsgs);
    } finally {
      setChatLoading(false);
    }
  };

  const handleGenerateMealPlan = async () => {
    setMealLoading(true);
    try {
      const response = await api.post('/ai/meal-plan', mealPlanData);
      const mealPlanMessage: Message = {
        role: 'assistant',
        content: response.data.mealPlan || response.data.message || response.data.response,
        timestamp: new Date(),
      };
      setMealMessages([mealPlanMessage]);
    } catch (error: any) {
      console.error('Error generating meal plan:', error);
      const errorMessage = error.response?.data?.error || error.response?.data?.message || 'Error al generar el plan alimenticio';
      showToast(errorMessage, 'error');
      // Show error in chat
      const errorMsg: Message = {
        role: 'assistant',
        content: `Error: ${errorMessage}. Por favor, verifica tu configuración o intenta de nuevo.`,
        timestamp: new Date(),
      };
      setMealMessages([errorMsg]);
    } finally {
      setMealLoading(false);
    }
  };

  const handleMealPlanPdfSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.type !== 'application/pdf') {
        showToast('Por favor selecciona un archivo PDF', 'error');
        return;
      }
      if (file.size > 10 * 1024 * 1024) {
        showToast('El PDF no debe exceder 10MB', 'error');
        return;
      }
      setMealPlanPdf(file);
      setMealPlanPdfPreview(file.name);
    }
  };

  const removeMealPlanPdf = () => {
    setMealPlanPdf(null);
    setMealPlanPdfPreview(null);
  };

  const handleMealPlanChat = async () => {
    if ((!mealPlanInput.trim() && !mealPlanPdf) || mealLoading) return;
    
    const userMessage: Message = {
      role: 'user',
      content: mealPlanInput || (mealPlanPdf ? `[PDF adjunto: ${mealPlanPdf.name}]` : ''),
      timestamp: new Date(),
      pdfUrl: mealPlanPdf ? URL.createObjectURL(mealPlanPdf) : undefined,
    };
    
    const currentMsgs = [...mealMessages];
    setMealMessages([...currentMsgs, userMessage]);
    const messageToSend = mealPlanInput;
    setMealPlanInput('');
    setMealLoading(true);
    
    try {
      const formData = new FormData();
      formData.append('message', messageToSend || `Sobre mi plan alimenticio${mealPlanPdf ? ' (con PDF adjunto)' : ''}`);
      formData.append('context', 'meal_plan');
      if (mealPlanPdf) {
        formData.append('pdf', mealPlanPdf);
      }
      
      const response = await api.post('/ai/chat', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      
      // Update user message with server PDF URL if provided
      if (response.data.pdfUrl) {
        const updatedMsgs = getCurrentMessages();
        const lastUserMsg = updatedMsgs[updatedMsgs.length - 1];
        if (lastUserMsg && lastUserMsg.role === 'user') {
          // Convert relative path to full URL
          const fullPdfUrl = response.data.pdfUrl.startsWith('/uploads/')
            ? `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'}${response.data.pdfUrl}`
            : response.data.pdfUrl;
          lastUserMsg.pdfUrl = fullPdfUrl;
          setMealMessages([...updatedMsgs]);
        }
      }
      
      const assistantMessage: Message = {
        role: 'assistant',
        content: response.data.message || response.data.response,
        timestamp: new Date(),
      };
      
      setMealMessages([...currentMsgs, userMessage, assistantMessage]);
      setMealPlanPdf(null);
      setMealPlanPdfPreview(null);
    } catch (error: any) {
      console.error('Error in meal plan chat:', error);
      showToast(error.response?.data?.error || 'Error al procesar tu mensaje', 'error');
      // Remove user message on error
      setMealMessages(currentMsgs);
    } finally {
      setMealLoading(false);
    }
  };

  const handleDownloadMealPlanPDF = async () => {
    if (mealMessages.length === 0) {
      showToast('No hay plan alimenticio para descargar', 'warning');
      return;
    }
    
    const mealPlanContent = mealMessages.find(m => m.role === 'assistant')?.content || '';
    if (!mealPlanContent) {
      showToast('No hay plan alimenticio para descargar', 'warning');
      return;
    }
    
    try {
      const response = await api.post('/ai/meal-plan/pdf', {
        mealPlan: mealPlanContent,
        calories: calculatedCalories,
        userProfile: userProfile,
      }, {
        responseType: 'blob',
      });
      
      // Check if response is actually a blob
      if (response.data instanceof Blob) {
        const url = window.URL.createObjectURL(response.data);
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', `plan-alimenticio-${new Date().toISOString().split('T')[0]}.pdf`);
        document.body.appendChild(link);
        link.click();
        link.remove();
        window.URL.revokeObjectURL(url);
        showToast('Plan alimenticio descargado exitosamente', 'success');
      } else {
        // If it's not a blob, it might be an error response
        const reader = new FileReader();
        reader.onload = () => {
          try {
            const errorData = JSON.parse(reader.result as string);
            showToast(errorData.error || 'Error al descargar el PDF', 'error');
          } catch {
            showToast('Error al descargar el PDF', 'error');
          }
        };
        reader.readAsText(response.data);
      }
    } catch (error: any) {
      console.error('Error downloading PDF:', error);
      const errorMessage = error.response?.data?.error || error.response?.data?.message || 'Error al descargar el PDF';
      showToast(errorMessage, 'error');
    }
  };

  const handleGenerateWorkout = async () => {
    setWorkoutLoading(true);
    try {
      const response = await api.post('/ai/workout-routine', { focus: '' });
      const workoutMessage: Message = {
        role: 'assistant',
        content: response.data.workoutRoutine || response.data.message || response.data.response,
        timestamp: new Date(),
      };
      setWorkoutMessages([workoutMessage]);
    } catch (error: any) {
      console.error('Error generating workout:', error);
      const errorMessage = error.response?.data?.error || error.response?.data?.message || error.response?.data?.details || 'Error al generar la rutina';
      showToast(errorMessage, 'error');
      // Show error in chat
      const errorMsg: Message = {
        role: 'assistant',
        content: `Error: ${errorMessage}. Por favor, verifica tu configuración o intenta de nuevo.`,
        timestamp: new Date(),
      };
      setWorkoutMessages([errorMsg]);
    } finally {
      setWorkoutLoading(false);
    }
  };

  const handleWorkoutPdfSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.type !== 'application/pdf') {
        showToast('Por favor selecciona un archivo PDF', 'error');
        return;
      }
      if (file.size > 10 * 1024 * 1024) {
        showToast('El PDF no debe exceder 10MB', 'error');
        return;
      }
      setWorkoutPdf(file);
      setWorkoutPdfPreview(file.name);
    }
  };

  const removeWorkoutPdf = () => {
    setWorkoutPdf(null);
    setWorkoutPdfPreview(null);
  };

  const handleWorkoutChat = async () => {
    if ((!workoutInput.trim() && !workoutPdf) || workoutLoading) return;
    
    const userMessage: Message = {
      role: 'user',
      content: workoutInput || (workoutPdf ? `[PDF adjunto: ${workoutPdf.name}]` : ''),
      timestamp: new Date(),
      pdfUrl: workoutPdf ? URL.createObjectURL(workoutPdf) : undefined,
    };
    
    const currentMsgs = [...workoutMessages];
    // Add user message to show in chat
    setWorkoutMessages([...currentMsgs, userMessage]);
    const messageToSend = workoutInput;
    setWorkoutInput('');
    setWorkoutLoading(true);
    
    try {
      const formData = new FormData();
      formData.append('message', messageToSend || `Sobre mi rutina de ejercicios${workoutPdf ? ' (con PDF adjunto)' : ''}`);
      formData.append('context', 'workout_routine');
      if (workoutPdf) {
        formData.append('pdf', workoutPdf);
      }
      
      const response = await api.post('/ai/chat', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      
      // Update user message with server PDF URL if provided
      if (response.data.pdfUrl) {
        const updatedMsgs = getCurrentMessages();
        const lastUserMsg = updatedMsgs[updatedMsgs.length - 1];
        if (lastUserMsg && lastUserMsg.role === 'user') {
          // Convert relative path to full URL
          const fullPdfUrl = response.data.pdfUrl.startsWith('/uploads/')
            ? `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'}${response.data.pdfUrl}`
            : response.data.pdfUrl;
          lastUserMsg.pdfUrl = fullPdfUrl;
          setWorkoutMessages([...updatedMsgs]);
        }
      }
      
      const assistantMessage: Message = {
        role: 'assistant',
        content: response.data.message || response.data.response,
        timestamp: new Date(),
      };
      
      setWorkoutMessages([...currentMsgs, userMessage, assistantMessage]);
      setWorkoutPdf(null);
      setWorkoutPdfPreview(null);
    } catch (error: any) {
      console.error('Error in workout chat:', error);
      showToast(error.response?.data?.error || 'Error al procesar tu mensaje', 'error');
      setWorkoutMessages(currentMsgs);
    } finally {
      setWorkoutLoading(false);
    }
  };

  const handleDownloadWorkoutPDF = async () => {
    if (workoutMessages.length === 0) {
      showToast('No hay rutina para descargar', 'warning');
      return;
    }
    
    const workoutContent = workoutMessages.find(m => m.role === 'assistant')?.content || '';
    if (!workoutContent) {
      showToast('No hay rutina para descargar', 'warning');
      return;
    }
    
    try {
      const response = await api.post('/ai/workout-routine/pdf', {
        workoutRoutine: workoutContent,
        userProfile: userProfile,
      }, {
        responseType: 'blob',
      });
      
      // Check if response is actually a blob
      if (response.data instanceof Blob) {
        const url = window.URL.createObjectURL(response.data);
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', `rutina-ejercicios-${new Date().toISOString().split('T')[0]}.pdf`);
        document.body.appendChild(link);
        link.click();
        link.remove();
        window.URL.revokeObjectURL(url);
        showToast('Rutina descargada exitosamente', 'success');
      } else {
        // If it's not a blob, it might be an error response
        const reader = new FileReader();
        reader.onload = () => {
          try {
            const errorData = JSON.parse(reader.result as string);
            showToast(errorData.error || 'Error al descargar el PDF', 'error');
          } catch {
            showToast('Error al descargar el PDF', 'error');
          }
        };
        reader.readAsText(response.data);
      }
    } catch (error: any) {
      console.error('Error downloading PDF:', error);
      const errorMessage = error.response?.data?.error || error.response?.data?.message || 'Error al descargar el PDF';
      showToast(errorMessage, 'error');
    }
  };

  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setPhotoFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setPhotoPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handlePhotoUpload = async () => {
    if (!photoFile) return;

    // Validate file type
    if (!photoFile.type.startsWith('image/')) {
      showToast('Por favor selecciona un archivo de imagen', 'error');
      return;
    }

    // Validate file size (max 5MB)
    if (photoFile.size > 5 * 1024 * 1024) {
      showToast('La imagen no debe exceder 5MB', 'error');
      return;
    }

    const formData = new FormData();
    formData.append('photo', photoFile);
    formData.append('type', selectedPhotoType);
    formData.append('notes', `Foto ${selectedPhotoType} - ${new Date().toLocaleDateString()}`);

    try {
      const response = await api.post('/user/body-photo', formData);
      
      if (response.data.photo || response.data.message) {
        console.log('Photo uploaded successfully:', response.data);
        // Recargar perfil desde el servidor para asegurar que se actualice correctamente
        await loadProfile();
        setShowPhotoUpload(false);
        setPhotoFile(null);
        setPhotoPreview(null);
        showToast('Foto subida exitosamente', 'success');
      } else {
        showToast('Error: No se recibió confirmación del servidor', 'error');
      }
    } catch (error: any) {
      console.error('Error uploading photo:', error);
      console.error('Error response:', error.response);
      const errorMessage = error.response?.data?.error 
        || error.response?.data?.message 
        || error.message 
        || 'Error al subir la foto';
      showToast(errorMessage, 'error');
    }
  };

  const handleDeletePhoto = async (photoId: string) => {
    if (!confirm('¿Estás seguro de que quieres eliminar esta foto? Esta acción no se puede deshacer.')) {
      return;
    }

    try {
      await api.delete(`/user/body-photo/${photoId}`);
      showToast('Foto eliminada exitosamente', 'success');
      // Remove from selected photos if it was selected
      setSelectedPhotosForAnalysis(selectedPhotosForAnalysis.filter(id => id !== photoId));
      // Recargar perfil para actualizar la lista de fotos
      await loadProfile();
    } catch (error: any) {
      console.error('Error deleting photo:', error);
      const errorMessage = error.response?.data?.error 
        || error.response?.data?.message 
        || 'Error al eliminar la foto';
      showToast(errorMessage, 'error');
    }
  };

  const handleAnalyzeProgress = async () => {
    if (selectedPhotosForAnalysis.length === 0) {
      showToast('Por favor selecciona al menos una foto para analizar', 'warning');
      return;
    }

    setAnalysisLoading(true);
    setAnalysisResult(null);

    try {
      // Get the selected photos
      const selectedPhotos = userProfile?.bodyPhotos?.filter(photo => 
        selectedPhotosForAnalysis.includes(photo._id)
      ) || [];

      const response = await api.post('/ai/analyze-progress', {
        photoIds: selectedPhotosForAnalysis,
      });

      if (response.data.analysis) {
        setAnalysisResult(response.data.analysis);
        showToast('Análisis completado', 'success');
      } else {
        showToast('Error: No se recibió análisis del servidor', 'error');
      }
    } catch (error: any) {
      console.error('Error analyzing progress:', error);
      const errorMessage = error.response?.data?.error 
        || error.response?.data?.message 
        || 'Error al analizar el progreso';
      showToast(errorMessage, 'error');
    } finally {
      setAnalysisLoading(false);
    }
  };

  const updateLocalProfile = (updates: Partial<UserProfile>) => {
    // Always preserve trainingExperience from current state unless it's being explicitly updated
    const currentTrainingExp = localProfile?.trainingExperience || { years: 0, months: 0 };
    const newProfile = { 
      ...localProfile, 
      ...updates,
      // Preserve trainingExperience unless it's being updated
      trainingExperience: updates.trainingExperience || currentTrainingExp,
    } as UserProfile;
    setLocalProfile(newProfile);
    setHasUnsavedChanges(true);
  };

  const saveProfile = async (profileToSave?: UserProfile) => {
    const profile = profileToSave || localProfile;
    if (!profile) return;

    setSaving(true);
    try {
      // Calculate what changed
      const updates: Partial<UserProfile> = {};
      if (profile.weight !== userProfile?.weight) updates.weight = profile.weight;
      if (profile.height !== userProfile?.height) updates.height = profile.height;
      if (profile.age !== userProfile?.age) updates.age = profile.age;
      if (profile.goal !== userProfile?.goal) updates.goal = profile.goal;
      if (profile.fitnessLevel !== userProfile?.fitnessLevel) updates.fitnessLevel = profile.fitnessLevel;
      if (profile.bodyFat !== userProfile?.bodyFat) updates.bodyFat = profile.bodyFat;
      if (profile.muscleMass !== userProfile?.muscleMass) updates.muscleMass = profile.muscleMass;
      // Handle trainingExperience - always send it if it exists in the profile
      // This ensures it's never lost even if other fields are updated
      const profileExp = profile.trainingExperience || { years: 0, months: 0 };
      const userExp = userProfile?.trainingExperience || { years: 0, months: 0 };
      // Always include trainingExperience if it exists in the profile, even if unchanged
      // This prevents it from being lost when other fields are updated
      if (profileExp.years !== undefined || profileExp.months !== undefined) {
        updates.trainingExperience = {
          years: profileExp.years || 0,
          months: profileExp.months || 0,
        };
      } else if (userExp.years !== undefined || userExp.months !== undefined) {
        // If profile doesn't have it but userProfile does, preserve it
        updates.trainingExperience = {
          years: userExp.years || 0,
          months: userExp.months || 0,
        };
      }
      // Only update preferences if they changed (excluding equipment which is always gym)
      const profilePrefs = { ...profile.preferences };
      delete profilePrefs.equipment; // Don't save equipment, always gym
      const userPrefs = { ...userProfile?.preferences };
      delete userPrefs.equipment;
      if (JSON.stringify(profilePrefs) !== JSON.stringify(userPrefs)) {
        updates.preferences = profilePrefs;
      }
      // Handle injuries text - convert to array format for backend
      if (profile.injuriesText !== undefined) {
        const injuriesText = profile.injuriesText || '';
        // Convert text to array of injury objects, preserving spaces within each line
        const injuries = injuriesText
          .split('\n')
          .map(line => line.trim()) // Trim whitespace from start/end
          .filter(line => line.length > 0) // Remove empty lines
          .map(line => ({ type: line })); // Preserve all spaces within the line
        
        const userInjuriesText = userProfile?.injuries && userProfile.injuries.length > 0
          ? userProfile.injuries.map((i: any) => typeof i === 'string' ? i : (i.type || '')).join('\n')
          : '';
        
        // Always update if text is different (even if empty)
        if (injuriesText !== userInjuriesText) {
          updates.injuries = injuries;
          console.log('📝 Injuries to update:', injuries);
        }
      }

      if (Object.keys(updates).length === 0) {
        setSaving(false);
        return;
      }

      console.log('📤 Sending profile update:', {
        updates: Object.keys(updates),
        injuriesCount: updates.injuries?.length || 0,
      });

      const response = await api.put('/user/profile', updates);
      
      if (!response.data.user) {
        throw new Error('No se recibió respuesta del servidor');
      }

      // Convert injuries back to text for local profile
      const updatedUser = response.data.user;
      const injuriesText = updatedUser.injuries && updatedUser.injuries.length > 0
        ? updatedUser.injuries.map((i: any) => typeof i === 'string' ? i : (i.type || '')).join('\n')
        : '';

      const profileWithText = { ...updatedUser, injuriesText };
      setUserProfile(updatedUser);
      setLocalProfile(profileWithText);
      
      // Recalculate calories after profile update
      const calories = calculateCalories(profileWithText);
      setCalculatedCalories(calories);
      
      setHasUnsavedChanges(false);
      showToast('Perfil actualizado exitosamente', 'success');
    } catch (error: any) {
      console.error('❌ Error updating profile:', error);
      console.error('Error response:', error.response?.data);
      const errorMessage = error.response?.data?.error 
        || error.response?.data?.message 
        || error.message 
        || 'Error al actualizar el perfil';
      showToast(errorMessage, 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveClick = () => {
    saveProfile();
  };

  // Function to clean and format markdown content
  const formatMessageContent = (content: string): string => {
    if (!content) return '';
    
    // Remove markdown headers (###, ##, #)
    let formatted = content.replace(/^#{1,6}\s+/gm, '');
    
    // Remove markdown horizontal rules (---, ***, ___) - these are separators
    formatted = formatted.replace(/^[-*_]{3,}\s*$/gm, '');
    formatted = formatted.replace(/^[-*_]{3,}/gm, '');
    
    // Remove bold/italic markdown (**text**, *text*)
    formatted = formatted.replace(/\*\*([^*]+)\*\*/g, '$1');
    formatted = formatted.replace(/\*([^*]+)\*/g, '$1');
    
    // Convert markdown list markers to bullet points
    formatted = formatted.replace(/^[\s]*[-*]\s+/gm, '• ');
    formatted = formatted.replace(/^\d+\.\s+/gm, '');
    
    // Clean up multiple newlines
    formatted = formatted.replace(/\n{3,}/g, '\n\n');
    
    // Trim whitespace
    formatted = formatted.trim();
    
    return formatted;
  };

  // Render chat messages with clean formatting (for normal chat and progress analysis)
  const renderChatMessage = (content: string, isUserMessage: boolean = false): React.ReactElement | null => {
    if (!content) return null;
    
    // Split content into lines
    const lines = content.split('\n');
    const elements: React.ReactElement[] = [];
    let currentParagraph: string[] = [];
    let inList = false;
    let listItems: string[] = [];
    
    // Color classes based on message role
    const textColor = isUserMessage ? 'text-white' : 'text-gray-800';
    const titleColor = isUserMessage ? 'text-white' : 'text-gray-900';
    const listColor = isUserMessage ? 'text-white/90' : 'text-gray-800';
    const numberColor = isUserMessage ? 'text-white' : 'text-primary-600';
    
    const flushParagraph = () => {
      if (currentParagraph.length > 0) {
        const text = currentParagraph.join(' ').trim();
        if (text) {
          elements.push(
            <p key={elements.length} className={`mb-3 ${textColor}`}>
              {text}
            </p>
          );
        }
        currentParagraph = [];
      }
    };
    
    const flushList = () => {
      if (listItems.length > 0) {
        elements.push(
          <ul key={elements.length} className={`mb-4 space-y-2 list-disc list-inside ${listColor}`}>
            {listItems.map((item, idx) => (
              <li key={idx} className={`ml-2 ${listColor}`}>
                {item.replace(/^[-*•]\s+/, '').trim()}
              </li>
            ))}
          </ul>
        );
        listItems = [];
        inList = false;
      }
    };
    
    lines.forEach((line, idx) => {
      const trimmed = line.trim();
      
      // Skip empty lines
      if (!trimmed) {
        flushList();
        flushParagraph();
        return;
      }
      
      // Check for headers (###, ##, #)
      if (trimmed.match(/^#{1,3}\s+/)) {
        flushList();
        flushParagraph();
        const level = trimmed.match(/^#+/)?.[0].length || 1;
        const text = trimmed.replace(/^#+\s+/, '');
        const Tag = level === 1 ? 'h3' : level === 2 ? 'h4' : 'h5';
        elements.push(
          <Tag key={elements.length} className={`mb-2 mt-4 font-bold ${titleColor} ${level === 1 ? 'text-lg' : level === 2 ? 'text-base' : 'text-sm'}`}>
            {text}
          </Tag>
        );
        return;
      }
      
      // Check for section titles (text ending with colon, short line)
      if (trimmed.endsWith(':') && trimmed.length < 60 && !trimmed.includes('•') && !trimmed.match(/^\d+\./)) {
        flushList();
        flushParagraph();
        elements.push(
          <h4 key={elements.length} className={`mb-3 mt-4 font-bold ${titleColor} text-base first:mt-0`}>
            {trimmed}
          </h4>
        );
        return;
      }
      
      // Check for list items (-, *, •)
      if (trimmed.match(/^[-*•]\s+/)) {
        flushParagraph();
        if (!inList) {
          inList = true;
        }
        listItems.push(trimmed);
        return;
      }
      
      // Check for numbered lists
      if (trimmed.match(/^\d+\.\s+/)) {
        flushList();
        flushParagraph();
        const text = trimmed.replace(/^\d+\.\s+/, '');
        elements.push(
          <div key={elements.length} className={`mb-2 ${textColor}`}>
            <span className={`font-semibold ${numberColor}`}>{trimmed.match(/^\d+\./)?.[0]}</span>
            <span className="ml-2">{text}</span>
          </div>
        );
        return;
      }
      
      // Regular paragraph text
      flushList();
      currentParagraph.push(trimmed);
    });
    
    // Flush remaining content
    flushList();
    flushParagraph();
    
    return <div>{elements}</div>;
  };

  // Function to render formatted message content
  const renderMessageContent = (content: string) => {
    const formatted = formatMessageContent(content);
    const lines = formatted.split('\n');
    
    const isMealPlan = content.toLowerCase().includes('plan alimenticio') || 
                      (content.toLowerCase().includes('lunes') && content.toLowerCase().includes('desayuno'));
    
    const isWorkoutRoutine = content.toLowerCase().includes('rutina') || 
                             content.toLowerCase().includes('ejercicio') ||
                             (content.toLowerCase().includes('lunes') && content.toLowerCase().includes('pecho'));
    
    if (isMealPlan) {
      return renderMealPlanContent(lines);
    }
    
    if (isWorkoutRoutine) {
      return renderWorkoutRoutineContent(lines);
    }
    
    return lines.map((line, lineIdx) => {
      const trimmed = line.trim();
      
      // Empty line
      if (!trimmed) {
        return <br key={lineIdx} />;
      }
      
      // Bullet point
      if (trimmed.startsWith('•')) {
        return (
          <div key={lineIdx} className="flex items-start my-1">
            <span className="text-primary-600 mr-2 font-bold">•</span>
            <span className="flex-1">{trimmed.replace(/^•\s*/, '')}</span>
          </div>
        );
      }
      
      // Title (ends with colon and short)
      if (trimmed.endsWith(':') && trimmed.length < 60 && !trimmed.includes('•')) {
        return (
          <div key={lineIdx} className="font-semibold text-gray-800 mt-4 mb-2 first:mt-0 text-base">
            {trimmed.replace(':', '')}
          </div>
        );
      }
      
      // Regular paragraph
      return (
        <p key={lineIdx} className="text-gray-700 my-1.5 leading-relaxed">
          {trimmed}
        </p>
      );
    });
  };

  // Function to render meal plan with better structure
  const renderMealPlanContent = (lines: string[]) => {
    const days = ['lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado', 'domingo'];
    const meals = ['desayuno', 'almuerzo', 'cena', 'snack', 'merienda'];
    
    const result: React.ReactElement[] = [];
    const daySections: { day: string; meals: { meal: string; items: string[] }[] }[] = [];
    
    let currentDay: string | null = null;
    let currentMeal: string | null = null;
    let mealItems: string[] = [];
    let introText: string[] = [];
    let summaryText: string[] = [];
    let inSummary = false;
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      
      if (!line) {
        if (mealItems.length > 0 && currentMeal) {
          // Save current meal
          const daySection = daySections[daySections.length - 1];
          if (daySection) {
            daySection.meals.push({ meal: currentMeal, items: [...mealItems] });
          }
          mealItems = [];
          currentMeal = null;
        }
        continue;
      }
      
      // Check if it's a day
      const dayMatch = days.find(day => line.toLowerCase().startsWith(day));
      if (dayMatch) {
        // Save previous day if exists
        if (currentDay && currentMeal && mealItems.length > 0) {
          const daySection = daySections[daySections.length - 1];
          if (daySection) {
            daySection.meals.push({ meal: currentMeal, items: [...mealItems] });
          }
        }
        
        currentDay = line;
        currentMeal = null;
        mealItems = [];
        daySections.push({ day: line, meals: [] });
        continue;
      }
      
      // Check if it's a meal (contains meal name and kcal)
      const mealMatch = meals.find(meal => {
        const lowerLine = line.toLowerCase();
        return lowerLine.includes(meal) && (lowerLine.includes('(') || lowerLine.includes('kcal'));
      });
      
      if (mealMatch && currentDay) {
        // Save previous meal
        if (currentMeal && mealItems.length > 0) {
          const daySection = daySections[daySections.length - 1];
          if (daySection) {
            daySection.meals.push({ meal: currentMeal, items: [...mealItems] });
          }
        }
        currentMeal = mealMatch;
        mealItems = [];
        continue;
      }
      
      // Check if it's summary section
      if (line.toLowerCase().includes('total:') || 
          line.toLowerCase().includes('resumen') ||
          line.toLowerCase().includes('macronutrientes')) {
        if (currentMeal && mealItems.length > 0 && currentDay) {
          const daySection = daySections[daySections.length - 1];
          if (daySection) {
            daySection.meals.push({ meal: currentMeal, items: [...mealItems] });
          }
        }
        inSummary = true;
        currentMeal = null;
        mealItems = [];
        summaryText.push(line);
        continue;
      }
      
      // It's a food item
      if (currentMeal && currentDay && !inSummary) {
        const cleanItem = line.replace(/^•\s*/, '').trim();
        if (cleanItem && !meals.some(m => cleanItem.toLowerCase().includes(m))) {
          mealItems.push(cleanItem);
        }
      } else if (inSummary) {
        summaryText.push(line);
      } else if (!currentDay) {
        // Text before first day (intro)
        introText.push(line);
      }
    }
    
    // Save last meal if exists
    if (currentMeal && mealItems.length > 0 && currentDay) {
      const daySection = daySections[daySections.length - 1];
      if (daySection) {
        daySection.meals.push({ meal: currentMeal, items: [...mealItems] });
      }
    }
    
    // Render intro
    if (introText.length > 0) {
      result.push(
        <div key="intro" className="mb-6">
          {introText.map((text, idx) => (
            <p key={idx} className="text-gray-700 mb-2 leading-relaxed">
              {text}
            </p>
          ))}
        </div>
      );
    }
    
    // Render days
    daySections.forEach((daySection, dayIdx) => {
      result.push(
        <div key={`day-${dayIdx}`} className="mb-8 pb-6 border-b border-gray-200 last:border-0">
          <h3 className="text-xl font-bold text-primary-600 mb-4">{daySection.day}</h3>
          <div className="space-y-5">
            {daySection.meals.map((mealData, mealIdx) => (
              <div key={`meal-${dayIdx}-${mealIdx}`} className="bg-gray-50 rounded-lg p-4">
                <div className="font-semibold text-primary-700 text-base mb-3 flex items-center gap-2">
                  <span className="w-2 h-2 bg-primary-500 rounded-full"></span>
                  {mealData.meal.charAt(0).toUpperCase() + mealData.meal.slice(1)}
                </div>
                <div className="ml-6 space-y-2">
                  {mealData.items.map((item, itemIdx) => (
                    <div key={itemIdx} className="text-gray-700 text-sm flex items-start">
                      <span className="text-primary-400 mr-2 mt-1.5">•</span>
                      <span className="flex-1 leading-relaxed">{item}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      );
    });
    
    // Render summary
    if (summaryText.length > 0) {
      result.push(
        <div key="summary" className="mt-8 pt-6 border-t-2 border-gray-300">
          {summaryText.map((text, idx) => (
            <p key={idx} className="text-gray-700 mb-2 font-medium">
              {text}
            </p>
          ))}
        </div>
      );
    }
    
    return result.length > 0 ? result : lines.map((line, idx) => (
      <p key={idx} className="text-gray-700 my-1.5">{line}</p>
    ));
  };

  // Function to render workout routine with better structure
  const renderWorkoutRoutineContent = (lines: string[]) => {
    const days = ['lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado', 'domingo'];
    const exercises = ['press', 'curl', 'squat', 'deadlift', 'pull', 'push', 'row', 'fly', 'extension', 'swing', 'burpee', 'thruster', 'plank', 'crunch', 'sentadilla', 'prensa', 'dominada', 'remo', 'jalón'];
    
    const result: React.ReactElement[] = [];
    const daySections: { day: string; exercises: { name: string; details: string[] }[] }[] = [];
    
    let currentDay: string | null = null;
    let currentExercise: string | null = null;
    let exerciseDetails: string[] = [];
    let introText: string[] = [];
    let summaryText: string[] = [];
    let inSummary = false;
    let inIntro = true;
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      
      if (!line) {
        if (exerciseDetails.length > 0 && currentExercise) {
          // Save current exercise
          const daySection = daySections[daySections.length - 1];
          if (daySection) {
            daySection.exercises.push({ name: currentExercise, details: [...exerciseDetails] });
          }
          exerciseDetails = [];
          currentExercise = null;
        }
        if (inIntro && introText.length > 0) {
          inIntro = false;
        }
        continue;
      }
      
      // Check if it's a main title (like "Rutina Semanal de Ejercicio")
      if (line.toLowerCase().includes('rutina') && line.length < 60) {
        if (introText.length > 0) {
          result.push(
            <div key="intro" className="mb-6">
              {introText.map((text, idx) => (
                <p key={idx} className="text-gray-700 mb-2 leading-relaxed">
                  {text}
                </p>
              ))}
            </div>
          );
          introText = [];
        }
        result.push(
          <h2 key={`title-${i}`} className="text-xl font-bold text-primary-600 mb-6 mt-4">
            {line}
          </h2>
        );
        inIntro = false;
        continue;
      }
      
      // Check if it's a day (Lunes:, Martes:, etc.)
      const dayMatch = days.find(day => {
        const lowerLine = line.toLowerCase();
        return lowerLine.startsWith(day) && (lowerLine.includes(':') || lowerLine.length < 50);
      });
      
      if (dayMatch) {
        // Save previous day if exists
        if (currentDay && currentExercise && exerciseDetails.length > 0) {
          const daySection = daySections[daySections.length - 1];
          if (daySection) {
            daySection.exercises.push({ name: currentExercise, details: [...exerciseDetails] });
          }
        }
        
        currentDay = line.replace(/:/g, '').trim();
        currentExercise = null;
        exerciseDetails = [];
        daySections.push({ day: currentDay, exercises: [] });
        inIntro = false;
        continue;
      }
      
      // Check if it's an exercise name (numbered or contains exercise keywords)
      const isExercise = line.match(/^\d+\.\s+/) || 
                        exercises.some(ex => line.toLowerCase().includes(ex)) ||
                        (line.length > 5 && line.length < 80 && !line.includes(':') && !line.includes('•'));
      
      if (isExercise && currentDay && !inSummary) {
        // Save previous exercise
        if (currentExercise && exerciseDetails.length > 0) {
          const daySection = daySections[daySections.length - 1];
          if (daySection) {
            daySection.exercises.push({ name: currentExercise, details: [...exerciseDetails] });
          }
        }
        currentExercise = line.replace(/^\d+\.\s*/, '').trim();
        exerciseDetails = [];
        continue;
      }
      
      // Check if it's a detail line (Series, Repeticiones, etc.)
      if (currentExercise && (line.includes('Series') || line.includes('Repeticiones') || 
          line.includes('Descanso') || line.includes('Técnica') || line.startsWith('•'))) {
        exerciseDetails.push(line.replace(/^•\s*/, ''));
        continue;
      }
      
      // Check if it's summary section
      if (line.toLowerCase().includes('progresión') || 
          line.toLowerCase().includes('notas') ||
          line.toLowerCase().includes('recomendaciones')) {
        if (currentExercise && exerciseDetails.length > 0 && currentDay) {
          const daySection = daySections[daySections.length - 1];
          if (daySection) {
            daySection.exercises.push({ name: currentExercise, details: [...exerciseDetails] });
          }
        }
        inSummary = true;
        currentExercise = null;
        exerciseDetails = [];
        summaryText.push(line);
        continue;
      }
      
      // It's a detail or text
      if (currentExercise && currentDay && !inSummary) {
        const cleanDetail = line.replace(/^•\s*/, '').trim();
        if (cleanDetail) {
          exerciseDetails.push(cleanDetail);
        }
      } else if (inSummary) {
        summaryText.push(line);
      } else if (inIntro) {
        introText.push(line);
      }
    }
    
    // Save last exercise if exists
    if (currentExercise && exerciseDetails.length > 0 && currentDay) {
      const daySection = daySections[daySections.length - 1];
      if (daySection) {
        daySection.exercises.push({ name: currentExercise, details: [...exerciseDetails] });
      }
    }
    
    // Render intro if not already rendered
    if (introText.length > 0) {
      result.push(
        <div key="intro" className="mb-6">
          {introText.map((text, idx) => (
            <p key={idx} className="text-gray-700 mb-2 leading-relaxed">
              {text}
            </p>
          ))}
        </div>
      );
    }
    
    // Render days
    daySections.forEach((daySection, dayIdx) => {
      result.push(
        <div key={`day-${dayIdx}`} className="mb-8 pb-6 border-b border-gray-200 last:border-0">
          <h3 className="text-xl font-bold text-primary-600 mb-4">{daySection.day}</h3>
          {daySection.exercises.length > 0 ? (
            <div className="space-y-4">
              {daySection.exercises.map((exerciseData, exIdx) => (
                <div key={`exercise-${dayIdx}-${exIdx}`} className="bg-gray-50 rounded-lg p-4">
                  <div className="font-semibold text-primary-700 text-base mb-2">
                    {exerciseData.name}
                  </div>
                  {exerciseData.details.length > 0 && (
                    <div className="ml-4 space-y-1.5">
                      {exerciseData.details.map((detail, detailIdx) => (
                        <div key={detailIdx} className="text-gray-700 text-sm flex items-start">
                          <span className="text-primary-400 mr-2 mt-1.5">•</span>
                          <span className="flex-1 leading-relaxed">{detail}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-600 italic">Sin ejercicios específicos listados</p>
          )}
        </div>
      );
    });
    
    // Render summary
    if (summaryText.length > 0) {
      result.push(
        <div key="summary" className="mt-8 pt-6 border-t-2 border-gray-300">
          {summaryText.map((text, idx) => (
            <p key={idx} className="text-gray-700 mb-2 leading-relaxed">
              {text}
            </p>
          ))}
        </div>
      );
    }
    
    return result.length > 0 ? result : lines.map((line, idx) => (
      <p key={idx} className="text-gray-700 my-1.5">{line}</p>
    ));
  };

  if (checkingPremium) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Verificando acceso...</p>
        </div>
      </div>
    );
  }

  if (!hasPremium) {
    return (
      <div className="min-h-screen bg-white">
        <header className="bg-white/80 backdrop-blur-md shadow-lg border-b border-gray-200/50 sticky top-0 z-50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center py-4">
              <Link href="/dashboard" className="text-gray-700 hover:text-primary-600">
                <ArrowLeft className="h-5 w-5" />
              </Link>
              <h1 className="text-2xl font-bold text-gray-900">AI Hub</h1>
              <button onClick={logout} className="text-gray-700 hover:text-red-600">
                <LogOut className="h-5 w-5" />
              </button>
            </div>
          </div>
        </header>

        <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div className="text-center">
            <Sparkles className="h-24 w-24 text-primary-600 mx-auto mb-6" />
            <h2 className="text-3xl font-bold text-gray-900 mb-4">
              Acceso Premium Requerido
            </h2>
            <p className="text-xl text-gray-600 mb-8">
              El AI Hub está disponible exclusivamente para usuarios Premium
            </p>
            <Link href="/planes" className="btn btn-primary">
              Ver Planes Premium
            </Link>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white flex flex-col">
      <header className="bg-white/80 backdrop-blur-md shadow-lg border-b border-gray-200/50 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center space-x-4">
              <Link href="/dashboard" className="text-gray-700 hover:text-primary-600">
                <ArrowLeft className="h-5 w-5" />
              </Link>
              <div className="flex items-center space-x-2">
                <Sparkles className="h-6 w-6 text-primary-600" />
                <h1 className="text-2xl font-bold text-gray-900">AI Hub Premium</h1>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <button
                onClick={() => setShowPhotoUpload(true)}
                className="flex items-center space-x-2 text-primary-600 hover:text-primary-700"
                title="Subir foto de progreso"
              >
                <Camera className="h-5 w-5" />
                <span className="hidden md:inline">Progreso</span>
              </button>
              <button
                onClick={() => setActiveTab(activeTab === 'settings' ? 'chat' : 'settings')}
                className={`px-3 py-2 rounded-lg transition-colors flex items-center space-x-2 ${
                  activeTab === 'settings' 
                    ? 'bg-primary-100 text-primary-700' 
                    : 'text-gray-700 hover:bg-gray-100 hover:text-primary-600'
                }`}
                title="Mi Perfil"
              >
                <User className="h-5 w-5" />
                <span className="font-medium">Perfil</span>
              </button>
              <button onClick={logout} className="text-gray-700 hover:text-red-600">
                <LogOut className="h-5 w-5" />
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8">
        {/* Tabs */}
        <div className="flex space-x-2 mb-6 border-b border-gray-200 overflow-x-auto">
          <button
            onClick={() => {
              setActiveTab('chat');
            }}
            className={`px-4 py-3 font-medium transition-all whitespace-nowrap rounded-t-lg ${
              activeTab === 'chat'
                ? 'text-primary-600 border-b-2 border-primary-600 bg-primary-50'
                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
            }`}
          >
            <Bot className="h-5 w-5 inline mr-2" />
            Chat
          </button>
          <button
            onClick={() => {
              setActiveTab('meal');
            }}
            className={`px-4 py-3 font-medium transition-all whitespace-nowrap rounded-t-lg ${
              activeTab === 'meal'
                ? 'text-primary-600 border-b-2 border-primary-600 bg-primary-50'
                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
            }`}
          >
            <ChefHat className="h-5 w-5 inline mr-2" />
            Plan Alimenticio
          </button>
          <button
            onClick={() => {
              setActiveTab('workout');
            }}
            className={`px-4 py-3 font-medium transition-all whitespace-nowrap rounded-t-lg ${
              activeTab === 'workout'
                ? 'text-primary-600 border-b-2 border-primary-600 bg-primary-50'
                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
            }`}
          >
            <Dumbbell className="h-5 w-5 inline mr-2" />
            Rutina
          </button>
          <button
            onClick={() => setActiveTab('progress')}
            className={`px-4 py-2 font-medium transition-colors whitespace-nowrap ${
              activeTab === 'progress'
                ? 'text-primary-600 border-b-2 border-primary-600'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <TrendingUp className="h-5 w-5 inline mr-2" />
            Progreso
          </button>
        </div>

        {/* Profile Tab */}
        {activeTab === 'settings' && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex justify-between items-center mb-6">
              <div className="flex items-center space-x-3">
                <h3 className="text-2xl font-bold text-gray-900">Mi Perfil de Fitness</h3>
                {saving && (
                  <div className="flex items-center space-x-2 text-primary-600">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary-600"></div>
                    <span className="text-sm">Guardando...</span>
                  </div>
                )}
                {hasUnsavedChanges && !saving && (
                  <div className="flex items-center space-x-2 text-yellow-600">
                    <AlertCircle className="h-4 w-4" />
                    <span className="text-sm">Cambios sin guardar</span>
                  </div>
                )}
                {!hasUnsavedChanges && !saving && (
                  <div className="flex items-center space-x-2 text-green-600">
                    <CheckCircle className="h-4 w-4" />
                    <span className="text-sm">Guardado</span>
                  </div>
                )}
              </div>
              <div className="flex items-center space-x-2">
                {hasUnsavedChanges && (
                  <button
                    onClick={handleSaveClick}
                    disabled={saving}
                    className="btn btn-primary text-sm flex items-center space-x-2"
                  >
                    <Save className="h-4 w-4" />
                    <span>Guardar</span>
                  </button>
                )}
                <button
                  onClick={() => {
                    if (hasUnsavedChanges) {
                      if (confirm('¿Descartar los cambios sin guardar?')) {
                        setLocalProfile(userProfile);
                        setHasUnsavedChanges(false);
                        setActiveTab('chat');
                      }
                    } else {
                      setActiveTab('chat');
                    }
                  }}
                  className="text-gray-500 hover:text-gray-700 transition-colors"
                  title="Cerrar"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>

            <div className="space-y-6">
              {/* Información Básica */}
              <div>
                <h4 className="text-lg font-semibold text-gray-800 mb-4 pb-2 border-b border-gray-200">
                  Información Básica
                </h4>
                <div className="grid md:grid-cols-3 gap-4">
                  <div>
                    <label className="label">Peso (kg) *</label>
                    <input
                      type="text"
                      className="input"
                      value={localProfile?.weight?.toString() || ''}
                      onChange={(e) => {
                        const value = e.target.value.replace(/[^0-9.]/g, '');
                        if (value === '' || value === '.') {
                          updateLocalProfile({ weight: undefined });
                        } else {
                          const num = parseFloat(value);
                          if (!isNaN(num)) {
                            updateLocalProfile({ weight: num });
                          }
                        }
                      }}
                      placeholder="70.5"
                    />
                  </div>
                  <div>
                    <label className="label">Altura (cm) *</label>
                    <input
                      type="text"
                      className="input"
                      value={localProfile?.height?.toString() || ''}
                      onChange={(e) => {
                        const value = e.target.value.replace(/[^0-9]/g, '');
                        if (value === '') {
                          updateLocalProfile({ height: undefined });
                        } else {
                          const num = parseInt(value);
                          if (!isNaN(num)) {
                            updateLocalProfile({ height: num });
                          }
                        }
                      }}
                      placeholder="175"
                    />
                  </div>
                  <div>
                    <label className="label">Edad *</label>
                    <input
                      type="number"
                      className="input"
                      value={localProfile?.age || ''}
                      onChange={(e) => updateLocalProfile({ age: parseInt(e.target.value) || undefined })}
                      placeholder="25"
                    />
                  </div>
                </div>
              </div>

              {/* Objetivo */}
              <div>
                <h4 className="text-lg font-semibold text-gray-800 mb-4 pb-2 border-b border-gray-200">
                  Objetivo Principal
                </h4>
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <label className="label">¿Cuál es tu objetivo principal? *</label>
                    <select
                      className="input"
                      value={localProfile?.goal || ''}
                      onChange={(e) => updateLocalProfile({ goal: e.target.value || undefined })}
                    >
                      <option value="">Selecciona un objetivo</option>
                      <option value="bajar peso">Bajar de peso / Pérdida de grasa</option>
                      <option value="mantener peso">Mantener peso / Tonificar</option>
                      <option value="subir peso">Subir de peso / Ganar masa muscular</option>
                      <option value="definicion">Definición muscular</option>
                      <option value="fuerza">Aumentar fuerza</option>
                      <option value="resistencia">Mejorar resistencia</option>
                      <option value="salud general">Salud general / Bienestar</option>
                    </select>
                  </div>
                  <div>
                    <label className="label">Nivel de Fitness Actual *</label>
                    <select
                      className="input"
                      value={localProfile?.fitnessLevel || 'beginner'}
                      onChange={(e) => updateLocalProfile({ fitnessLevel: e.target.value as any })}
                    >
                      <option value="beginner">Principiante (0-6 meses)</option>
                      <option value="intermediate">Intermedio (6 meses - 2 años)</option>
                      <option value="advanced">Avanzado (2+ años)</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Experiencia en Entrenamiento */}
              <div>
                <h4 className="text-lg font-semibold text-gray-800 mb-4 pb-2 border-b border-gray-200">
                  Experiencia en Entrenamiento
                </h4>
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <label className="label">Años entrenando</label>
                    <input
                      type="number"
                      className="input"
                      value={localProfile?.trainingExperience?.years || ''}
                      onChange={(e) => {
                        const currentExp = localProfile?.trainingExperience || { years: 0, months: 0 };
                        updateLocalProfile({
                          trainingExperience: {
                            years: parseInt(e.target.value) || 0,
                            months: currentExp.months || 0,
                          }
                        });
                      }}
                      placeholder="2"
                      min="0"
                    />
                  </div>
                  <div>
                    <label className="label">Meses adicionales</label>
                    <input
                      type="number"
                      className="input"
                      value={localProfile?.trainingExperience?.months || ''}
                      onChange={(e) => {
                        const currentExp = localProfile?.trainingExperience || { years: 0, months: 0 };
                        updateLocalProfile({
                          trainingExperience: {
                            years: currentExp.years || 0,
                            months: parseInt(e.target.value) || 0,
                          }
                        });
                      }}
                      placeholder="6"
                      min="0"
                      max="11"
                    />
                  </div>
                </div>
                {localProfile?.trainingExperience && (
                  <p className="text-sm text-gray-600 mt-2">
                    Total: {((localProfile.trainingExperience.years || 0) * 12 + (localProfile.trainingExperience.months || 0))} meses de experiencia
                  </p>
                )}
              </div>

              {/* Composición Corporal */}
              <div>
                <h4 className="text-lg font-semibold text-gray-800 mb-4 pb-2 border-b border-gray-200">
                  Composición Corporal (Opcional)
                </h4>
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <label className="label">Grasa Corporal (%)</label>
                    <input
                      type="number"
                      step="0.1"
                      className="input"
                      value={localProfile?.bodyFat || ''}
                      onChange={(e) => updateLocalProfile({ bodyFat: parseFloat(e.target.value) || undefined })}
                      placeholder="15.0"
                      min="0"
                      max="50"
                    />
                  </div>
                  <div>
                    <label className="label">Masa Muscular (kg)</label>
                    <input
                      type="number"
                      step="0.1"
                      className="input"
                      value={localProfile?.muscleMass || ''}
                      onChange={(e) => updateLocalProfile({ muscleMass: parseFloat(e.target.value) || undefined })}
                      placeholder="55.0"
                      min="0"
                    />
                  </div>
                </div>
              </div>

              {/* Preferencias de Entrenamiento */}
              <div>
                <h4 className="text-lg font-semibold text-gray-800 mb-4 pb-2 border-b border-gray-200">
                  Preferencias de Entrenamiento
                </h4>
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <label className="label">Días disponibles por semana</label>
                    <div className="flex flex-wrap gap-2 mt-2">
                      {['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'].map((day, index) => (
                        <button
                          key={index}
                          type="button"
                          onClick={() => {
                            const currentDays = localProfile?.preferences?.workoutDays || [];
                            const newDays = currentDays.includes(index)
                              ? currentDays.filter(d => d !== index)
                              : [...currentDays, index];
                            updateLocalProfile({
                              preferences: {
                                ...localProfile?.preferences,
                                workoutDays: newDays,
                              }
                            });
                          }}
                          className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
                            localProfile?.preferences?.workoutDays?.includes(index)
                              ? 'bg-primary-600 text-white'
                              : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                          }`}
                        >
                          {day.substring(0, 3)}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className="label">Horario preferido</label>
                    <select
                      className="input"
                      value={localProfile?.preferences?.preferredTime || ''}
                      onChange={(e) => updateLocalProfile({
                        preferences: {
                          ...localProfile?.preferences,
                          preferredTime: e.target.value || undefined,
                        }
                      })}
                    >
                      <option value="">Sin preferencia</option>
                      <option value="morning">Mañana (6am - 12pm)</option>
                      <option value="afternoon">Tarde (12pm - 6pm)</option>
                      <option value="evening">Noche (6pm - 10pm)</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Lesiones y Limitaciones */}
              <div>
                <h4 className="text-lg font-semibold text-gray-800 mb-4 pb-2 border-b border-gray-200">
                  Lesiones y Limitaciones (Opcional)
                </h4>
                <div>
                  <label className="label">¿Tienes alguna lesión o limitación física?</label>
                  <textarea
                    className="input mt-2"
                    rows={4}
                    placeholder="Ej: Lesión en rodilla izquierda, dolor en espalda baja, etc."
                    value={
                      localProfile?.injuriesText || ''
                    }
                    onChange={(e) => {
                      // Store the raw text directly, preserving all spaces
                      const text = e.target.value;
                      updateLocalProfile({ injuriesText: text });
                    }}
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Describe tus lesiones o limitaciones. Puedes usar espacios libremente.
                  </p>
                </div>
              </div>

              {/* Resumen */}
              {localProfile?.weight && localProfile?.height && (
                <div className="bg-primary-50 p-4 rounded-lg border border-primary-200">
                  <h4 className="font-semibold text-primary-900 mb-2">Resumen de tu Perfil</h4>
                  <div className="grid md:grid-cols-3 gap-4 text-sm">
                    <div>
                      <span className="text-gray-600">IMC:</span>
                      <span className="font-semibold ml-2 text-primary-700">
                        {((localProfile.weight / ((localProfile.height / 100) ** 2))).toFixed(1)}
                      </span>
                    </div>
                    {localProfile.goal && (
                      <div>
                        <span className="text-gray-600">Objetivo:</span>
                        <span className="font-semibold ml-2 text-primary-700 capitalize">
                          {localProfile.goal}
                        </span>
                      </div>
                    )}
                    {localProfile.trainingExperience && (
                      <div>
                        <span className="text-gray-600">Experiencia:</span>
                        <span className="font-semibold ml-2 text-primary-700">
                          {((localProfile.trainingExperience.years || 0) * 12 + (localProfile.trainingExperience.months || 0))} meses
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Progress Tab */}
        {activeTab === 'progress' && (
          <div className="space-y-6">
            <div className="grid md:grid-cols-3 gap-6">
              <div className="card">
                <h3 className="font-semibold mb-2">Peso Actual</h3>
                <p className="text-3xl font-bold text-primary-600">
                  {userProfile?.weight ? `${userProfile.weight} kg` : 'N/A'}
                </p>
              </div>
              <div className="card">
                <h3 className="font-semibold mb-2">IMC</h3>
                <p className="text-3xl font-bold text-primary-600">
                  {userProfile?.weight && userProfile?.height
                    ? ((userProfile.weight / ((userProfile.height / 100) ** 2))).toFixed(1)
                    : 'N/A'}
                </p>
              </div>
              <div className="card">
                <h3 className="font-semibold mb-2">Grasa Corporal</h3>
                <p className="text-3xl font-bold text-primary-600">
                  {userProfile?.bodyFat ? `${userProfile.bodyFat}%` : 'N/A'}
                </p>
              </div>
            </div>

            <div className="card">
              <div className="flex justify-between items-center mb-4">
                <h3 className="font-semibold">Fotos de Progreso</h3>
                <div className="flex gap-2">
                  {userProfile?.bodyPhotos && userProfile.bodyPhotos.length > 0 && (
                    <button
                      onClick={async () => {
                        if (selectedPhotosForAnalysis.length === 0) {
                          showToast('Por favor selecciona al menos una foto para analizar', 'warning');
                          return;
                        }
                        await handleAnalyzeProgress();
                      }}
                      disabled={analysisLoading || selectedPhotosForAnalysis.length === 0}
                      className="btn btn-secondary text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <Sparkles className="h-4 w-4 mr-2" />
                      {analysisLoading ? 'Analizando...' : 'Analizar con IA'}
                    </button>
                  )}
                  <button
                    onClick={() => setShowPhotoUpload(true)}
                    className="btn btn-primary text-sm"
                  >
                    <Upload className="h-4 w-4 mr-2" />
                    Subir Foto
                  </button>
                </div>
              </div>
              {(() => {
                // Group photos by week
                const groupPhotosByWeek = (photos: BodyPhoto[]) => {
                  const grouped: { [key: string]: BodyPhoto[] } = {};
                  
                  photos.forEach(photo => {
                    const photoDate = new Date(photo.date);
                    // Get the start of the week (Monday)
                    const startOfWeek = new Date(photoDate);
                    const dayOfWeek = startOfWeek.getDay(); // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
                    // Calculate days to subtract to get to Monday
                    // If Sunday (0), subtract 6 days. Otherwise subtract (dayOfWeek - 1) days
                    const daysToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
                    startOfWeek.setDate(startOfWeek.getDate() - daysToMonday);
                    startOfWeek.setHours(0, 0, 0, 0);
                    
                    // Create a key for the week (YYYY-MM-DD format for Monday)
                    const year = startOfWeek.getFullYear();
                    const month = String(startOfWeek.getMonth() + 1).padStart(2, '0');
                    const day = String(startOfWeek.getDate()).padStart(2, '0');
                    const weekKey = `${year}-${month}-${day}`;
                    
                    if (!grouped[weekKey]) {
                      grouped[weekKey] = [];
                    }
                    grouped[weekKey].push(photo);
                  });
                  
                  // Sort photos within each week by date (newest first)
                  Object.keys(grouped).forEach(key => {
                    grouped[key].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
                  });
                  
                  // Convert to array and sort by week (newest first)
                  return Object.entries(grouped)
                    .sort(([a], [b]) => b.localeCompare(a))
                    .map(([key, photos]) => {
                      // Calculate the start of week from the first photo's date
                      const firstPhotoDate = new Date(photos[0].date);
                      const dayOfWeek = firstPhotoDate.getDay();
                      const daysToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
                      const startOfWeek = new Date(firstPhotoDate);
                      startOfWeek.setDate(startOfWeek.getDate() - daysToMonday);
                      startOfWeek.setHours(0, 0, 0, 0);
                      
                      return {
                        weekKey: key,
                        weekLabel: getWeekLabel(startOfWeek),
                        photos,
                      };
                    });
                };
                
                // Helper function to get week number
                const getWeekNumber = (date: Date) => {
                  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
                  const dayNum = d.getUTCDay() || 7;
                  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
                  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
                  return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
                };
                
                // Helper function to format week label
                const getWeekLabel = (date: Date) => {
                  // Calculate start of week (Monday)
                  const startOfWeek = new Date(date);
                  const dayOfWeek = startOfWeek.getDay(); // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
                  // Calculate days to subtract to get to Monday
                  // If Sunday (0), subtract 6 days. Otherwise subtract (dayOfWeek - 1) days
                  const daysToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
                  startOfWeek.setDate(startOfWeek.getDate() - daysToMonday);
                  startOfWeek.setHours(0, 0, 0, 0);
                  
                  // Calculate end of week (Sunday) - always 6 days after Monday
                  const endOfWeek = new Date(startOfWeek);
                  endOfWeek.setDate(endOfWeek.getDate() + 6);
                  endOfWeek.setHours(23, 59, 59, 999);
                  
                  // Format dates
                  const startDay = startOfWeek.getDate();
                  const endDay = endOfWeek.getDate();
                  const startMonth = startOfWeek.toLocaleDateString('es-CR', { month: 'short' });
                  const endMonth = endOfWeek.toLocaleDateString('es-CR', { month: 'short' });
                  const year = startOfWeek.getFullYear();
                  
                  // Format label
                  if (startOfWeek.getMonth() === endOfWeek.getMonth()) {
                    return `${startDay}-${endDay} ${startMonth} ${year}`;
                  } else {
                    return `${startDay} ${startMonth} - ${endDay} ${endMonth} ${year}`;
                  }
                };
                
                const groupedPhotos = userProfile?.bodyPhotos 
                  ? groupPhotosByWeek([...userProfile.bodyPhotos])
                  : [];
                
                return (
                  <div className="space-y-6">
                    {groupedPhotos.map(({ weekKey, weekLabel, photos }) => (
                      <div key={weekKey} className="space-y-3">
                        <div className="flex items-center space-x-2 pb-2 border-b border-gray-200">
                          <Calendar className="h-4 w-4 text-primary-600" />
                          <h4 className="font-semibold text-gray-900">Semana del {weekLabel}</h4>
                          <span className="text-sm text-gray-500">({photos.length} foto{photos.length > 1 ? 's' : ''})</span>
                        </div>
                        <div className="grid md:grid-cols-3 gap-4">
                          {photos.map((photo) => {
                            // Construct full URL for the image
                            let imageUrl = photo.url;
                            if (!imageUrl.startsWith('http')) {
                              // If it's a relative path, prepend the base URL (without /api)
                              // Images are served directly from the backend, not through /api
                              const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api';
                              const baseUrl = apiUrl.replace('/api', ''); // Remove /api from the URL
                              imageUrl = `${baseUrl}${photo.url.startsWith('/') ? photo.url : `/${photo.url}`}`;
                            }
                            
                            const isSelected = selectedPhotosForAnalysis.includes(photo._id);
                            
                            return (
                              <div key={photo._id} className="relative group">
                                <div 
                                  className={`aspect-square rounded-lg overflow-hidden bg-gray-100 border-2 relative cursor-pointer transition-all ${
                                    isSelected 
                                      ? 'border-primary-600 ring-2 ring-primary-300' 
                                      : 'border-gray-200'
                                  }`}
                                  onClick={() => {
                                    if (isSelected) {
                                      setSelectedPhotosForAnalysis(selectedPhotosForAnalysis.filter(id => id !== photo._id));
                                    } else {
                                      setSelectedPhotosForAnalysis([...selectedPhotosForAnalysis, photo._id]);
                                    }
                                  }}
                                >
                                  <img
                                    src={imageUrl}
                                    alt={`Foto ${photo.type}`}
                                    className="w-full h-full object-cover"
                                    onError={(e) => {
                                      console.error('Error loading image:', {
                                        imageUrl,
                                        photoUrl: photo.url,
                                        baseUrl: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000',
                                        photo
                                      });
                                      // Hide the broken image and show a placeholder div instead
                                      const imgElement = e.target as HTMLImageElement;
                                      imgElement.style.display = 'none';
                                      // Show the placeholder div
                                      const placeholder = imgElement.parentElement?.querySelector('.image-placeholder') as HTMLElement;
                                      if (placeholder) {
                                        placeholder.classList.remove('hidden');
                                      }
                                    }}
                                    onLoad={() => {
                                      console.log('Image loaded successfully:', imageUrl);
                                    }}
                                  />
                                  <div className="image-placeholder absolute inset-0 flex items-center justify-center bg-gray-200 hidden">
                                    <Camera className="h-12 w-12 text-gray-400" />
                                  </div>
                                  {/* Selection indicator */}
                                  {isSelected && (
                                    <div className="absolute top-2 left-2 bg-primary-600 text-white rounded-full p-1.5 shadow-lg">
                                      <CheckCircle className="h-5 w-5" />
                                    </div>
                                  )}
                                  {/* Delete button - appears on hover */}
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleDeletePhoto(photo._id);
                                    }}
                                    className="absolute top-2 right-2 bg-red-500 hover:bg-red-600 text-white rounded-full p-2 opacity-0 group-hover:opacity-100 transition-opacity shadow-lg z-10"
                                    title="Eliminar foto"
                                  >
                                    <X className="h-4 w-4" />
                                  </button>
                                </div>
                                <div className="mt-2 text-sm text-gray-600">
                                  <p className="font-medium capitalize">{photo.type}</p>
                                  <p className="text-xs">
                                    {new Date(photo.date).toLocaleDateString('es-CR', { 
                                      day: 'numeric', 
                                      month: 'short',
                                      year: 'numeric'
                                    })}
                                  </p>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                );
              })()}
              {(!userProfile?.bodyPhotos || userProfile.bodyPhotos.length === 0) && (
                <div className="text-center py-12 text-gray-500">
                  <Camera className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                  <p>No hay fotos de progreso aún</p>
                  <button
                    onClick={() => setShowPhotoUpload(true)}
                    className="btn btn-primary mt-4"
                  >
                    Subir Primera Foto
                  </button>
                </div>
              )}
            </div>
              
              {/* AI Analysis Section */}
              {userProfile?.bodyPhotos && userProfile.bodyPhotos.length > 0 && (
                <div className="card mt-6">
                  <div className="flex items-center space-x-2 mb-4">
                    <Sparkles className="h-5 w-5 text-primary-600" />
                    <h3 className="font-semibold">Análisis de Progreso con IA</h3>
                  </div>
                  <p className="text-sm text-gray-600 mb-4">
                    Selecciona una o más fotos de progreso para que la IA analice tu evolución física y te proporcione recomendaciones personalizadas.
                  </p>
                  
                  {selectedPhotosForAnalysis.length > 0 && (
                    <div className="mb-4 p-3 bg-primary-50 rounded-lg border border-primary-200">
                      <p className="text-sm text-primary-700">
                        <strong>{selectedPhotosForAnalysis.length}</strong> foto{selectedPhotosForAnalysis.length > 1 ? 's' : ''} seleccionada{selectedPhotosForAnalysis.length > 1 ? 's' : ''}
                      </p>
                      <button
                        onClick={() => setSelectedPhotosForAnalysis([])}
                        className="text-xs text-primary-600 hover:text-primary-800 mt-1 underline"
                      >
                        Deseleccionar todas
                      </button>
                    </div>
                  )}
                  
                  {analysisResult && (
                    <div className="mt-4 p-5 bg-gradient-to-br from-white to-gray-50 rounded-xl border border-gray-200 shadow-md">
                      <div className="flex items-start space-x-4">
                        <div className="flex-shrink-0">
                          <div className="h-12 w-12 rounded-full bg-gradient-to-br from-primary-500 to-primary-600 flex items-center justify-center shadow-lg">
                            <Bot className="h-7 w-7 text-white" />
                          </div>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between mb-3">
                            <h4 className="font-bold text-gray-900 text-lg">Análisis de Progreso</h4>
                            <button
                              onClick={() => setAnalysisResult(null)}
                              className="text-gray-400 hover:text-gray-600 transition-colors"
                              title="Cerrar análisis"
                            >
                              <X className="h-5 w-5" />
                            </button>
                          </div>
                          <div className="prose prose-sm max-w-none">
                            {renderChatMessage(analysisResult)}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
          </div>
        )}

        {/* Chat Content */}
        {activeTab === 'chat' && (
          <div className="bg-white rounded-lg shadow-lg border border-gray-200 flex flex-col" style={{ height: 'calc(100vh - 300px)' }}>
            {/* Chat Header */}
            {getCurrentMessages().length > 0 && (
              <div className="flex justify-end items-center p-3 border-b border-gray-200 bg-gray-50">
                <button
                  onClick={handleClearChat}
                  className="flex items-center space-x-2 px-3 py-1.5 text-sm text-gray-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                  title="Borrar chat"
                >
                  <Trash2 className="h-4 w-4" />
                  <span>Borrar Chat</span>
                </button>
              </div>
            )}
            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-gradient-to-b from-gray-50 to-white">
              {getCurrentMessages().length === 0 ? (
                <div className="text-center text-gray-500 mt-20">
                  <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-gradient-to-br from-primary-100 to-primary-200 mb-6">
                    <Bot className="h-10 w-10 text-primary-600" />
                  </div>
                  <p className="text-lg font-medium text-gray-700 mb-2">
                    {activeTab === 'chat' && '¡Hola! Soy tu asistente personal de fitness'}
                  </p>
                  <p className="text-sm text-gray-500">
                    {activeTab === 'chat' && '¿En qué puedo ayudarte hoy?'}
                  </p>
                </div>
              ) : (
                getCurrentMessages().map((msg, idx) => (
                  <div
                    key={idx}
                    className={`flex items-start gap-3 ${
                      msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'
                    }`}
                  >
                    {msg.role === 'assistant' && (
                      <div className="flex-shrink-0">
                        <div className="h-10 w-10 rounded-full bg-gradient-to-br from-primary-500 to-primary-600 flex items-center justify-center shadow-lg shadow-primary-500/30">
                          <Bot className="h-6 w-6 text-white" />
                        </div>
                      </div>
                    )}
                    <div
                      className={`max-w-[80%] rounded-2xl px-5 py-4 shadow-sm ${
                        msg.role === 'user'
                          ? 'bg-gradient-to-br from-primary-600 to-primary-700 text-white shadow-primary-500/20'
                          : 'bg-white text-gray-900 border border-gray-200 shadow-md'
                      }`}
                    >
                      <div className={`prose prose-sm max-w-none ${msg.role === 'user' ? 'prose-invert' : ''}`}>
                        {/* Show images if present */}
                        {msg.images && msg.images.length > 0 && (
                          <div className="flex flex-wrap gap-2 mb-3">
                            {msg.images.map((imgUrl, imgIdx) => {
                              // Check if it's a blob URL or a server URL
                              const isBlobUrl = imgUrl.startsWith('blob:');
                              const isServerUrl = imgUrl.startsWith('http://') || imgUrl.startsWith('https://') || imgUrl.startsWith('/uploads/');
                              
                              return (
                                <div key={imgIdx} className="relative group">
                                  {isBlobUrl || isServerUrl ? (
                                    <img
                                      src={imgUrl}
                                      alt={`Imagen ${imgIdx + 1}`}
                                      className="w-32 h-32 object-cover rounded-lg border-2 border-gray-300 cursor-pointer hover:opacity-90 transition-opacity"
                                      onError={(e) => {
                                        console.error('Error loading image:', imgUrl);
                                        (e.target as HTMLImageElement).style.display = 'none';
                                      }}
                                    />
                                  ) : (
                                    <div className="w-32 h-32 rounded-lg border-2 border-gray-300 bg-gray-100 flex items-center justify-center">
                                      <ImageIcon className="h-8 w-8 text-gray-400" />
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        )}
                        {msg.content && (
                          <div className="leading-relaxed text-[15px]">
                            {renderChatMessage(msg.content, msg.role === 'user')}
                          </div>
                        )}
                      </div>
                      {msg.timestamp && (
                        <p className={`text-xs mt-2 ${msg.role === 'user' ? 'text-primary-100' : 'text-gray-400'}`}>
                          {new Date(msg.timestamp).toLocaleTimeString('es-CR', { hour: '2-digit', minute: '2-digit' })}
                        </p>
                      )}
                    </div>
                    {msg.role === 'user' && (
                      <div className="flex-shrink-0">
                        <div className="h-10 w-10 rounded-full bg-gradient-to-br from-gray-300 to-gray-400 flex items-center justify-center shadow-md">
                          <User className="h-6 w-6 text-white" />
                        </div>
                      </div>
                    )}
                  </div>
                ))
              )}
              {chatLoading && (
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0">
                    <div className="h-10 w-10 rounded-full bg-gradient-to-br from-primary-500 to-primary-600 flex items-center justify-center shadow-lg shadow-primary-500/30">
                      <Bot className="h-6 w-6 text-white animate-pulse" />
                    </div>
                  </div>
                  <div className="bg-white border border-gray-200 rounded-2xl px-5 py-4 shadow-md">
                    <div className="flex space-x-2 items-center">
                      <span className="text-sm text-gray-600 mr-2">Escribiendo</span>
                      <div className="flex space-x-1.5">
                        <div className="w-2 h-2 bg-primary-500 rounded-full animate-bounce"></div>
                        <div className="w-2 h-2 bg-primary-500 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                        <div className="w-2 h-2 bg-primary-500 rounded-full animate-bounce" style={{ animationDelay: '0.4s' }}></div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input Area */}
            <div className="border-t border-gray-200 bg-white p-4 rounded-b-lg">
              {activeTab === 'chat' ? (
                <div className="space-y-3">
                  {/* Image Previews */}
                  {imagePreviews.length > 0 && (
                    <div className="flex flex-wrap gap-2 pb-2 border-b border-gray-200">
                      {imagePreviews.map((preview, index) => (
                        <div key={index} className="relative">
                          <img
                            src={preview}
                            alt={`Preview ${index + 1}`}
                            className="w-20 h-20 object-cover rounded-lg border border-gray-200"
                          />
                          <button
                            onClick={() => removeImage(index)}
                            className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs hover:bg-red-600 transition-colors"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                  
                  {/* Photo Upload Count Info */}
                  {photoUploadCount && photoUploadCount.count > 0 && (
                    <div className="text-xs text-gray-500">
                      Fotos subidas hoy: {photoUploadCount.count}/5
                    </div>
                  )}

                  <div className="flex space-x-3">
                    <label className="cursor-pointer flex items-center justify-center px-4 py-2 border-2 border-gray-300 rounded-lg hover:border-primary-500 hover:bg-primary-50 transition-colors">
                      <ImageIcon className="h-5 w-5 text-gray-600" />
                      <input
                        type="file"
                        accept="image/*"
                        multiple
                        onChange={handleImageSelect}
                        className="hidden"
                        disabled={chatLoading || (photoUploadCount?.count || 0) >= 5}
                      />
                    </label>
                    <input
                      key="chat-input"
                      id="chat-input"
                      name="chat-input"
                      type="text"
                      value={input}
                      onChange={(e) => {
                        e.stopPropagation();
                        setInput(e.target.value);
                      }}
                      onKeyPress={(e) => e.key === 'Enter' && !e.shiftKey && !chatLoading && (input.trim() || chatImages.length > 0) && handleSend()}
                      placeholder="Escribe tu pregunta o pide consejos..."
                      className="flex-1 input border-2 focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20"
                      disabled={chatLoading}
                    />
                    <button
                      onClick={handleSend}
                      disabled={chatLoading || (!input.trim() && chatImages.length === 0)}
                      className="btn btn-primary px-6 shadow-lg shadow-primary-500/30 hover:shadow-xl hover:shadow-primary-500/40 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                    >
                      {chatLoading ? (
                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                      ) : (
                        <Send className="h-5 w-5" />
                      )}
                    </button>
                  </div>
                </div>
              ) : null}
            </div>
          </div>
        )}

        {/* Meal Plan Specific Content */}
        {activeTab === 'meal' && (
          <div className="bg-white rounded-lg shadow-lg border border-gray-200 flex flex-col" style={{ height: 'calc(100vh - 300px)' }}>
            {/* Meal Plan Header */}
            {mealMessages.length > 0 && (
              <div className="flex justify-end items-center p-3 border-b border-gray-200 bg-gray-50">
                <button
                  onClick={handleClearMealPlan}
                  className="flex items-center space-x-2 px-3 py-1.5 text-sm text-gray-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                  title="Borrar plan alimenticio"
                >
                  <Trash2 className="h-4 w-4" />
                  <span>Borrar Plan</span>
                </button>
              </div>
            )}
            <div className="p-4 border-b border-gray-200">
              {/* Compact Calories Card */}
              {calculatedCalories && (
                <div className="bg-gradient-to-r from-primary-500 to-primary-600 rounded-lg p-3 text-white shadow-md">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <ChefHat className="h-5 w-5" />
                      <div>
                        <p className="text-xs text-primary-100">Calorías Diarias</p>
                        <p className="text-xl font-bold">{calculatedCalories.toLocaleString('es-CR')} <span className="text-sm font-normal">kcal</span></p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-primary-100">{userProfile?.weight}kg • {userProfile?.height}cm • {userProfile?.age}a</p>
                      {userProfile?.goal && <p className="text-xs text-primary-100">{userProfile.goal}</p>}
                    </div>
                  </div>
                </div>
              )}
              {!calculatedCalories && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                  <p className="text-xs text-yellow-800">
                    ⚠️ Completa tu perfil (peso, altura, edad) para calcular calorías
                  </p>
                </div>
              )}
            </div>
            
            <div className="flex-1 overflow-y-auto p-6 bg-gradient-to-b from-gray-50 to-white">
              {/* Options Row */}
              {mealMessages.length === 0 && (
                <div className="max-w-2xl mx-auto space-y-6">
                  {/* Welcome Message */}
                  <div className="text-center space-y-2 mb-6">
                    <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary-100 mb-3">
                      <ChefHat className="h-8 w-8 text-primary-600" />
                    </div>
                    <h3 className="text-xl font-bold text-gray-900">Plan Alimenticio Personalizado</h3>
                    <p className="text-sm text-gray-600">Configura tus preferencias y genera un plan adaptado a tus necesidades</p>
                  </div>

                  {/* Form Card */}
                  <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 space-y-5">
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                          Tipo de dieta
                        </label>
                        <select
                          className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 transition-all text-sm bg-white"
                          value={mealPlanData.dietType}
                          onChange={(e) => setMealPlanData({ ...mealPlanData, dietType: e.target.value })}
                        >
                          <option value="">Sin restricción</option>
                          <option value="vegano">Vegano</option>
                          <option value="vegetariano">Vegetariano</option>
                          <option value="sin gluten">Sin gluten</option>
                          <option value="keto">Keto</option>
                        </select>
                      </div>
                      
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                          Preferencias adicionales
                        </label>
                        <div className="flex flex-wrap gap-2">
                          {['Alto proteína', 'Rico fibra', 'Bajo sodio'].map((pref) => (
                            <button
                              key={pref}
                              type="button"
                              onClick={() => {
                                const current = mealPlanData.preferences || [];
                                const newPrefs = current.includes(pref)
                                  ? current.filter(p => p !== pref)
                                  : [...current, pref];
                                setMealPlanData({ ...mealPlanData, preferences: newPrefs });
                              }}
                              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                                mealPlanData.preferences?.includes(pref)
                                  ? 'bg-primary-600 text-white shadow-md shadow-primary-500/30'
                                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200 border border-gray-200'
                              }`}
                            >
                              {pref}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>

                    <div className="pt-4 border-t border-gray-200">
                      <button
                        onClick={handleGenerateMealPlan}
                        disabled={mealLoading || !calculatedCalories}
                        className="w-full bg-gradient-to-r from-primary-600 to-primary-700 text-white font-semibold py-3.5 rounded-lg shadow-lg shadow-primary-500/30 hover:shadow-xl hover:shadow-primary-500/40 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center space-x-2"
                      >
                        {mealLoading ? (
                          <>
                            <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent"></div>
                            <span>Generando plan...</span>
                          </>
                        ) : calculatedCalories 
                          ? (
                            <>
                              <ChefHat className="h-5 w-5" />
                              <span>Generar Plan ({calculatedCalories.toLocaleString('es-CR')} kcal)</span>
                            </>
                          )
                          : (
                            <>
                              <AlertCircle className="h-5 w-5" />
                              <span>Completa tu perfil primero</span>
                            </>
                          )}
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Messages Display - Only show user messages after initial generation */}
              {mealMessages.length > 0 && (
                <>
                  {mealMessages.map((msg, idx) => {
                    // Skip user messages that are the initial prompt (technical prompts sent to AI)
                    if (msg.role === 'user' && (
                      msg.content.includes('Genera un plan alimenticio') ||
                      msg.content.includes('Calorías diarias objetivo') ||
                      msg.content.includes('Preferencias dietéticas') ||
                      msg.content.includes('Tipo de dieta:') ||
                      msg.content.includes('IMPORTANTE: El plan completo')
                    )) {
                      return null;
                    }
                    
                    return (
                      <div
                        key={idx}
                        className={`flex items-start gap-3 ${
                          msg.role === 'user' ? 'flex-row-reverse' : ''
                        }`}
                      >
                        {msg.role === 'assistant' && (
                          <div className="flex-shrink-0">
                            <div className="h-8 w-8 rounded-full bg-gradient-to-br from-primary-500 to-primary-600 flex items-center justify-center">
                              <ChefHat className="h-4 w-4 text-white" />
                            </div>
                          </div>
                        )}
                        <div
                          className={`max-w-[80%] rounded-lg px-4 py-3 text-sm ${
                            msg.role === 'user'
                              ? 'bg-primary-600 text-white shadow-md'
                              : 'bg-white text-gray-900 border border-gray-200 shadow-sm'
                          }`}
                        >
                          <div className="leading-relaxed">
                            {msg.role === 'user' ? (
                              <>
                                <p className="text-white">{msg.content}</p>
                                {msg.pdfUrl && (
                                  <a
                                    href={msg.pdfUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="mt-2 inline-flex items-center space-x-2 text-primary-200 hover:text-white underline"
                                  >
                                    <FileText className="h-4 w-4" />
                                    <span>Ver PDF adjunto</span>
                                  </a>
                                )}
                              </>
                            ) : (
                              renderMessageContent(msg.content)
                            )}
                          </div>
                        </div>
                        {msg.role === 'user' && (
                          <div className="flex-shrink-0">
                            <div className="h-8 w-8 rounded-full bg-gray-300 flex items-center justify-center">
                              <User className="h-4 w-4 text-gray-600" />
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                  {mealLoading && (
                    <div className="flex items-start gap-3">
                      <div className="flex-shrink-0">
                        <div className="h-8 w-8 rounded-full bg-gradient-to-br from-primary-500 to-primary-600 flex items-center justify-center">
                          <ChefHat className="h-4 w-4 text-white animate-pulse" />
                        </div>
                      </div>
                      <div className="bg-white border border-gray-200 rounded-lg px-3 py-2">
                        <div className="flex space-x-1">
                          <div className="w-2 h-2 bg-primary-500 rounded-full animate-bounce"></div>
                          <div className="w-2 h-2 bg-primary-500 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                          <div className="w-2 h-2 bg-primary-500 rounded-full animate-bounce" style={{ animationDelay: '0.4s' }}></div>
                        </div>
                      </div>
                    </div>
                  )}
                  <div ref={messagesEndRef} />
                </>
              )}
            </div>

            {/* Action Buttons and Input */}
            <div className="border-t border-gray-200 bg-white p-4 space-y-3">
              {mealMessages.length > 0 && (
                <div className="flex gap-2">
                  <button
                    onClick={handleDownloadMealPlanPDF}
                    className="flex-1 btn btn-secondary text-sm py-2 flex items-center justify-center gap-2"
                  >
                    <Download className="h-4 w-4" />
                    Descargar PDF
                  </button>
                  <button
                    onClick={() => {
                      setMealMessages([]);
                      setMealPlanInput('');
                    }}
                    className="btn btn-secondary text-sm py-2 px-4"
                  >
                    Nuevo Plan
                  </button>
                </div>
              )}

              {/* Chat Input for Modifications */}
              {mealMessages.length > 0 && (
                <div className="space-y-2">
                  {/* PDF Preview */}
                  {mealPlanPdfPreview && (
                    <div className="flex items-center justify-between bg-gray-50 p-2 rounded-lg border border-gray-200">
                      <div className="flex items-center space-x-2">
                        <FileText className="h-5 w-5 text-red-600" />
                        <span className="text-sm text-gray-700 truncate">{mealPlanPdfPreview}</span>
                      </div>
                      <button
                        onClick={removeMealPlanPdf}
                        className="text-red-600 hover:text-red-800"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  )}
                  <div className="flex space-x-2">
                    <label className="cursor-pointer flex items-center justify-center px-3 py-2 border-2 border-gray-300 rounded-lg hover:border-primary-500 hover:bg-primary-50 transition-colors">
                      <FileText className="h-5 w-5 text-gray-600" />
                      <input
                        type="file"
                        accept=".pdf,application/pdf"
                        onChange={handleMealPlanPdfSelect}
                        className="hidden"
                        disabled={mealLoading}
                      />
                    </label>
                    <input
                      key="meal-plan-input"
                      id="meal-plan-input"
                      name="meal-plan-input"
                      type="text"
                      value={mealPlanInput}
                      onChange={(e) => {
                        e.stopPropagation();
                        setMealPlanInput(e.target.value);
                      }}
                      onKeyPress={(e) => e.key === 'Enter' && !e.shiftKey && !mealLoading && (mealPlanInput.trim() || mealPlanPdf) && handleMealPlanChat()}
                      placeholder="Escribe para modificar el plan o sube un PDF..."
                      className="flex-1 input text-sm py-2 border-2 focus:border-primary-500"
                      disabled={mealLoading}
                    />
                    <button
                      onClick={handleMealPlanChat}
                      disabled={mealLoading || (!mealPlanInput.trim() && !mealPlanPdf)}
                      className="btn btn-primary px-4 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {mealLoading ? (
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      ) : (
                        <Send className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Workout Routine Specific Content */}
        {activeTab === 'workout' && (
          <div className="bg-white rounded-lg shadow-lg border border-gray-200 flex flex-col" style={{ height: 'calc(100vh - 300px)' }}>
            {/* Workout Header */}
            {workoutMessages.length > 0 && (
              <div className="flex justify-end items-center p-3 border-b border-gray-200 bg-gray-50">
                <button
                  onClick={handleClearWorkout}
                  className="flex items-center space-x-2 px-3 py-1.5 text-sm text-gray-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                  title="Borrar rutina"
                >
                  <Trash2 className="h-4 w-4" />
                  <span>Borrar Rutina</span>
                </button>
              </div>
            )}
            <div className="p-4 border-b border-gray-200">
              {/* Compact Profile Info Card */}
              {userProfile && (userProfile.fitnessLevel || userProfile.preferences?.workoutDays) && (
                <div className="bg-gradient-to-r from-primary-500 to-primary-600 rounded-lg p-3 text-white shadow-md">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <Dumbbell className="h-5 w-5" />
                      <div>
                        <p className="text-xs text-primary-100">Perfil de Entrenamiento</p>
                        <p className="text-lg font-bold capitalize">
                          {userProfile.fitnessLevel === 'beginner' ? 'Principiante' : 
                           userProfile.fitnessLevel === 'intermediate' ? 'Intermedio' : 
                           userProfile.fitnessLevel === 'advanced' ? 'Avanzado' : 'Intermedio'}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      {userProfile.preferences?.workoutDays && userProfile.preferences.workoutDays.length > 0 && (
                        <p className="text-xs text-primary-100">
                          {userProfile.preferences.workoutDays.length} días/semana
                        </p>
                      )}
                      {userProfile.goal && (
                        <p className="text-xs text-primary-100">{userProfile.goal}</p>
                      )}
                    </div>
                  </div>
                </div>
              )}
              {(!userProfile?.fitnessLevel && !userProfile?.preferences?.workoutDays) && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                  <p className="text-xs text-yellow-800">
                    ⚠️ Completa tu perfil (nivel de fitness, días de entrenamiento) para una rutina personalizada
                  </p>
                </div>
              )}
            </div>
            
            <div className="flex-1 overflow-y-auto p-6 bg-gradient-to-b from-gray-50 to-white">
              {/* Options Row */}
              {workoutMessages.length === 0 && (
                <div className="max-w-2xl mx-auto space-y-6">
                  {/* Welcome Message */}
                  <div className="text-center space-y-2 mb-6">
                    <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary-100 mb-3">
                      <Dumbbell className="h-8 w-8 text-primary-600" />
                    </div>
                    <h3 className="text-xl font-bold text-gray-900">Rutina de Ejercicios Personalizada</h3>
                    <p className="text-sm text-gray-600">Genera una rutina adaptada a tu nivel de fitness y objetivos</p>
                  </div>

                  {/* Info Card */}
                  <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                    <div className="space-y-4">
                      <div className="flex items-start space-x-3">
                        <div className="flex-shrink-0">
                          <div className="w-10 h-10 rounded-lg bg-primary-100 flex items-center justify-center">
                            <Sparkles className="h-5 w-5 text-primary-600" />
                          </div>
                        </div>
                        <div className="flex-1">
                          <h4 className="font-semibold text-gray-900 mb-1">Rutina Inteligente</h4>
                          <p className="text-sm text-gray-600">
                            Tu rutina se generará automáticamente basándose en tu perfil de entrenamiento, nivel de fitness y días disponibles.
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="pt-6 mt-6 border-t border-gray-200">
                      <button
                        onClick={handleGenerateWorkout}
                        disabled={workoutLoading}
                        className="w-full bg-gradient-to-r from-primary-600 to-primary-700 text-white font-semibold py-3.5 rounded-lg shadow-lg shadow-primary-500/30 hover:shadow-xl hover:shadow-primary-500/40 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center space-x-2"
                      >
                        {workoutLoading ? (
                          <>
                            <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent"></div>
                            <span>Generando rutina...</span>
                          </>
                        ) : (
                          <>
                            <Dumbbell className="h-5 w-5" />
                            <span>Generar Rutina Personalizada</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Messages Display - Only show user messages after initial generation */}
              {workoutMessages.length > 0 && (
                <>
                  {workoutMessages.map((msg, idx) => {
                    // Skip user messages that are the initial prompt (technical prompts sent to AI)
                    if (msg.role === 'user' && (
                      msg.content.includes('Genera una rutina') ||
                      msg.content.includes('rutina de ejercicio semanal') ||
                      msg.content.includes('Enfoque específico:')
                    )) {
                      return null;
                    }
                    
                    return (
                      <div
                        key={idx}
                        className={`flex items-start gap-3 ${
                          msg.role === 'user' ? 'flex-row-reverse' : ''
                        }`}
                      >
                        {msg.role === 'assistant' && (
                          <div className="flex-shrink-0">
                            <div className="h-8 w-8 rounded-full bg-gradient-to-br from-primary-500 to-primary-600 flex items-center justify-center">
                              <Dumbbell className="h-4 w-4 text-white" />
                            </div>
                          </div>
                        )}
                        <div
                          className={`max-w-[80%] rounded-lg px-4 py-3 text-sm ${
                            msg.role === 'user'
                              ? 'bg-primary-600 text-white shadow-md'
                              : 'bg-white text-gray-900 border border-gray-200 shadow-sm'
                          }`}
                        >
                          <div className="leading-relaxed">
                            {msg.role === 'user' ? (
                              <p className="text-white">{msg.content}</p>
                            ) : (
                              renderMessageContent(msg.content)
                            )}
                          </div>
                        </div>
                        {msg.role === 'user' && (
                          <div className="flex-shrink-0">
                            <div className="h-8 w-8 rounded-full bg-gray-300 flex items-center justify-center">
                              <User className="h-4 w-4 text-gray-600" />
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                  {workoutLoading && (
                    <div className="flex items-start gap-3">
                      <div className="flex-shrink-0">
                        <div className="h-8 w-8 rounded-full bg-gradient-to-br from-primary-500 to-primary-600 flex items-center justify-center">
                          <Dumbbell className="h-4 w-4 text-white animate-pulse" />
                        </div>
                      </div>
                      <div className="bg-white border border-gray-200 rounded-lg px-3 py-2">
                        <div className="flex space-x-1">
                          <div className="w-2 h-2 bg-primary-500 rounded-full animate-bounce"></div>
                          <div className="w-2 h-2 bg-primary-500 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                          <div className="w-2 h-2 bg-primary-500 rounded-full animate-bounce" style={{ animationDelay: '0.4s' }}></div>
                        </div>
                      </div>
                    </div>
                  )}
                  <div ref={messagesEndRef} />
                </>
              )}
            </div>

            {/* Action Buttons and Input */}
            <div className="border-t border-gray-200 bg-white p-4 space-y-3">
              {workoutMessages.length > 0 && (
                <div className="flex gap-2">
                  <button
                    onClick={handleDownloadWorkoutPDF}
                    className="flex-1 btn btn-secondary text-sm py-2 flex items-center justify-center gap-2"
                  >
                    <Download className="h-4 w-4" />
                    Descargar PDF
                  </button>
                  <button
                    onClick={() => {
                      setWorkoutMessages([]);
                      setWorkoutInput('');
                    }}
                    className="btn btn-secondary text-sm py-2 px-4"
                  >
                    Nueva Rutina
                  </button>
                </div>
              )}

              {/* Chat Input for Modifications */}
              {workoutMessages.length > 0 && (
                <div className="space-y-2">
                  {/* PDF Preview */}
                  {workoutPdfPreview && (
                    <div className="flex items-center justify-between bg-gray-50 p-2 rounded-lg border border-gray-200">
                      <div className="flex items-center space-x-2">
                        <FileText className="h-5 w-5 text-red-600" />
                        <span className="text-sm text-gray-700 truncate">{workoutPdfPreview}</span>
                      </div>
                      <button
                        onClick={removeWorkoutPdf}
                        className="text-red-600 hover:text-red-800"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  )}
                  <div className="flex space-x-2">
                    <label className="cursor-pointer flex items-center justify-center px-3 py-2 border-2 border-gray-300 rounded-lg hover:border-primary-500 hover:bg-primary-50 transition-colors">
                      <FileText className="h-5 w-5 text-gray-600" />
                      <input
                        type="file"
                        accept=".pdf,application/pdf"
                        onChange={handleWorkoutPdfSelect}
                        className="hidden"
                        disabled={workoutLoading}
                      />
                    </label>
                    <input
                      key="workout-input"
                      id="workout-input"
                      name="workout-input"
                      type="text"
                      value={workoutInput}
                      onChange={(e) => {
                        e.stopPropagation();
                        setWorkoutInput(e.target.value);
                      }}
                      onKeyPress={(e) => e.key === 'Enter' && !e.shiftKey && !workoutLoading && (workoutInput.trim() || workoutPdf) && handleWorkoutChat()}
                      placeholder="Escribe para modificar la rutina o sube un PDF..."
                      className="flex-1 input text-sm py-2 border-2 focus:border-primary-500"
                      disabled={workoutLoading}
                    />
                    <button
                      onClick={handleWorkoutChat}
                      disabled={workoutLoading || (!workoutInput.trim() && !workoutPdf)}
                      className="btn btn-primary px-4 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {workoutLoading ? (
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      ) : (
                        <Send className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}


        {/* Photo Upload Modal */}
        {showPhotoUpload && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg max-w-md w-full p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold">Subir Foto de Progreso</h2>
                <button onClick={() => {
                  setShowPhotoUpload(false);
                  setPhotoFile(null);
                  setPhotoPreview(null);
                }}>
                  <X className="h-5 w-5" />
                </button>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="label">Tipo de foto</label>
                  <select
                    className="input"
                    value={selectedPhotoType}
                    onChange={(e) => setSelectedPhotoType(e.target.value as any)}
                  >
                    <option value="front">Frontal</option>
                    <option value="side">Lateral</option>
                    <option value="back">Posterior</option>
                  </select>
                </div>
                <div>
                  <label className="label">Seleccionar imagen</label>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handlePhotoSelect}
                    className="input"
                  />
                  {photoPreview && (
                    <div className="mt-4">
                      <img src={photoPreview} alt="Preview" className="w-full h-64 object-cover rounded-lg" />
                    </div>
                  )}
                </div>
                <div className="flex space-x-3">
                  <button
                    onClick={() => {
                      setShowPhotoUpload(false);
                      setPhotoFile(null);
                      setPhotoPreview(null);
                    }}
                    className="btn btn-secondary flex-1"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={handlePhotoUpload}
                    disabled={!photoFile}
                    className="btn btn-primary flex-1"
                  >
                    <Upload className="h-4 w-4 mr-2" />
                    Subir
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Toast Notification */}
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}
    </div>
  );
}
