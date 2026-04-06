import { useState } from 'react';
import { Product } from '../types';
import { 
  Search, 
  MoreVertical, 
  Edit2, 
  Trash2, 
  Plus, 
  Minus,
  AlertCircle,
  Package
} from 'lucide-react';
import { formatCurrency, formatCurrencyString, cn } from '../lib/utils';
import { doc, updateDoc, serverTimestamp, collection, addDoc } from 'firebase/firestore';
import { db, auth } from '../firebase';
import { handleFirestoreError, OperationType } from '../lib/firebase-utils';

interface ProductListProps {
  products: Product[];
  onEdit: (product: Product) => void;
}

export default function ProductList({ products, onEdit }: ProductListProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [adjustingStock, setAdjustingStock] = useState<string | null>(null);
  const [adjustAmount, setAdjustAmount] = useState(1);

  const filteredProducts = products.filter(p => 
    p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.sku.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.category?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleStockAdjustment = async (product: Product, type: 'IN' | 'OUT') => {
    if (adjustAmount <= 0) return;
    
    const newQuantity = type === 'IN' 
      ? product.stockQuantity + adjustAmount 
      : Math.max(0, product.stockQuantity - adjustAmount);

    try {
      // Update product stock
      await updateDoc(doc(db, 'products', product.id), {
        stockQuantity: newQuantity,
        updatedAt: serverTimestamp()
      });

      // Record transaction
      try {
        await addDoc(collection(db, 'transactions'), {
          companyId: product.companyId,
          productId: product.id,
          type,
          quantity: adjustAmount,
          timestamp: serverTimestamp(),
          userId: auth.currentUser?.uid,
          notes: `Ajuste manual de stock (${type === 'IN' ? 'Entrada' : 'Salida'})`
        });
      } catch (error) {
        handleFirestoreError(error, OperationType.CREATE, 'transactions');
      }

      setAdjustingStock(null);
      setAdjustAmount(1);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `products/${product.id}`);
    }
  };

  return (
    <div className="space-y-6">
      {/* Search and Filters */}
      <div className="flex gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
          <input 
            type="text" 
            placeholder="Buscar por nombre, SKU o categoría..."
            className="w-full pl-12 pr-4 py-3 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {/* Product Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <table className="w-full text-left">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200">
              <th className="px-6 py-4 text-sm font-bold text-slate-600">Producto</th>
              <th className="px-6 py-4 text-sm font-bold text-slate-600">SKU</th>
              <th className="px-6 py-4 text-sm font-bold text-slate-600">Categoría</th>
              <th className="px-6 py-4 text-sm font-bold text-slate-600">Precio (USD / VES)</th>
              <th className="px-6 py-4 text-sm font-bold text-slate-600">Stock</th>
              <th className="px-6 py-4 text-sm font-bold text-slate-600 text-right">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filteredProducts.map((product) => (
              <tr key={product.id} className="hover:bg-slate-50/50 transition-colors group">
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-slate-100 rounded-lg flex items-center justify-center overflow-hidden">
                      {product.imageUrl ? (
                        <img src={product.imageUrl} alt={product.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                      ) : (
                        <Package className="w-5 h-5 text-slate-400" />
                      )}
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-slate-900">{product.name}</p>
                      <p className="text-xs text-slate-500 line-clamp-1">{product.description || 'Sin descripción'}</p>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4 text-sm text-slate-600 font-mono">{product.sku}</td>
                <td className="px-6 py-4">
                  <span className="px-2 py-1 bg-slate-100 text-slate-600 text-xs font-medium rounded-md">
                    {product.category || 'General'}
                  </span>
                </td>
                <td className="px-6 py-4 text-sm font-semibold text-slate-900">
                  <div className="flex flex-col">
                    <span className="text-blue-600">{formatCurrency(product.price).usd}</span>
                    <span className="text-[10px] text-slate-400">{formatCurrency(product.price).ves}</span>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <div className="flex items-center gap-2">
                    <span className={cn(
                      "text-sm font-bold",
                      product.stockQuantity <= (product.minStockLevel || 5) ? "text-amber-600" : "text-slate-900"
                    )}>
                      {product.stockQuantity}
                    </span>
                    {product.stockQuantity <= (product.minStockLevel || 5) && (
                      <AlertCircle className="w-4 h-4 text-amber-500" />
                    )}
                  </div>
                </td>
                <td className="px-6 py-4 text-right">
                  <div className="flex items-center justify-end gap-2">
                    <button 
                      onClick={() => setAdjustingStock(adjustingStock === product.id ? null : product.id)}
                      className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                      title="Ajustar Stock"
                    >
                      <ArrowRightLeft className="w-5 h-5" />
                    </button>
                    <button 
                      onClick={() => onEdit(product)}
                      className="p-2 text-slate-400 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors"
                    >
                      <Edit2 className="w-5 h-5" />
                    </button>
                  </div>

                  {/* Stock Adjustment Inline */}
                  {adjustingStock === product.id && (
                    <div className="absolute right-6 mt-2 bg-white border border-slate-200 shadow-xl rounded-xl p-4 z-10 flex items-center gap-3 animate-in fade-in slide-in-from-top-2">
                      <input 
                        type="number" 
                        min="1"
                        value={adjustAmount}
                        onChange={(e) => setAdjustAmount(parseInt(e.target.value) || 0)}
                        className="w-20 px-3 py-2 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-500"
                      />
                      <div className="flex gap-2">
                        <button 
                          onClick={() => handleStockAdjustment(product, 'IN')}
                          className="bg-emerald-600 hover:bg-emerald-700 text-white p-2 rounded-lg transition-colors"
                        >
                          <Plus className="w-5 h-5" />
                        </button>
                        <button 
                          onClick={() => handleStockAdjustment(product, 'OUT')}
                          className="bg-red-600 hover:bg-red-700 text-white p-2 rounded-lg transition-colors"
                        >
                          <Minus className="w-5 h-5" />
                        </button>
                      </div>
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filteredProducts.length === 0 && (
          <div className="p-12 text-center">
            <Package className="w-12 h-12 text-slate-200 mx-auto mb-4" />
            <p className="text-slate-500">No se encontraron productos.</p>
          </div>
        )}
      </div>
    </div>
  );
}

function ArrowRightLeft({ className }: { className?: string }) {
  return (
    <svg 
      xmlns="http://www.w3.org/2000/svg" 
      width="24" 
      height="24" 
      viewBox="0 0 24 24" 
      fill="none" 
      stroke="currentColor" 
      strokeWidth="2" 
      strokeLinecap="round" 
      strokeLinejoin="round" 
      className={className}
    >
      <path d="m16 3 4 4-4 4"/><path d="M20 7H4"/><path d="m8 21-4-4 4-4"/><path d="M4 17h16"/>
    </svg>
  );
}
