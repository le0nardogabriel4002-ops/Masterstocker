import { useState } from 'react';
import { Transaction, Product } from '../types';
import { 
  ArrowUpRight, 
  ArrowDownRight, 
  Search,
  Calendar,
  History,
  Tag
} from 'lucide-react';
import { cn } from '../lib/utils';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

interface TransactionHistoryProps {
  transactions: Transaction[];
  products: Product[];
}

export default function TransactionHistory({ transactions, products }: TransactionHistoryProps) {
  const [searchTerm, setSearchTerm] = useState('');

  const filteredTransactions = transactions.filter(tx => {
    const product = products.find(p => p.id === tx.productId);
    return (
      product?.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      tx.notes?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      tx.type.toLowerCase().includes(searchTerm.toLowerCase())
    );
  });

  return (
    <div className="space-y-6">
      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
        <input 
          type="text" 
          placeholder="Filtrar movimientos..."
          className="w-full pl-12 pr-4 py-3 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      {/* Timeline */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="divide-y divide-slate-100">
          {filteredTransactions.map((tx) => {
            const product = products.find(p => p.id === tx.productId);
            return (
              <div key={tx.id} className="p-6 hover:bg-slate-50/50 transition-colors">
                <div className="flex items-start justify-between">
                  <div className="flex gap-4">
                    <div className={cn(
                      "w-12 h-12 rounded-xl flex items-center justify-center shrink-0",
                      tx.type === 'IN' ? "bg-emerald-100 text-emerald-600" : "bg-red-100 text-red-600"
                    )}>
                      {tx.type === 'IN' ? <ArrowUpRight className="w-6 h-6" /> : <ArrowDownRight className="w-6 h-6" />}
                    </div>
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="text-lg font-bold text-slate-900">{product?.name || 'Producto Desconocido'}</h4>
                        <span className={cn(
                          "px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider",
                          tx.type === 'IN' ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700"
                        )}>
                          {tx.type === 'IN' ? 'Entrada' : 'Salida'}
                        </span>
                      </div>
                      <div className="flex flex-wrap gap-4 text-sm text-slate-500">
                        <div className="flex items-center gap-1.5">
                          <Calendar className="w-4 h-4" />
                          {format(tx.timestamp.toDate(), "d 'de' MMMM, HH:mm", { locale: es })}
                        </div>
                        <div className="flex items-center gap-1.5">
                          <Tag className="w-4 h-4" />
                          SKU: {product?.sku || 'N/A'}
                        </div>
                        {tx.notes && (
                          <div className="flex items-center gap-1.5 italic">
                            "{tx.notes}"
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className={cn(
                      "text-xl font-black",
                      tx.type === 'IN' ? "text-emerald-600" : "text-red-600"
                    )}>
                      {tx.type === 'IN' ? '+' : '-'}{tx.quantity}
                    </p>
                    <p className="text-xs text-slate-400 font-medium">unidades</p>
                  </div>
                </div>
              </div>
            );
          })}
          {filteredTransactions.length === 0 && (
            <div className="p-12 text-center">
              <History className="w-12 h-12 text-slate-200 mx-auto mb-4" />
              <p className="text-slate-500">No se encontraron movimientos.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
