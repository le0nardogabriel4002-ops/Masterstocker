import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { X, Loader2, Package, Tag, DollarSign, Layers, Plus } from 'lucide-react';
import { motion } from 'motion/react';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';
import { User } from '../types';
import { handleFirestoreError, OperationType } from '../lib/firebase-utils';

const productSchema = z.object({
  name: z.string().min(2, 'El nombre es muy corto'),
  sku: z.string().min(3, 'SKU inválido'),
  category: z.string().optional(),
  price: z.number().min(0, 'El precio no puede ser negativo'),
  stockQuantity: z.number().min(0, 'El stock no puede ser negativo'),
  minStockLevel: z.number().min(0).optional(),
  description: z.string().optional(),
  imageUrl: z.string().url('URL inválida').optional().or(z.literal('')),
});

type ProductFormValues = z.infer<typeof productSchema>;

interface ProductFormProps {
  onClose: () => void;
  user: User;
}

export default function ProductForm({ onClose, user }: ProductFormProps) {
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<ProductFormValues>({
    resolver: zodResolver(productSchema),
    defaultValues: {
      price: 0,
      stockQuantity: 0,
      minStockLevel: 5,
    }
  });

  const onSubmit = async (data: ProductFormValues) => {
    if (!user.companyId) return;
    
    try {
      const productData = {
        ...data,
        companyId: user.companyId,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        createdBy: user.id
      };
      
      const docRef = await addDoc(collection(db, 'products'), productData);

      // Initial transaction
      if (data.stockQuantity > 0) {
        try {
          await addDoc(collection(db, 'transactions'), {
            companyId: user.companyId,
            productId: docRef.id,
            type: 'IN',
            quantity: data.stockQuantity,
            timestamp: serverTimestamp(),
            userId: user.id,
            notes: 'Stock inicial al crear producto'
          });
        } catch (error) {
          handleFirestoreError(error, OperationType.CREATE, 'transactions');
        }
      }

      onClose();
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'products');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
      />
      
      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="relative w-full max-w-2xl bg-white rounded-3xl shadow-2xl overflow-hidden"
      >
        <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center">
              <Plus className="w-6 h-6 text-white" />
            </div>
            <h3 className="text-xl font-bold text-slate-900">Nuevo Producto</h3>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-200 rounded-full transition-colors">
            <X className="w-6 h-6 text-slate-500" />
          </button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="p-8 space-y-6 max-h-[80vh] overflow-y-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Basic Info */}
            <div className="space-y-4">
              <FormField label="Nombre del Producto" icon={<Package />} error={errors.name?.message}>
                <input {...register('name')} placeholder="Ej: Laptop Pro 16" className="form-input" />
              </FormField>

              <FormField label="SKU / Código" icon={<Tag />} error={errors.sku?.message}>
                <input {...register('sku')} placeholder="Ej: LP-16-001" className="form-input" />
              </FormField>

              <FormField label="Categoría" icon={<Layers />} error={errors.category?.message}>
                <input {...register('category')} placeholder="Ej: Electrónica" className="form-input" />
              </FormField>
            </div>

            {/* Inventory Info */}
            <div className="space-y-4">
              <FormField label="Precio Unitario" icon={<DollarSign />} error={errors.price?.message}>
                <input 
                  type="number" 
                  step="0.01" 
                  {...register('price', { valueAsNumber: true })} 
                  className="form-input" 
                />
              </FormField>

              <div className="grid grid-cols-2 gap-4">
                <FormField label="Stock Inicial" error={errors.stockQuantity?.message}>
                  <input 
                    type="number" 
                    {...register('stockQuantity', { valueAsNumber: true })} 
                    className="form-input" 
                  />
                </FormField>
                <FormField label="Mínimo Alerta" error={errors.minStockLevel?.message}>
                  <input 
                    type="number" 
                    {...register('minStockLevel', { valueAsNumber: true })} 
                    className="form-input" 
                  />
                </FormField>
              </div>

              <FormField label="URL Imagen (Opcional)" error={errors.imageUrl?.message}>
                <input {...register('imageUrl')} placeholder="https://..." className="form-input" />
              </FormField>
            </div>
          </div>

          <FormField label="Descripción" error={errors.description?.message}>
            <textarea 
              {...register('description')} 
              rows={3} 
              placeholder="Detalles del producto..."
              className="form-input resize-none"
            />
          </FormField>

          <div className="pt-4 flex gap-4">
            <button 
              type="button" 
              onClick={onClose}
              className="flex-1 py-3 px-6 border border-slate-200 text-slate-600 font-semibold rounded-xl hover:bg-slate-50 transition-colors"
            >
              Cancelar
            </button>
            <button 
              type="submit" 
              disabled={isSubmitting}
              className="flex-[2] py-3 px-6 bg-blue-600 text-white font-semibold rounded-xl hover:bg-blue-700 transition-all shadow-lg shadow-blue-200 disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : <Plus className="w-5 h-5" />}
              Crear Producto
            </button>
          </div>
        </form>
      </motion.div>

      <style>{`
        .form-input {
          width: 100%;
          padding: 0.75rem 1rem;
          background-color: #f8fafc;
          border: 1px solid #e2e8f0;
          border-radius: 0.75rem;
          outline: none;
          transition: all 0.2s;
        }
        .form-input:focus {
          background-color: white;
          border-color: #2563eb;
          box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.1);
        }
      `}</style>
    </div>
  );
}

function FormField({ label, icon, children, error }: { label: string, icon?: React.ReactNode, children: React.ReactNode, error?: string }) {
  return (
    <div className="space-y-1.5">
      <label className="text-sm font-bold text-slate-700 flex items-center gap-2">
        {icon && <span className="text-slate-400">{icon}</span>}
        {label}
      </label>
      {children}
      {error && <p className="text-xs text-red-500 font-medium">{error}</p>}
    </div>
  );
}
