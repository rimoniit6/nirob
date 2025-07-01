
export type Product = {
  id: string;
  name: string;
  category: string;
  measurement: string;
  stock: number | null; // null for services
  price: number;
};

export type Customer = {
  id: string;
  name: string;
  phone: string;
  address: string;
  lastPurchase: string;
  dueAmount: number;
  dueSince: string;
};

export type SaleProduct = {
    productId: string;
    quantity: number;
    price: number;
}

export type Sale = {
  id: string;
  customerId: string;
  date: string;
  products: SaleProduct[];
  amount: number;
  paidAmount: number;
  status: "Paid" | "Due";
};

export type Purchase = {
  id: string;
  type: 'Inventory' | 'Utility';
  supplier: string; // Payee for Utility
  description: string; // Product name for Inventory, description for Utility
  productId?: string;
  quantity?: number;
  measurement?: string;
  date: string;
  amount: number;
  paidAmount: number;
  status: "Paid" | "Due";
};

export type Payment = {
  id: string;
  customerId: string;
  date: string;
  amount: number;
  method: string;
};

export type ShopInfo = {
  name: string;
  address: string;
  contact: string;
  logo: string | null;
};

export type User = {
  id: string;
  email: string;
  password: string;
};

export const initialInventory: Product[] = [];

export const initialCustomers: Customer[] = [];

export const initialSales: Sale[] = [];

export const initialPurchases: Purchase[] = [];

export const initialPayments: Payment[] = [];

export const initialUsers: User[] = [
  { id: 'user-1', email: 'owner@nirobmill.com', password: 'password' },
];

export const initialShopInfo: ShopInfo = {
  name: 'Nirob Mill & Workshop',
  address: '123 Commerce St, Dhaka',
  contact: 'shop@nirobmill.com',
  logo: null,
};
