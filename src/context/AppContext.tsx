
"use client"

import React, { createContext, useContext, useState, ReactNode, useEffect, useMemo, useCallback } from 'react';
import { 
    initialCustomers, 
    initialInventory, 
    initialSales, 
    initialPurchases, 
    initialPayments, 
    initialShopInfo,
    initialUsers,
    Customer, 
    Product, 
    Sale, 
    Purchase, 
    Payment, 
    ShopInfo,
    User
} from '@/lib/data';
import { useRouter } from 'next/navigation';

type SaleFormData = {
  customerId: string;
  paidAmount: number;
  products: {
    productId: string;
    quantity: number;
    price: number;
  }[];
};

type PurchaseFormData = {
  type: 'Inventory' | 'Utility';
  supplier: string; // Payee
  description?: string; // For utility
  productId?: string; // For inventory
  quantity?: number; // For inventory
  amount: number;
  paidAmount: number;
};

type CustomerFormData = {
    name: string;
    phone: string;
    address: string;
}

type ProductFormData = {
    name: string;
    category: string;
    measurement: string;
    stock: number | null;
    price: number;
}

type AppContextType = {
  customers: Customer[];
  inventory: Product[];
  sales: Sale[];
  purchases: Purchase[];
  payments: Payment[];
  shopInfo: ShopInfo;
  users: User[];
  currentUser: User | null;
  isAuthenticated: boolean;
  isLoaded: boolean;
  login: (email: string, pass: string) => boolean;
  logout: () => void;
  addSale: (saleData: SaleFormData) => void;
  updateSale: (id: string, saleData: SaleFormData) => void;
  deleteSale: (saleId: string) => void;
  addPurchase: (purchaseData: PurchaseFormData) => void;
  updatePurchase: (id: string, purchaseData: PurchaseFormData) => void;
  deletePurchase: (purchaseId: string) => void;
  addCustomer: (customerData: CustomerFormData) => void;
  updateCustomer: (id: string, customerData: CustomerFormData) => void;
  deleteCustomer: (customerId: string) => void;
  recordPayment: (customerId: string, amount: number) => void;
  addProduct: (productData: ProductFormData) => void;
  updateProduct: (id: string, productData: ProductFormData) => void;
  deleteProduct: (productId: string) => void;
  updateInventoryStock: (productId: string, newStock: number) => void;
  updateShopInfo: (info: ShopInfo) => void;
  addUser: (userData: Omit<User, 'id'>) => { success: boolean; message: string };
  updateUserPassword: (userId: string, newPassword: string) => void;
  deleteUser: (userId: string) => void;
};

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider = ({ children }: { children: ReactNode }) => {
  const [customersData, setCustomersData] = useState<Customer[]>([]);
  const [inventory, setInventory] = useState<Product[]>([]);
  const [sales, setSales] = useState<Sale[]>([]);
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [shopInfo, setShopInfo] = useState<ShopInfo>(initialShopInfo);
  const [users, setUsers] = useState<User[]>([]);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [isLoaded, setIsLoaded] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const storedCustomers = localStorage.getItem('lekhajokha_customers');
    const storedInventory = localStorage.getItem('lekhajokha_inventory');
    const storedSales = localStorage.getItem('lekhajokha_sales');
    const storedPurchases = localStorage.getItem('lekhajokha_purchases');
    const storedPayments = localStorage.getItem('lekhajokha_payments');
    const storedShopInfo = localStorage.getItem('lekhajokha_shop_info');
    const storedUsers = localStorage.getItem('lekhajokha_users');
    const storedAuthUser = localStorage.getItem('lekhajokha_current_user');

    setCustomersData(storedCustomers ? JSON.parse(storedCustomers) : initialCustomers);
    setInventory(storedInventory ? JSON.parse(storedInventory) : initialInventory);
    setSales(storedSales ? JSON.parse(storedSales) : initialSales);
    setPurchases(storedPurchases ? JSON.parse(storedPurchases) : initialPurchases);
    setPayments(storedPayments ? JSON.parse(storedPayments) : initialPayments);
    setShopInfo(storedShopInfo ? JSON.parse(storedShopInfo) : initialShopInfo);
    setUsers(storedUsers ? JSON.parse(storedUsers) : initialUsers);

    const authUser = storedAuthUser ? JSON.parse(storedAuthUser) : null;
    if (authUser) {
      setCurrentUser(authUser);
      setIsAuthenticated(true);
    }

    setIsLoaded(true);
  }, []);
  
  useEffect(() => { if(isLoaded) localStorage.setItem('lekhajokha_customers', JSON.stringify(customersData)); }, [customersData, isLoaded]);
  useEffect(() => { if(isLoaded) localStorage.setItem('lekhajokha_inventory', JSON.stringify(inventory)); }, [inventory, isLoaded]);
  useEffect(() => { if(isLoaded) localStorage.setItem('lekhajokha_sales', JSON.stringify(sales)); }, [sales, isLoaded]);
  useEffect(() => { if(isLoaded) localStorage.setItem('lekhajokha_purchases', JSON.stringify(purchases)); }, [purchases, isLoaded]);
  useEffect(() => { if(isLoaded) localStorage.setItem('lekhajokha_payments', JSON.stringify(payments)); }, [payments, isLoaded]);
  useEffect(() => { if(isLoaded) localStorage.setItem('lekhajokha_shop_info', JSON.stringify(shopInfo)); }, [shopInfo, isLoaded]);
  useEffect(() => { if(isLoaded) localStorage.setItem('lekhajokha_users', JSON.stringify(users)); }, [users, isLoaded]);
  useEffect(() => { if(isLoaded) localStorage.setItem('lekhajokha_current_user', JSON.stringify(currentUser)); }, [currentUser, isLoaded]);

  const customers = useMemo(() => {
    if (!isLoaded) return [];
    
    const customerStats = new Map<string, { due: number; lastPurchase: string; dueSince: string }>();

    customersData.forEach(c => {
        customerStats.set(c.id, { due: 0, lastPurchase: 'N/A', dueSince: 'N/A' });
    });

    sales.forEach(sale => {
        const stats = customerStats.get(sale.customerId);
        if (stats) {
            const dueForSale = sale.amount - sale.paidAmount;
            if (dueForSale > 0.001) {
                stats.due += dueForSale;
                if (stats.dueSince === 'N/A' || new Date(sale.date) < new Date(stats.dueSince)) {
                    stats.dueSince = sale.date;
                }
            }

            if (stats.lastPurchase === 'N/A' || new Date(sale.date) > new Date(stats.lastPurchase)) {
                stats.lastPurchase = sale.date;
            }
        }
    });

    return customersData.map(customer => {
        const stats = customerStats.get(customer.id);
        const dueAmount = stats?.due ?? 0;
        return {
            ...customer,
            dueAmount: dueAmount,
            lastPurchase: stats?.lastPurchase ?? 'N/A',
            dueSince: dueAmount > 0 ? (stats?.dueSince ?? 'N/A') : 'N/A',
        };
    });
  }, [sales, customersData, isLoaded]);
  
  const getLocalDateString = () => {
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const login = useCallback((email: string, pass: string) => {
    const user = users.find(u => u.email.toLowerCase() === email.toLowerCase() && u.password === pass);
    if (user) {
      setIsAuthenticated(true);
      setCurrentUser(user);
      return true;
    }
    return false;
  }, [users]);

  const logout = useCallback(() => {
    setIsAuthenticated(false);
    setCurrentUser(null);
    router.push('/login');
  }, [router]);

  const addUser = useCallback((userData: Omit<User, 'id'>) => {
    const existingUser = users.find(u => u.email.toLowerCase() === userData.email.toLowerCase());
    if (existingUser) {
        return { success: false, message: "A user with this email already exists." };
    }
    const newUser: User = {
        id: `user-${Date.now()}`,
        ...userData
    };
    setUsers(prev => [...prev, newUser]);
    return { success: true, message: "User created successfully." };
  }, [users]);

  const updateUserPassword = useCallback((userId: string, newPassword: string) => {
    setUsers(prev => prev.map(u => u.id === userId ? { ...u, password: newPassword } : u));
  }, []);

  const deleteUser = useCallback((userId: string) => {
    // Prevent deleting the last user or the currently logged-in user
    if (users.length <= 1) {
        console.error("Cannot delete the last user.");
        return;
    }
    if (currentUser?.id === userId) {
        console.error("Cannot delete the currently logged-in user.");
        return;
    }
    setUsers(prev => prev.filter(u => u.id !== userId));
  }, [users, currentUser]);


  const addSale = useCallback((saleData: SaleFormData) => {
    const totalAmount = saleData.products.reduce((sum, p) => sum + (Number(p.price) || 0) * (Number(p.quantity) || 0), 0);
    const paidAmount = Number(saleData.paidAmount) || 0;
    const status: "Paid" | "Due" = (totalAmount - paidAmount) > 0.001 ? 'Due' : 'Paid';

    const newSale: Sale = {
        id: `INV${String(Date.now()).slice(-6)}`,
        customerId: saleData.customerId,
        date: getLocalDateString(),
        products: saleData.products.map(p => ({ ...p, quantity: Number(p.quantity), price: Number(p.price) })),
        amount: totalAmount,
        paidAmount: paidAmount,
        status: status,
    };
    
    setSales(prevSales => [newSale, ...prevSales]);

    setInventory(prevInventory => {
        const quantityToDeduct = new Map<string, number>();
        newSale.products.forEach(p => {
            quantityToDeduct.set(p.productId, (quantityToDeduct.get(p.productId) || 0) + p.quantity);
        });

        return prevInventory.map(product => {
            if (quantityToDeduct.has(product.id) && product.stock !== null) {
                return {
                    ...product,
                    stock: Math.max(0, product.stock - (quantityToDeduct.get(product.id) || 0))
                };
            }
            return product;
        });
    });
  }, []);

  const updateSale = useCallback((id: string, saleData: SaleFormData) => {
    const originalSale = sales.find(s => s.id === id);
    if (!originalSale) return;

    const totalAmount = saleData.products.reduce((sum, p) => sum + (Number(p.price) || 0) * (Number(p.quantity) || 0), 0);
    const paidAmount = Number(saleData.paidAmount) || 0;
    const status: "Paid" | "Due" = (totalAmount - paidAmount) > 0.001 ? 'Due' : 'Paid';

    const updatedSale: Sale = {
        ...originalSale,
        customerId: saleData.customerId,
        products: saleData.products.map(p => ({ ...p, quantity: Number(p.quantity), price: Number(p.price) })),
        amount: totalAmount,
        paidAmount: paidAmount,
        status: status,
    };

    setInventory(prevInventory => {
        const stockChanges = new Map<string, number>();

        originalSale.products.forEach(p => {
            stockChanges.set(p.productId, (stockChanges.get(p.productId) || 0) + p.quantity);
        });

        updatedSale.products.forEach(p => {
            stockChanges.set(p.productId, (stockChanges.get(p.productId) || 0) - p.quantity);
        });

        return prevInventory.map(product => {
            if (stockChanges.has(product.id) && product.stock !== null) {
                const change = stockChanges.get(product.id) || 0;
                return {
                    ...product,
                    stock: Math.max(0, product.stock + change)
                };
            }
            return product;
        });
    });

    setSales(prevSales => prevSales.map(s => (s.id === id ? updatedSale : s)));
  }, [sales]);

  const deleteSale = useCallback((saleId: string) => {
    const saleToDelete = sales.find(s => s.id === saleId);
    if (!saleToDelete) return;

    setSales(prevSales => prevSales.filter(s => s.id !== saleId));
    
    setInventory(prevInventory => {
        const quantityToAdd = new Map<string, number>();
        saleToDelete.products.forEach(p => {
            quantityToAdd.set(p.productId, (quantityToAdd.get(p.productId) || 0) + p.quantity);
        });

        return prevInventory.map(product => {
            if (quantityToAdd.has(product.id) && product.stock !== null) {
                return {
                    ...product,
                    stock: product.stock + (quantityToAdd.get(product.id) || 0)
                };
            }
            return product;
        });
    });
  }, [sales]);
  
  const addPurchase = useCallback((purchaseData: PurchaseFormData) => {
    const status: "Paid" | "Due" = (Number(purchaseData.amount) - Number(purchaseData.paidAmount)) > 0.001 ? 'Due' : 'Paid';
    
    const newPurchase: Purchase = {
      id: `PUR${String(Date.now()).slice(-6)}`,
      date: getLocalDateString(),
      type: purchaseData.type,
      supplier: purchaseData.supplier,
      description: '', 
      amount: Number(purchaseData.amount),
      paidAmount: Number(purchaseData.paidAmount),
      status: status,
    };

    if (purchaseData.type === 'Inventory') {
        const product = inventory.find(p => p.id === purchaseData.productId!);
        newPurchase.description = product?.name || 'Unknown Product';
        newPurchase.productId = purchaseData.productId!;
        newPurchase.quantity = Number(purchaseData.quantity!);
        newPurchase.measurement = product?.measurement || '';

        setInventory(prevInventory => 
            prevInventory.map(p => {
                if (p.id === purchaseData.productId! && p.stock !== null) {
                    return {
                        ...p,
                        stock: p.stock + Number(purchaseData.quantity!)
                    };
                }
                return p;
            })
        );
    } else {
        newPurchase.description = purchaseData.description!;
    }

    setPurchases(prevPurchases => [newPurchase, ...prevPurchases].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()));
  }, [inventory]);
  
  const updatePurchase = useCallback((id: string, purchaseData: PurchaseFormData) => {
    const originalPurchase = purchases.find(p => p.id === id);
    if (!originalPurchase) return;

    const status: "Paid" | "Due" = (Number(purchaseData.amount) - Number(purchaseData.paidAmount)) > 0.001 ? 'Due' : 'Paid';
    
    const updatedPurchase: Purchase = { 
        ...originalPurchase, 
        type: purchaseData.type,
        supplier: purchaseData.supplier,
        description: '', 
        amount: Number(purchaseData.amount),
        paidAmount: Number(purchaseData.paidAmount),
        status,
    };
    
    if (purchaseData.type === 'Inventory') {
        const product = inventory.find(p => p.id === purchaseData.productId!);
        updatedPurchase.description = product?.name || 'Unknown Product';
        updatedPurchase.productId = purchaseData.productId!;
        updatedPurchase.quantity = Number(purchaseData.quantity!);
        updatedPurchase.measurement = product?.measurement || '';
    } else {
        updatedPurchase.description = purchaseData.description!;
        delete updatedPurchase.productId;
        delete updatedPurchase.quantity;
        delete updatedPurchase.measurement;
    }

    setPurchases(prevPurchases => prevPurchases.map(p => (p.id === id ? updatedPurchase : p)));

    setInventory(prevInventory => {
        const stockChanges = new Map<string, number>();

        if (originalPurchase.type === 'Inventory' && originalPurchase.productId) {
            stockChanges.set(originalPurchase.productId, -(originalPurchase.quantity || 0));
        }

        if (updatedPurchase.type === 'Inventory' && updatedPurchase.productId) {
            stockChanges.set(updatedPurchase.productId, (stockChanges.get(updatedPurchase.productId) || 0) + (updatedPurchase.quantity || 0));
        }

        if (stockChanges.size === 0) return prevInventory;

        return prevInventory.map(product => {
            if (stockChanges.has(product.id) && product.stock !== null) {
                return {
                    ...product,
                    stock: Math.max(0, product.stock + (stockChanges.get(product.id) || 0))
                };
            }
            return product;
        });
    });
  }, [purchases, inventory]);

  const deletePurchase = useCallback((purchaseId: string) => {
    const purchaseToDelete = purchases.find(p => p.id === purchaseId);
    if (!purchaseToDelete) return;

    setPurchases(prevPurchases => prevPurchases.filter(p => p.id !== purchaseId));

    if (purchaseToDelete.type === 'Inventory' && purchaseToDelete.productId) {
        setInventory(prevInventory =>
            prevInventory.map(product => {
                if (product.id === purchaseToDelete.productId && product.stock !== null) {
                    return {
                        ...product,
                        stock: Math.max(0, product.stock - (purchaseToDelete.quantity || 0))
                    };
                }
                return product;
            })
        );
    }
  }, [purchases]);

  const addCustomer = useCallback((customerData: CustomerFormData) => {
    setCustomersData(prev => {
        const newIdNumber = prev.length > 0 ? Math.max(0, ...prev.map(c => parseInt(c.id.replace('CUST', ''), 10))) + 1 : 1;
        const newCustomer: Customer = {
            id: `CUST${String(newIdNumber).padStart(3, '0')}`,
            ...customerData,
            lastPurchase: 'N/A',
            dueAmount: 0,
            dueSince: 'N/A',
        };
        return [...prev, newCustomer];
    });
  }, []);

  const updateCustomer = useCallback((id: string, customerData: CustomerFormData) => {
    setCustomersData(prev => prev.map(c => c.id === id ? { ...c, ...customerData } : c));
  }, []);

  const deleteCustomer = useCallback((customerId: string) => {
    setCustomersData(prev => prev.filter(c => c.id !== customerId));
    setSales(prev => prev.filter(s => s.customerId !== customerId));
    setPayments(prev => prev.filter(p => p.customerId !== customerId));
  }, []);

  const recordPayment = useCallback((customerId: string, amount: number) => {
    setPayments(prev => {
        const newIdNumber = prev.length > 0 ? Math.max(0, ...prev.map(p => parseInt(p.id.replace('PAY', ''), 10))) + 1 : 1;
        const newPayment: Payment = {
            id: `PAY${String(newIdNumber).padStart(3, '0')}`,
            customerId,
            amount,
            date: getLocalDateString(),
            method: 'Cash',
        };
        return [...prev, newPayment];
    });

    setSales(currentSales => {
        let paymentRemaining = amount;
        const updatedSales = JSON.parse(JSON.stringify(currentSales));
        const dueSalesForCustomer = updatedSales
            .filter((s: Sale) => s.customerId === customerId && s.status === 'Due')
            .sort((a: Sale, b: Sale) => new Date(a.date).getTime() - new Date(b.date).getTime());
        
        for (const sale of dueSalesForCustomer) {
            if (paymentRemaining <= 0.001) break;
            
            const dueOnSale = sale.amount - sale.paidAmount;
            const paymentForThisSale = Math.min(paymentRemaining, dueOnSale);
            
            sale.paidAmount += paymentForThisSale;
            if ((sale.amount - sale.paidAmount) < 0.001) {
                sale.status = 'Paid';
            }
            
            paymentRemaining -= paymentForThisSale;
        }
        return updatedSales;
    });
  }, []);

  const addProduct = useCallback((productData: ProductFormData) => {
    setInventory(prev => {
      const newIdNumber = prev.length > 0 ? Math.max(0, ...prev.map(p => parseInt(p.id.replace('PROD', ''), 10))) + 1 : 1;
      const newProduct: Product = {
          id: `PROD${String(newIdNumber).padStart(3, '0')}`,
          ...productData
      };
      return [newProduct, ...prev];
    });
  }, []);

  const updateProduct = useCallback((id: string, productData: ProductFormData) => {
    setInventory(prev => prev.map(p => p.id === id ? { ...p, ...productData } : p));
  }, []);

  const deleteProduct = useCallback((productId: string) => {
    setInventory(prev => prev.filter(p => p.id !== productId));
  }, []);

  const updateInventoryStock = useCallback((productId: string, newStock: number) => {
    setInventory(prev => prev.map(p => p.id === productId ? { ...p, stock: newStock } : p));
  }, []);

  const updateShopInfo = useCallback((info: ShopInfo) => {
    setShopInfo(info);
  }, []);


  const value = useMemo(() => ({
    customers, inventory, sales, purchases, payments, shopInfo, users, currentUser, isAuthenticated, isLoaded,
    login, logout, addSale, updateSale, deleteSale, addPurchase, updatePurchase, deletePurchase, 
    addCustomer, updateCustomer, deleteCustomer, recordPayment, addProduct, updateProduct, deleteProduct, 
    updateInventoryStock, updateShopInfo, addUser, updateUserPassword, deleteUser
  }), [
    customers, inventory, sales, purchases, payments, shopInfo, users, currentUser, isAuthenticated, isLoaded,
    login, logout, addSale, updateSale, deleteSale, addPurchase, updatePurchase, deletePurchase,
    addCustomer, updateCustomer, deleteCustomer, recordPayment, addProduct, updateProduct, deleteProduct,
    updateInventoryStock, updateShopInfo, addUser, updateUserPassword, deleteUser
  ]);

  if (!isLoaded) {
    return null; // or a loading spinner
  }
  
  return (
    <AppContext.Provider value={value}>
      {children}
    </AppContext.Provider>
  );
};

export const useAppContext = () => {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useAppContext must be used within an AppProvider');
  }
  return context;
};
