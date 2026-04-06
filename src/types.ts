import { Timestamp } from 'firebase/firestore';

export type UserRole = 'admin' | 'staff';

export interface Company {
  id: string;
  name: string;
  createdAt: any;
}

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  companyId?: string;
  companyName?: string;
  isOnline?: boolean;
  lastSeen?: Timestamp;
  createdAt: Timestamp;
}

export interface Product {
  id: string;
  companyId: string;
  name: string;
  sku: string;
  category?: string;
  price: number;
  stockQuantity: number;
  minStockLevel?: number;
  description?: string;
  imageUrl?: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface Transaction {
  id: string;
  companyId: string;
  productId: string;
  productName?: string; // Denormalized for display
  type: 'IN' | 'OUT';
  quantity: number;
  timestamp: Timestamp;
  userId: string;
  userName?: string; // Denormalized for display
  notes?: string;
}
