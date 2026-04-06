import React from 'react';
import { Product, Transaction } from '../types';
import { 
  TrendingUp, 
  TrendingDown, 
  AlertTriangle, 
  Package,
  ArrowUpRight,
  ArrowDownRight
} from 'lucide-react';
import { formatCurrency, formatCurrencyString, cn } from '../lib/utils';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  Cell
} from 'recharts';

interface DashboardProps {
  products: Product[];
  transactions: Transaction[];
}

export default function Dashboard({ products, transactions }: DashboardProps) {
  const totalProducts = products.length;
  const totalStock = products.reduce((acc, p) => acc + p.stockQuantity, 0);
  const totalValue = products.reduce((acc, p) => acc + (p.stockQuantity * p.price), 0);
  const lowStockItems = products.filter(p => p.stockQuantity <= (p.minStockLevel || 5));

  // Prepare data for chart (top 5 products by stock)
  const chartData = [...products]
    .sort((a, b) => b.stockQuantity - a.stockQuantity)
    .slice(0, 5)
    .map(p => ({
      name: p.name,
      stock: p.stockQuantity
    }));

  return (
    <div className="space-y-8">
      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard 
          title="Total Productos" 
          value={totalProducts.toString()} 
          icon={<Package className="text-blue-600" />}
          color="bg-blue-50"
        />
        <StatCard 
          title="Stock Total" 
          value={totalStock.toLocaleString()} 
          icon={<TrendingUp className="text-emerald-600" />}
          color="bg-emerald-50"
        />
        <StatCard 
          title="Valor Inventario" 
          value={formatCurrencyString(totalValue)} 
          icon={<TrendingUp className="text-violet-600" />}
          color="bg-violet-50"
        />
        <StatCard 
          title="Stock Bajo" 
          value={lowStockItems.length.toString()} 
          icon={<AlertTriangle className="text-amber-600" />}
          color="bg-amber-50"
          alert={lowStockItems.length > 0}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Chart Section */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <h3 className="text-lg font-bold text-slate-900 mb-6">Top 5 Stock</h3>
          <div className="h-80 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} />
                <Tooltip 
                  cursor={{ fill: '#f8fafc' }}
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                />
                <Bar dataKey="stock" radius={[4, 4, 0, 0]}>
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={index === 0 ? '#2563eb' : '#94a3b8'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Recent Transactions */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <h3 className="text-lg font-bold text-slate-900 mb-6">Movimientos Recientes</h3>
          <div className="space-y-4">
            {transactions.slice(0, 6).map((tx) => {
              const product = products.find(p => p.id === tx.productId);
              return (
                <div key={tx.id} className="flex items-center justify-between p-3 hover:bg-slate-50 rounded-xl transition-colors">
                  <div className="flex items-center gap-3">
                    <div className={cn(
                      "w-10 h-10 rounded-lg flex items-center justify-center",
                      tx.type === 'IN' ? "bg-emerald-100 text-emerald-600" : "bg-red-100 text-red-600"
                    )}>
                      {tx.type === 'IN' ? <ArrowUpRight className="w-5 h-5" /> : <ArrowDownRight className="w-5 h-5" />}
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-slate-900">{product?.name || 'Producto'}</p>
                      <p className="text-xs text-slate-500">{new Date(tx.timestamp.toDate()).toLocaleString()}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className={cn(
                      "text-sm font-bold",
                      tx.type === 'IN' ? "text-emerald-600" : "text-red-600"
                    )}>
                      {tx.type === 'IN' ? '+' : '-'}{tx.quantity}
                    </p>
                    <p className="text-xs text-slate-400">unidades</p>
                  </div>
                </div>
              );
            })}
            {transactions.length === 0 && (
              <p className="text-center text-slate-400 py-8">No hay movimientos registrados.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({ title, value, icon, color, alert }: { title: string, value: string, icon: React.ReactNode, color: string, alert?: boolean }) {
  return (
    <div className={cn(
      "p-6 rounded-2xl border border-slate-200 shadow-sm transition-all",
      alert && "border-amber-200 bg-amber-50/30"
    )}>
      <div className="flex justify-between items-start mb-4">
        <div className={cn("w-12 h-12 rounded-xl flex items-center justify-center", color)}>
          {icon}
        </div>
      </div>
      <p className="text-slate-500 text-sm font-medium">{title}</p>
      <h4 className="text-2xl font-bold text-slate-900 mt-1">{value}</h4>
    </div>
  );
}
