import React, { useState, useEffect } from 'react';
import { 
  onAuthStateChanged, 
  signInWithPopup, 
  GoogleAuthProvider, 
  signOut,
  User as FirebaseUser
} from 'firebase/auth';
import { 
  doc, 
  getDoc, 
  setDoc, 
  updateDoc,
  serverTimestamp,
  onSnapshot,
  collection,
  query,
  where,
  orderBy,
  limit,
  getDocFromServer
} from 'firebase/firestore';
import { auth, db } from './firebase';
import { User, Product, Transaction, Company } from './types';
import { 
  LayoutDashboard, 
  Package, 
  History, 
  Plus, 
  LogOut, 
  Search,
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  ArrowRightLeft,
  Loader2,
  User as UserIcon,
  Building2,
  Users
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn, formatCurrency } from './lib/utils';

// Components
import Dashboard from './components/Dashboard';
import ProductList from './components/ProductList';
import TransactionHistory from './components/TransactionHistory';
import ProductForm from './components/ProductForm';

import { handleFirestoreError, OperationType } from './lib/firebase-utils';

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'products' | 'history'>('dashboard');
  const [isAddingProduct, setIsAddingProduct] = useState(false);
  const [products, setProducts] = useState<Product[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [companyNameInput, setCompanyNameInput] = useState('');
  const [isSettingUpCompany, setIsSettingUpCompany] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [showChangeCompanyConfirm, setShowChangeCompanyConfirm] = useState(false);
  const [existingCompanies, setExistingCompanies] = useState<Company[]>([]);
  const [onlineUsersCount, setOnlineUsersCount] = useState(0);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        const userRef = doc(db, 'users', firebaseUser.uid);
        try {
          const userSnap = await getDoc(userRef);

          if (!userSnap.exists()) {
            const newUser: Partial<User> = {
              name: firebaseUser.displayName || 'Usuario',
              email: firebaseUser.email || '',
              role: 'admin', // First user is admin
              createdAt: serverTimestamp() as any
            };
            await setDoc(userRef, newUser);
            setUser({ id: firebaseUser.uid, ...newUser } as User);
          } else {
            setUser({ id: firebaseUser.uid, ...userSnap.data() } as User);
          }
        } catch (error) {
          handleFirestoreError(error, OperationType.GET, `users/${firebaseUser.uid}`);
        }
      } else {
        setUser(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!user || user.companyId) return;

    const companiesQuery = query(collection(db, 'companies'), orderBy('name', 'asc'));
    const unsubscribe = onSnapshot(companiesQuery, (snapshot) => {
      const companiesData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Company));
      setExistingCompanies(companiesData);
    });

    return () => unsubscribe();
  }, [user]);

  useEffect(() => {
    if (!user || !user.companyId) return;

    const onlineUsersQuery = query(
      collection(db, 'users'),
      where('companyId', '==', user.companyId),
      where('isOnline', '==', true)
    );

    const unsubscribe = onSnapshot(onlineUsersQuery, (snapshot) => {
      setOnlineUsersCount(snapshot.size);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'users');
    });

    // Update online status
    const userRef = doc(db, 'users', user.id);
    updateDoc(userRef, {
      isOnline: true,
      lastSeen: serverTimestamp()
    }).catch(err => handleFirestoreError(err, OperationType.UPDATE, `users/${user.id}`));

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        updateDoc(userRef, { isOnline: false });
      } else {
        updateDoc(userRef, { isOnline: true, lastSeen: serverTimestamp() });
      }
    };

    window.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('beforeunload', () => updateDoc(userRef, { isOnline: false }));

    return () => {
      unsubscribe();
      updateDoc(userRef, { isOnline: false });
      window.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [user?.id, user?.companyId]);

  useEffect(() => {
    if (!user || !user.companyId) {
      setProducts([]);
      setTransactions([]);
      return;
    }

    const productsQuery = query(
      collection(db, 'products'), 
      where('companyId', '==', user.companyId),
      orderBy('updatedAt', 'desc')
    );
    const unsubscribeProducts = onSnapshot(productsQuery, (snapshot) => {
      const productsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Product));
      setProducts(productsData);
    }, (error) => {
      if (error.message.includes('index')) {
        const fallbackQuery = query(collection(db, 'products'), where('companyId', '==', user.companyId));
        onSnapshot(fallbackQuery, (snapshot) => {
          const productsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Product));
          setProducts(productsData.sort((a, b) => b.updatedAt.toMillis() - a.updatedAt.toMillis()));
        }, (err) => handleFirestoreError(err, OperationType.LIST, 'products'));
      } else {
        handleFirestoreError(error, OperationType.LIST, 'products');
      }
    });

    const transactionsQuery = query(
      collection(db, 'transactions'), 
      where('companyId', '==', user.companyId),
      orderBy('timestamp', 'desc'), 
      limit(50)
    );
    const unsubscribeTransactions = onSnapshot(transactionsQuery, (snapshot) => {
      const transactionsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Transaction));
      setTransactions(transactionsData);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'transactions');
    });

    return () => {
      unsubscribeProducts();
      unsubscribeTransactions();
    };
  }, [user]);

  const handleLogin = async () => {
    const provider = new GoogleAuthProvider();
    try {
      await signInWithPopup(auth, provider);
    } catch (error) {
      console.error('Login error:', error);
    }
  };

  const handleLogout = () => signOut(auth);

  const handleChangeCompany = async () => {
    if (!user) return;
    
    try {
      const userRef = doc(db, 'users', user.id);
      await updateDoc(userRef, {
        companyId: null,
        companyName: null,
        isOnline: false
      });
      setUser({ ...user, companyId: undefined, companyName: undefined });
      setShowChangeCompanyConfirm(false);
      setCompanyNameInput(''); // Clear input for new setup
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `users/${user.id}`);
    }
  };

  const handleSetupCompany = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !companyNameInput.trim()) return;

    setIsSettingUpCompany(true);
    try {
      const companyId = Math.random().toString(36).substring(2, 15);
      
      // Create company document
      await setDoc(doc(db, 'companies', companyId), {
        name: companyNameInput.trim(),
        createdAt: serverTimestamp()
      });

      const userRef = doc(db, 'users', user.id);
      await updateDoc(userRef, {
        companyId,
        companyName: companyNameInput.trim()
      });
      setUser({ ...user, companyId, companyName: companyNameInput.trim() });
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'companies/users');
    } finally {
      setIsSettingUpCompany(false);
    }
  };

  const handleJoinCompany = async (company: Company) => {
    if (!user) return;
    setIsSettingUpCompany(true);
    try {
      const userRef = doc(db, 'users', user.id);
      await updateDoc(userRef, {
        companyId: company.id,
        companyName: company.name
      });
      setUser({ ...user, companyId: company.id, companyName: company.name });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `users/${user.id}`);
    } finally {
      setIsSettingUpCompany(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <Loader2 className="w-10 h-10 text-blue-600 animate-spin" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 text-center"
        >
          <div className="w-16 h-16 bg-blue-100 rounded-2xl flex items-center justify-center mx-auto mb-6">
            <Package className="w-8 h-8 text-blue-600" />
          </div>
          <h1 className="text-3xl font-bold text-slate-900 mb-2 text-center">STOCKCONTROL 1.0</h1>
          <p className="text-slate-400 text-xs font-bold mb-8 text-center">BY TIAMOO28</p>
          <button
            onClick={handleLogin}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-6 rounded-xl transition-all flex items-center justify-center gap-3 shadow-lg shadow-blue-200"
          >
            <img src="https://www.google.com/favicon.ico" className="w-5 h-5" alt="Google" referrerPolicy="no-referrer" />
            Iniciar sesión con Google
          </button>
        </motion.div>
      </div>
    );
  }

  if (!user.companyId) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8"
        >
          <div className="w-16 h-16 bg-blue-100 rounded-2xl flex items-center justify-center mx-auto mb-6">
            <Building2 className="w-8 h-8 text-blue-600" />
          </div>
          <h2 className="text-2xl font-bold text-slate-900 text-center mb-2">Configura tu Empresa</h2>
          <p className="text-slate-500 text-center mb-8">Selecciona una empresa existente o crea una nueva para empezar.</p>
          
          {existingCompanies.length > 0 && (
            <div className="mb-8">
              <label className="text-sm font-bold text-slate-700 block mb-3">Empresas Existentes</label>
              <div className="space-y-2 max-h-48 overflow-y-auto pr-2 custom-scrollbar">
                {existingCompanies.map((company) => (
                  <button
                    key={company.id}
                    onClick={() => handleJoinCompany(company)}
                    disabled={isSettingUpCompany}
                    className="w-full flex items-center justify-between p-3 bg-slate-50 hover:bg-blue-50 border border-slate-200 hover:border-blue-200 rounded-xl transition-all group"
                  >
                    <span className="text-sm font-semibold text-slate-700 group-hover:text-blue-700">{company.name}</span>
                    <ArrowRightLeft className="w-4 h-4 text-slate-300 group-hover:text-blue-400" />
                  </button>
                ))}
              </div>
              <div className="relative my-6">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-slate-100"></div>
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-white px-2 text-slate-400 font-bold">O crea una nueva</span>
                </div>
              </div>
            </div>
          )}

          <form onSubmit={handleSetupCompany} className="space-y-4">
            <div>
              <label className="text-sm font-bold text-slate-700 block mb-1.5">Nombre de la Nueva Empresa</label>
              <input 
                type="text" 
                required
                value={companyNameInput}
                onChange={(e) => setCompanyNameInput(e.target.value)}
                placeholder="Ej: Mi Negocio S.A."
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 transition-all"
              />
            </div>
            <button
              type="submit"
              disabled={isSettingUpCompany || !companyNameInput.trim()}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-6 rounded-xl transition-all flex items-center justify-center gap-2 shadow-lg shadow-blue-200 disabled:opacity-50"
            >
              {isSettingUpCompany ? <Loader2 className="w-5 h-5 animate-spin" /> : <Plus className="w-5 h-5" />}
              Crear Nueva Empresa
            </button>
          </form>
          
          <button 
            onClick={handleLogout}
            className="w-full mt-6 text-slate-400 hover:text-slate-600 text-sm font-medium transition-colors"
          >
            Cerrar Sesión
          </button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex">
      {/* Sidebar */}
      <aside className={cn(
        "bg-white border-r border-slate-200 flex flex-col fixed h-full transition-all duration-300 z-40",
        isSidebarCollapsed ? "w-20" : "w-64"
      )}>
        <div className={cn("p-6 flex items-center transition-all", isSidebarCollapsed ? "justify-center" : "gap-3")}>
          <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center shrink-0">
            <Package className="w-6 h-6 text-white" />
          </div>
          {!isSidebarCollapsed && (
            <div className="flex flex-col overflow-hidden animate-in fade-in slide-in-from-left-2">
              <span className="text-xl font-bold text-slate-900 leading-none">STOCKCONTROL</span>
              <span className="text-[10px] font-black text-blue-600 tracking-tighter">1.0 BY TIAMOO28</span>
            </div>
          )}
        </div>

        <div className="px-4 mb-4">
          <button 
            onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
            className="w-full flex items-center justify-center p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all"
            title={isSidebarCollapsed ? "Expandir" : "Contraer"}
          >
            {isSidebarCollapsed ? <ArrowRightLeft className="w-5 h-5" /> : <ArrowRightLeft className="w-5 h-5 rotate-180" />}
          </button>
        </div>

        {!isSidebarCollapsed && (
          <div className="px-6 mb-4 animate-in fade-in slide-in-from-left-2 group relative">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Empresa</p>
            <div className="flex items-center justify-between">
              <p className="text-sm font-bold text-blue-600 truncate">{user.companyName}</p>
              <button 
                onClick={() => setShowChangeCompanyConfirm(true)}
                className="opacity-0 group-hover:opacity-100 p-1 text-slate-400 hover:text-blue-600 transition-all"
                title="Cambiar Empresa"
              >
                <ArrowRightLeft className="w-3 h-3" />
              </button>
            </div>
          </div>
        )}

        <nav className="flex-1 px-4 space-y-2">
          <NavItem 
            icon={<LayoutDashboard />} 
            label={isSidebarCollapsed ? "" : "Dashboard"} 
            active={activeTab === 'dashboard'} 
            onClick={() => setActiveTab('dashboard')} 
            collapsed={isSidebarCollapsed}
          />
          <NavItem 
            icon={<Package />} 
            label={isSidebarCollapsed ? "" : "Productos"} 
            active={activeTab === 'products'} 
            onClick={() => setActiveTab('products')} 
            collapsed={isSidebarCollapsed}
          />
          <NavItem 
            icon={<History />} 
            label={isSidebarCollapsed ? "" : "Historial"} 
            active={activeTab === 'history'} 
            onClick={() => setActiveTab('history')} 
            collapsed={isSidebarCollapsed}
          />
        </nav>

        <div className="p-4 border-t border-slate-100">
          <div className={cn(
            "flex items-center p-3 bg-slate-50 rounded-xl mb-4 transition-all",
            isSidebarCollapsed ? "justify-center" : "gap-3"
          )}>
            <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center shrink-0">
              <UserIcon className="w-5 h-5 text-blue-600" />
            </div>
            {!isSidebarCollapsed && (
              <div className="flex-1 min-w-0 animate-in fade-in slide-in-from-left-2">
                <p className="text-sm font-semibold text-slate-900 truncate">{user.name}</p>
                <p className="text-xs text-slate-500 capitalize">{user.role}</p>
              </div>
            )}
          </div>
          <button 
            onClick={() => setShowChangeCompanyConfirm(true)}
            className={cn(
              "w-full flex items-center text-slate-600 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-colors mb-2",
              isSidebarCollapsed ? "justify-center p-3" : "gap-3 p-3"
            )}
            title="Cambiar Empresa"
          >
            <ArrowRightLeft className="w-5 h-5" />
            {!isSidebarCollapsed && <span className="font-medium animate-in fade-in text-sm">Cambiar Empresa</span>}
          </button>
          <button 
            onClick={handleLogout}
            className={cn(
              "w-full flex items-center text-slate-600 hover:text-red-600 hover:bg-red-50 rounded-xl transition-colors",
              isSidebarCollapsed ? "justify-center p-3" : "gap-3 p-3"
            )}
            title="Cerrar Sesión"
          >
            <LogOut className="w-5 h-5" />
            {!isSidebarCollapsed && <span className="font-medium animate-in fade-in text-sm">Cerrar Sesión</span>}
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className={cn(
        "flex-1 p-8 transition-all duration-300",
        isSidebarCollapsed ? "ml-20" : "ml-64"
      )}>
        <header className="flex justify-between items-center mb-8">
          <div>
            <h2 className="text-2xl font-bold text-slate-900">
              {activeTab === 'dashboard' && 'Panel de Control'}
              {activeTab === 'products' && 'Gestión de Productos'}
              {activeTab === 'history' && 'Historial de Movimientos'}
            </h2>
            <p className="text-slate-500">
              {activeTab === 'dashboard' && 'Resumen general de tu inventario.'}
              {activeTab === 'products' && 'Añade, edita y controla tus existencias.'}
              {activeTab === 'history' && 'Registro detallado de entradas y salidas.'}
            </p>
          </div>

          {activeTab === 'products' && (
            <button 
              onClick={() => setIsAddingProduct(true)}
              className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded-xl flex items-center gap-2 transition-all shadow-lg shadow-blue-100"
            >
              <Plus className="w-5 h-5" />
              Nuevo Producto
            </button>
          )}
        </header>

        <AnimatePresence mode="wait">
          {activeTab === 'dashboard' && (
            <motion.div key="dashboard" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
              <Dashboard products={products} transactions={transactions} />
            </motion.div>
          )}
          {activeTab === 'products' && (
            <motion.div key="products" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
              <ProductList products={products} onEdit={(p) => console.log('Edit', p)} />
            </motion.div>
          )}
          {activeTab === 'history' && (
            <motion.div key="history" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
              <TransactionHistory transactions={transactions} products={products} />
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Modals */}
      <AnimatePresence>
        {isAddingProduct && (
          <ProductForm 
            onClose={() => setIsAddingProduct(false)} 
            user={user}
          />
        )}
        {showChangeCompanyConfirm && (
          <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-2xl shadow-2xl max-w-sm w-full p-6"
            >
              <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center mb-4">
                <ArrowRightLeft className="w-6 h-6 text-blue-600" />
              </div>
              <h3 className="text-lg font-bold text-slate-900 mb-2">¿Cambiar de Empresa?</h3>
              <p className="text-slate-500 text-sm mb-6">
                Esta acción te permitirá configurar una nueva empresa. Los datos de la empresa actual no se borrarán, pero dejarás de estar vinculado a ella.
              </p>
              <div className="flex gap-3">
                <button 
                  onClick={() => setShowChangeCompanyConfirm(false)}
                  className="flex-1 px-4 py-2 text-slate-600 font-semibold hover:bg-slate-100 rounded-xl transition-colors"
                >
                  Cancelar
                </button>
                <button 
                  onClick={handleChangeCompany}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white font-semibold hover:bg-blue-700 rounded-xl transition-colors shadow-lg shadow-blue-100"
                >
                  Confirmar
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Online Users Badge */}
      {user && user.companyId && (
        <div className="fixed bottom-6 right-6 z-50">
          <motion.div 
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white border border-slate-200 shadow-xl rounded-full px-4 py-2 flex items-center gap-2"
          >
            <div className="relative">
              <Users className="w-4 h-4 text-slate-500" />
              <span className="absolute -top-1 -right-1 w-2 h-2 bg-green-500 rounded-full border border-white animate-pulse"></span>
            </div>
            <span className="text-xs font-bold text-slate-700">
              {onlineUsersCount} {onlineUsersCount === 1 ? 'usuario online' : 'usuarios online'}
            </span>
          </motion.div>
        </div>
      )}
    </div>
  );
}

function NavItem({ icon, label, active, onClick, collapsed }: { icon: React.ReactNode, label: string, active: boolean, onClick: () => void, collapsed?: boolean }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "w-full flex items-center rounded-xl transition-all font-medium",
        collapsed ? "justify-center p-3" : "gap-3 px-4 py-3",
        active 
          ? "bg-blue-50 text-blue-600 shadow-sm" 
          : "text-slate-500 hover:bg-slate-50 hover:text-slate-900"
      )}
      title={collapsed ? label : ""}
    >
      {active ? (
        <span className="text-blue-600 shrink-0">{icon}</span>
      ) : (
        <span className="text-slate-400 shrink-0">{icon}</span>
      )}
      {!collapsed && <span className="truncate animate-in fade-in">{label}</span>}
    </button>
  );
}
