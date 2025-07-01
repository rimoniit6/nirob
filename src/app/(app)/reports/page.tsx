
"use client"

import * as React from "react"
import {
  BadgeCent,
  TrendingUp,
  DollarSign,
  CreditCard,
  Clock,
  Package,
  Download,
} from "lucide-react"
import { isWithinInterval, startOfMonth, startOfWeek, startOfDay, endOfDay, isValid, format } from "date-fns"
import type { DateRange } from "react-day-picker"
import * as XLSX from "xlsx"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Tabs,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs"
import { PageHeader } from "@/components/page-header"
import { useAppContext } from "@/context/AppContext"
import type { Sale, Purchase, Product as InventoryProduct } from "@/lib/data"
import { cn } from "@/lib/utils"
import { DateRangePicker } from "@/components/ui/date-range-picker"
import { useToast } from "@/hooks/use-toast"
import { useLanguage } from "@/context/LanguageContext"

const StatCard = ({ title, value, icon: Icon, description, valueClassName }: { title: string, value: string, icon: React.ElementType, description?: string, valueClassName?: string }) => (
    <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{title}</CardTitle>
            <Icon className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
            <div className={cn("text-2xl font-bold", valueClassName)}>{value}</div>
            {description && <p className="text-xs text-muted-foreground">{description}</p>}
        </CardContent>
    </Card>
);

interface ProductReport {
  id: string;
  name: string;
  quantity: number;
  revenue: number;
  paid: number;
  due: number;
  cogs: number;
  profit: number;
}
interface ServiceReport {
  id: string;
  name: string;
  quantity: number;
  revenue: number;
  paid: number;
  due: number;
}

const calculateReports = (sales: Sale[], purchases: Purchase[], inventory: InventoryProduct[], dateRange: DateRange | undefined) => {
    
    if (!dateRange?.from || !dateRange?.to || !isValid(dateRange.from) || !isValid(dateRange.to)) {
        return { totalRevenue: 0, totalPaidAmount: 0, totalDueAmount: 0, totalExpenses: 0, totalProfit: 0, stockValue: 0, productReports: [], serviceReports: [], utilityExpensesList: [] };
    }
    
    const startDate = startOfDay(dateRange.from);
    const endDate = endOfDay(dateRange.to);

    const filteredSales = sales.filter(s => {
        try {
            const saleDate = new Date(s.date);
            return isWithinInterval(saleDate, { start: startDate, end: endDate });
        } catch { return false; }
    });

    const filteredPurchases = purchases.filter(p => {
        try {
            const purchaseDate = new Date(p.date);
            return isWithinInterval(purchaseDate, { start: startDate, end: endDate });
        } catch { return false; }
    });
    
    // Average cost should be calculated based on all historical purchases for accuracy
    const inventoryPurchases = purchases.filter(p => p.type === 'Inventory');

    const averageCostPerProduct = new Map<string, number>();
    const productCosts = new Map<string, { totalCost: number, totalQuantity: number }>();
    inventoryPurchases.forEach(p => {
        if(!p.productId || !p.quantity) return;
        const entry = productCosts.get(p.productId) || { totalCost: 0, totalQuantity: 0 };
        entry.totalCost += p.amount;
        entry.totalQuantity += p.quantity;
        productCosts.set(p.productId, entry);
    });
    productCosts.forEach((data, productId) => {
        if (data.totalQuantity > 0) {
            averageCostPerProduct.set(productId, data.totalCost / data.totalQuantity);
        }
    });

    let totalRevenue = 0;
    let totalPaidAmount = 0;
    let totalCOGS = 0; // Cost of Goods Sold in the period
    const productStats = new Map<string, ProductReport>();
    const serviceStats = new Map<string, ServiceReport>();

    filteredSales.forEach(sale => {
        totalRevenue += sale.amount;
        totalPaidAmount += sale.paidAmount;

        const paidRatio = sale.amount > 0 ? sale.paidAmount / sale.amount : 0;

        sale.products.forEach(p => {
            const inventoryItem = inventory.find(inv => inv.id === p.productId);
            const isService = inventoryItem?.stock === null;
            const itemName = inventoryItem?.name || "Unknown";
            
            const productRevenue = p.price * p.quantity;
            const productPaid = productRevenue * paidRatio;
            const productDue = productRevenue - productPaid;

            if (isService) {
                const existing = serviceStats.get(p.productId) || { id: p.productId, name: itemName, quantity: 0, revenue: 0, paid: 0, due: 0 };
                existing.quantity += p.quantity;
                existing.revenue += productRevenue;
                existing.paid += productPaid;
                existing.due += productDue;
                serviceStats.set(p.productId, existing);
            } else {
                const cogs = (averageCostPerProduct.get(p.productId) || 0) * p.quantity;
                totalCOGS += cogs;
                
                const existing = productStats.get(p.productId) || { id: p.productId, name: itemName, quantity: 0, revenue: 0, paid: 0, due: 0, cogs: 0, profit: 0 };
                existing.quantity += p.quantity;
                existing.revenue += productRevenue;
                existing.paid += productPaid;
                existing.due += productDue;
                existing.cogs += cogs;
                existing.profit += productRevenue - cogs;
                productStats.set(p.productId, existing);
            }
        });
    });
    
    const totalDueAmount = totalRevenue - totalPaidAmount;
    // Utility expenses in the period (for profit calculation)
    const totalUtilityExpenses = filteredPurchases.filter(p => p.type === 'Utility').reduce((sum, p) => sum + p.amount, 0);
    // Total purchase expenses in the period (for cash flow)
    const totalExpenses = filteredPurchases.reduce((sum, p) => sum + p.amount, 0);

    const stockValue = inventory.reduce((sum, product) => {
        if (product.stock && product.stock > 0) {
            const avgCost = averageCostPerProduct.get(product.id) || 0;
            return sum + (avgCost * product.stock);
        }
        return sum;
    }, 0);

    const totalProfit = totalRevenue - totalCOGS - totalUtilityExpenses;

    const productReports = Array.from(productStats.values()).sort((a,b) => b.revenue - a.revenue);
    const serviceReports = Array.from(serviceStats.values()).sort((a,b) => b.revenue - a.revenue);
    const utilityExpensesList = filteredPurchases
        .filter(p => p.type === 'Utility')
        .sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime());


    return { totalRevenue, totalPaidAmount, totalDueAmount, totalExpenses, totalProfit, stockValue, productReports, serviceReports, utilityExpensesList };
}


export default function ReportsPage() {
    const { t } = useLanguage();
    const [period, setPeriod] = React.useState<'all' | 'monthly' | 'weekly' | 'daily' | 'custom'>('monthly');
    const { toast } = useToast();
    const [date, setDate] = React.useState<DateRange | undefined>(undefined);
    
    const { sales, purchases, inventory } = useAppContext();

    React.useEffect(() => {
        setDate({
            from: startOfMonth(new Date()),
            to: endOfDay(new Date()),
        });
    }, []);

    const handlePeriodChange = (value: string) => {
        const newPeriod = value as 'all' | 'monthly' | 'weekly' | 'daily';
        setPeriod(newPeriod);
        const now = new Date();
        let fromDate: Date | undefined;
        let toDate: Date | undefined = endOfDay(now);

        switch (newPeriod) {
            case 'daily':
                fromDate = startOfDay(now);
                break;
            case 'weekly':
                fromDate = startOfWeek(now, { weekStartsOn: 1 });
                break;
            case 'monthly':
                fromDate = startOfMonth(now);
                break;
            case 'all':
                fromDate = purchases.length > 0 || sales.length > 0 
                    ? new Date(Math.min(
                        ...[...purchases, ...sales]
                            .map(item => new Date(item.date).getTime())
                            .filter(t => !isNaN(t))
                      ))
                    : new Date();
                break;
        }
        setDate({ from: fromDate, to: toDate });
    }

    const handleDateChange = (newDate: DateRange | undefined) => {
        setDate(newDate);
        setPeriod('custom');
    }

    const reportData = React.useMemo(() => calculateReports(sales, purchases, inventory, date), [sales, purchases, inventory, date]);

    const handleExport = () => {
        const { totalRevenue, totalPaidAmount, totalDueAmount, totalProfit, totalExpenses, stockValue, productReports, serviceReports, utilityExpensesList } = reportData;

        const summaryData = [
            { Metric: t('reports.stats.totalSellService'), Value: `৳${totalRevenue.toFixed(2)}` },
            { Metric: t('reports.stats.paidAmount'), Value: `৳${totalPaidAmount.toFixed(2)}` },
            { Metric: t('reports.stats.dueAmount'), Value: `৳${totalDueAmount.toFixed(2)}` },
            { Metric: t('reports.stats.totalProfit'), Value: `৳${totalProfit.toFixed(2)}` },
            { Metric: t('reports.stats.totalExpenses'), Value: `৳${totalExpenses.toFixed(2)}` },
            { Metric: t('reports.stats.stockValue'), Value: `৳${stockValue.toFixed(2)}` },
        ];

        const productSalesData = productReports.map(p => ({
            [t('reports.productReport.table.product')]: p.name,
            [t('reports.productReport.table.qty')]: p.quantity,
            [t('reports.productReport.table.sellAmount')]: p.revenue.toFixed(2),
            [t('reports.productReport.table.paidAmount')]: p.paid.toFixed(2),
            [t('reports.productReport.table.dueAmount')]: p.due.toFixed(2),
            [t('reports.productReport.table.cogs')]: p.cogs.toFixed(2),
            [t('reports.productReport.table.profit')]: p.profit.toFixed(2),
        }));

        const serviceSalesData = serviceReports.map(s => ({
            [t('reports.serviceReport.table.service')]: s.name,
            [t('reports.serviceReport.table.count')]: s.quantity,
            [t('reports.serviceReport.table.sellAmount')]: s.revenue.toFixed(2),
            [t('reports.serviceReport.table.paidAmount')]: s.paid.toFixed(2),
            [t('reports.serviceReport.table.dueAmount')]: s.due.toFixed(2),
        }));

        const utilityExpensesData = utilityExpensesList.map(e => ({
            [t('reports.expenseReport.table.date')]: e.date,
            [t('reports.expenseReport.table.payee')]: e.supplier,
            [t('reports.expenseReport.table.description')]: e.description,
            [t('reports.expenseReport.table.amount')]: e.amount.toFixed(2),
            [t('reports.expenseReport.table.paidAmount')]: e.paidAmount.toFixed(2),
            [t('reports.expenseReport.table.dueAmount')]: (e.amount - e.paidAmount).toFixed(2),
        }));
        
        const wb = XLSX.utils.book_new();
        const wsSummary = XLSX.utils.json_to_sheet(summaryData);
        XLSX.utils.book_append_sheet(wb, wsSummary, "Summary");
        
        if(productReports.length > 0) {
            const wsProductSales = XLSX.utils.json_to_sheet(productSalesData);
            XLSX.utils.book_append_sheet(wb, wsProductSales, t('reports.productReport.title'));
        }
        
        if(serviceReports.length > 0) {
            const wsServiceSales = XLSX.utils.json_to_sheet(serviceSalesData);
            XLSX.utils.book_append_sheet(wb, wsServiceSales, t('reports.serviceReport.title'));
        }
        
        if(utilityExpensesList.length > 0) {
            const wsUtilityExpenses = XLSX.utils.json_to_sheet(utilityExpensesData);
            XLSX.utils.book_append_sheet(wb, wsUtilityExpenses, t('reports.expenseReport.title'));
        }

        let filename = "reports.xlsx";
        if (date?.from && date?.to) {
            const fromStr = format(date.from, "yyyy-MM-dd");
            const toStr = format(date.to, "yyyy-MM-dd");
            filename = `report_${fromStr}_to_${toStr}.xlsx`;
        }

        XLSX.writeFile(wb, filename);

        toast({
            title: t('reports.toast.exportSuccessTitle'),
            description: t('reports.toast.exportSuccessDescription'),
        });
    };

    return (
        <>
        <PageHeader title={t('reports.title')} description={t('reports.description')} />
        
        <div className="flex flex-col sm:flex-row gap-2 mb-4">
            <Tabs defaultValue="monthly" value={period} onValueChange={handlePeriodChange}>
                <TabsList className="grid w-full grid-cols-4 sm:w-auto sm:inline-flex">
                    <TabsTrigger value="all">{t('reports.tabs.allTime')}</TabsTrigger>
                    <TabsTrigger value="monthly">{t('reports.tabs.monthly')}</TabsTrigger>
                    <TabsTrigger value="weekly">{t('reports.tabs.weekly')}</TabsTrigger>
                    <TabsTrigger value="daily">{t('reports.tabs.daily')}</TabsTrigger>
                </TabsList>
            </Tabs>
            <DateRangePicker date={date} onDateChange={handleDateChange} />
            <Button onClick={handleExport} variant="outline">
                <Download className="mr-2 h-4 w-4" />
                {t('reports.export')}
            </Button>
        </div>


        <div className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                <StatCard title={t('reports.stats.totalSellService')} value={`৳${reportData.totalRevenue.toFixed(2)}`} icon={DollarSign} />
                <StatCard title={t('reports.stats.paidAmount')} value={`৳${reportData.totalPaidAmount.toFixed(2)}`} icon={CreditCard} valueClassName="text-green-600" />
                <StatCard title={t('reports.stats.dueAmount')} value={`৳${reportData.totalDueAmount.toFixed(2)}`} icon={Clock} valueClassName={reportData.totalDueAmount > 0 ? "text-destructive" : ""} />
                <StatCard title={t('reports.stats.totalProfit')} value={`৳${reportData.totalProfit.toFixed(2)}`} icon={TrendingUp} valueClassName={cn(reportData.totalProfit >= 0 ? 'text-green-600' : 'text-destructive')} />
                <StatCard title={t('reports.stats.totalExpenses')} value={`৳${reportData.totalExpenses.toFixed(2)}`} icon={BadgeCent} />
                <StatCard title={t('reports.stats.stockValue')} value={`৳${reportData.stockValue.toFixed(2)}`} icon={Package} description={t('reports.stats.stockValueDescription')} />
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>{t('reports.productReport.title')}</CardTitle>
                    <CardDescription>{t('reports.productReport.description')}</CardDescription>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>{t('reports.productReport.table.product')}</TableHead>
                                <TableHead className="text-center">{t('reports.productReport.table.qty')}</TableHead>
                                <TableHead className="text-right">{t('reports.productReport.table.sellAmount')}</TableHead>
                                <TableHead className="text-right">{t('reports.productReport.table.paidAmount')}</TableHead>
                                <TableHead className="text-right">{t('reports.productReport.table.dueAmount')}</TableHead>
                                <TableHead className="text-right">{t('reports.productReport.table.cogs')}</TableHead>
                                <TableHead className="text-right">{t('reports.productReport.table.profit')}</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {reportData.productReports.length > 0 ? (
                                reportData.productReports.map(product => (
                                    <TableRow key={product.id}>
                                        <TableCell className="font-medium">{product.name}</TableCell>
                                        <TableCell className="text-center">{product.quantity}</TableCell>
                                        <TableCell className="text-right">{`৳${product.revenue.toFixed(2)}`}</TableCell>
                                        <TableCell className={cn("text-right font-medium", "text-green-600")}>{`৳${product.paid.toFixed(2)}`}</TableCell>
                                        <TableCell className={cn("text-right font-medium", {"text-destructive": product.due > 0.001})}>{`৳${product.due.toFixed(2)}`}</TableCell>
                                        <TableCell className="text-right">{`৳${product.cogs.toFixed(2)}`}</TableCell>
                                        <TableCell className={cn("text-right font-semibold", product.profit >= 0 ? 'text-green-600' : 'text-destructive')}>{`৳${product.profit.toFixed(2)}`}</TableCell>
                                    </TableRow>
                                ))
                            ) : (
                                <TableRow>
                                    <TableCell colSpan={7} className="text-center text-muted-foreground">{t('reports.productReport.noData')}</TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
            
            <Card>
                <CardHeader>
                    <CardTitle>{t('reports.serviceReport.title')}</CardTitle>
                    <CardDescription>{t('reports.serviceReport.description')}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>{t('reports.serviceReport.table.service')}</TableHead>
                                <TableHead className="text-center">{t('reports.serviceReport.table.count')}</TableHead>
                                <TableHead className="text-right">{t('reports.serviceReport.table.sellAmount')}</TableHead>
                                <TableHead className="text-right">{t('reports.serviceReport.table.paidAmount')}</TableHead>
                                <TableHead className="text-right">{t('reports.serviceReport.table.dueAmount')}</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {reportData.serviceReports.length > 0 ? (
                                reportData.serviceReports.map(service => (
                                    <TableRow key={service.id}>
                                        <TableCell className="font-medium">{service.name}</TableCell>
                                        <TableCell className="text-center">{service.quantity}</TableCell>
                                        <TableCell className="text-right">{`৳${service.revenue.toFixed(2)}`}</TableCell>
                                        <TableCell className={cn("text-right font-medium", "text-green-600")}>{`৳${service.paid.toFixed(2)}`}</TableCell>
                                        <TableCell className={cn("text-right font-medium", {"text-destructive": service.due > 0.001})}>{`৳${service.due.toFixed(2)}`}</TableCell>
                                    </TableRow>
                                ))
                            ) : (
                                <TableRow>
                                    <TableCell colSpan={5} className="text-center text-muted-foreground">{t('reports.serviceReport.noData')}</TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>{t('reports.expenseReport.title')}</CardTitle>
                    <CardDescription>{t('reports.expenseReport.description')}</CardDescription>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>{t('reports.expenseReport.table.date')}</TableHead>
                                <TableHead>{t('reports.expenseReport.table.payee')}</TableHead>
                                <TableHead>{t('reports.expenseReport.table.description')}</TableHead>
                                <TableHead className="text-right">{t('reports.expenseReport.table.amount')}</TableHead>
                                <TableHead className="text-right">{t('reports.expenseReport.table.paidAmount')}</TableHead>
                                <TableHead className="text-right">{t('reports.expenseReport.table.dueAmount')}</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {reportData.utilityExpensesList.length > 0 ? (
                                reportData.utilityExpensesList.map(expense => (
                                    <TableRow key={expense.id}>
                                        <TableCell>{expense.date}</TableCell>
                                        <TableCell className="font-medium">{expense.supplier}</TableCell>
                                        <TableCell>{expense.description}</TableCell>
                                        <TableCell className="text-right font-semibold">{`৳${expense.amount.toFixed(2)}`}</TableCell>
                                        <TableCell className="text-right font-medium text-green-600">{`৳${expense.paidAmount.toFixed(2)}`}</TableCell>
                                        <TableCell className={cn("text-right font-medium", (expense.amount - expense.paidAmount) > 0.001 ? "text-destructive" : "")}>
                                            {`৳${(expense.amount - expense.paidAmount).toFixed(2)}`}
                                        </TableCell>
                                    </TableRow>
                                ))
                            ) : (
                                <TableRow>
                                    <TableCell colSpan={6} className="text-center text-muted-foreground">
                                        {t('reports.expenseReport.noData')}
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
        </>
    )
}

    