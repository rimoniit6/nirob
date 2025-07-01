
"use client"

import * as React from "react"
import { Bar, BarChart, CartesianGrid, XAxis } from "recharts"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from "@/components/ui/card"
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart"
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
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs"
import type { ChartConfig } from "@/components/ui/chart"
import { PageHeader } from "@/components/page-header"
import { DollarSign, ShoppingCart, ArrowUpRight, Clock, CreditCard } from "lucide-react"
import { useAppContext } from "@/context/AppContext"
import { Sale } from "@/lib/data"
import { startOfDay, isWithinInterval, startOfWeek, endOfDay, startOfMonth } from "date-fns"
import { cn } from "@/lib/utils"
import { useLanguage } from "@/context/LanguageContext"

const chartConfig = {
  sales: {
    label: "Sales (৳)",
    color: "hsl(var(--primary))",
  },
} satisfies ChartConfig

const StatCard = ({ title, value, icon: Icon, description, valueClassName }: { title: string, value: string, icon: React.ElementType, description: string, valueClassName?: string }) => (
    <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{title}</CardTitle>
            <Icon className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
            <div className={cn("text-2xl font-bold", valueClassName)}>{value}</div>
            <p className="text-xs text-muted-foreground">{description}</p>
        </CardContent>
    </Card>
);

const TopProductsCard = ({ title, products, t }: { title: string, products: { name: string; units: number }[], t: (key: string) => string }) => (
    <Card>
        <CardHeader>
            <CardTitle>{title}</CardTitle>
        </CardHeader>
        <CardContent>
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>{t('dashboard.topProducts.product')}</TableHead>
                        <TableHead className="text-right">{t('dashboard.topProducts.unitsSold')}</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {products.map((product, index) => (
                        <TableRow key={index}>
                            <TableCell className="font-medium">{product.name}</TableCell>
                            <TableCell className="text-right">{product.units}</TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        </CardContent>
    </Card>
);

const getStatsForPeriod = (sales: Sale[], period: 'daily' | 'weekly' | 'monthly') => {
    const now = new Date();
    let startDate: Date;
    const endDate = endOfDay(now);

    switch (period) {
        case 'daily':
            startDate = startOfDay(now);
            break;
        case 'weekly':
            startDate = startOfWeek(now, { weekStartsOn: 1 }); // Monday
            break;
        case 'monthly':
            startDate = startOfMonth(now);
            break;
    }

    const relevantSales = sales.filter(sale => {
        try {
            const saleDate = new Date(sale.date);
            return isWithinInterval(saleDate, { start: startDate, end: endDate });
        } catch {
            return false;
        }
    });

    const numSales = relevantSales.length;
    const totalAmount = relevantSales.reduce((sum, sale) => sum + sale.amount, 0);
    const paidAmount = relevantSales.reduce((sum, sale) => sum + sale.paidAmount, 0);
    const dueAmount = totalAmount - paidAmount;

    return { numSales, totalAmount, dueAmount, paidAmount, relevantSales };
};


const getTopProducts = (sales: Sale[], inventory: any[]) => {
    const productSales: { [key: string]: number } = {};
    sales.forEach(sale => {
        sale.products.forEach(p => {
            productSales[p.productId] = (productSales[p.productId] || 0) + p.quantity;
        });
    });

    return Object.entries(productSales)
        .sort(([, qtyA], [, qtyB]) => qtyB - qtyA)
        .slice(0, 3)
        .map(([productId, units]) => {
            const product = inventory.find(p => p.id === productId);
            return { name: product?.name || 'Unknown Product', units };
        });
}


export default function DashboardPage() {
    const { sales, customers, inventory } = useAppContext();
    const { t } = useLanguage();

    const [stats, setStats] = React.useState({
        daily: { numSales: 0, totalAmount: 0, dueAmount: 0, paidAmount: 0, relevantSales: [] as Sale[] },
        weekly: { numSales: 0, totalAmount: 0, dueAmount: 0, paidAmount: 0, relevantSales: [] as Sale[] },
        monthly: { numSales: 0, totalAmount: 0, dueAmount: 0, paidAmount: 0, relevantSales: [] as Sale[] },
    });

    React.useEffect(() => {
        setStats({
            daily: getStatsForPeriod(sales, 'daily'),
            weekly: getStatsForPeriod(sales, 'weekly'),
            monthly: getStatsForPeriod(sales, 'monthly'),
        });
    }, [sales]);

    const { daily: dailyStats, weekly: weeklyStats, monthly: monthlyStats } = stats;
    
    const topProductsDaily = getTopProducts(dailyStats.relevantSales, inventory);
    const topProductsWeekly = getTopProducts(weeklyStats.relevantSales, inventory);
    const topProductsMonthly = getTopProducts(monthlyStats.relevantSales, inventory);

    const recentSales = React.useMemo(() => {
        return [...sales]
            .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
            .slice(0, 5)
            .map(sale => {
                const customer = customers.find(c => c.id === sale.customerId);
                return {
                    ...sale,
                    customerName: customer?.name || "Unknown Customer"
                }
            });
    }, [sales, customers]);

    const monthlyChartData = React.useMemo(() => {
        const monthData: { [key: string]: number } = {};
        const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
        
        monthlyStats.relevantSales.forEach(sale => {
            const saleDate = new Date(sale.date);
            const month = monthNames[saleDate.getMonth()];
            monthData[month] = (monthData[month] || 0) + sale.amount;
        });
        
        return monthNames.map(month => ({ month, sales: monthData[month] || 0 })).filter(d => d.sales > 0);
    }, [monthlyStats.relevantSales]);
    
    const weeklyChartData = React.useMemo(() => {
        const weekData: { [key: string]: number } = { "Sunday": 0, "Monday": 0, "Tuesday": 0, "Wednesday": 0, "Thursday": 0, "Friday": 0, "Saturday": 0 };
        const dayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
        
        weeklyStats.relevantSales.forEach(sale => {
            const saleDate = new Date(sale.date);
            const dayName = dayNames[saleDate.getDay()];
            weekData[dayName] = (weekData[dayName] || 0) + sale.amount;
        });
        
        return dayNames.map(day => ({ day, sales: weekData[day] || 0 }));
    }, [weeklyStats.relevantSales]);

  return (
    <>
      <PageHeader title={t('dashboard.title')} description={t('dashboard.description')} />
      <Tabs defaultValue="monthly" className="space-y-4">
        <TabsList className="grid w-full grid-cols-3 sm:w-auto sm:inline-flex">
          <TabsTrigger value="daily">{t('dashboard.tabs.daily')}</TabsTrigger>
          <TabsTrigger value="weekly">{t('dashboard.tabs.weekly')}</TabsTrigger>
          <TabsTrigger value="monthly">{t('dashboard.tabs.monthly')}</TabsTrigger>
        </TabsList>
        
        <TabsContent value="daily" className="space-y-4">
          <div className="grid gap-4 lg:grid-cols-3">
            <div className="lg:col-span-2 grid gap-4 md:grid-cols-2">
                <StatCard title={t('dashboard.stats.numSales')} value={`${dailyStats.numSales}`} icon={ShoppingCart} description={t('dashboard.stats.salesToday')} />
                <StatCard title={t('dashboard.stats.sellAmount')} value={`৳${dailyStats.totalAmount.toFixed(2)}`} icon={DollarSign} description={t('dashboard.stats.revenueToday')} />
                <StatCard title={t('dashboard.stats.dueAmount')} value={`৳${dailyStats.dueAmount.toFixed(2)}`} icon={Clock} description={t('dashboard.stats.outstandingToday')} valueClassName={dailyStats.dueAmount > 0 ? "text-destructive" : ""} />
                <StatCard title={t('dashboard.stats.paidAmount')} value={`৳${dailyStats.paidAmount.toFixed(2)}`} icon={CreditCard} description={t('dashboard.stats.paidToday')} valueClassName={dailyStats.paidAmount > 0 ? "text-green-600" : ""} />
            </div>
            <div className="lg:col-span-1">
                <TopProductsCard title={t('dashboard.topProducts.today')} products={topProductsDaily} t={t} />
            </div>
          </div>
        </TabsContent>
        
        <TabsContent value="weekly" className="space-y-4">
          <div className="grid gap-4 lg:grid-cols-3">
            <div className="lg:col-span-2 grid gap-4 md:grid-cols-2">
                <StatCard title={t('dashboard.stats.numSales')} value={`${weeklyStats.numSales}`} icon={ShoppingCart} description={t('dashboard.stats.salesWeek')} />
                <StatCard title={t('dashboard.stats.sellAmount')} value={`৳${weeklyStats.totalAmount.toFixed(2)}`} icon={DollarSign} description={t('dashboard.stats.revenueWeek')} />
                <StatCard title={t('dashboard.stats.dueAmount')} value={`৳${weeklyStats.dueAmount.toFixed(2)}`} icon={Clock} description={t('dashboard.stats.outstandingWeek')} valueClassName={weeklyStats.dueAmount > 0 ? "text-destructive" : ""} />
                <StatCard title={t('dashboard.stats.paidAmount')} value={`৳${weeklyStats.paidAmount.toFixed(2)}`} icon={CreditCard} description={t('dashboard.stats.paidWeek')} valueClassName={weeklyStats.paidAmount > 0 ? "text-green-600" : ""} />
            </div>
            <div className="lg:col-span-1">
                <TopProductsCard title={t('dashboard.topProducts.week')} products={topProductsWeekly} t={t} />
            </div>
          </div>
           <Card>
              <CardHeader>
                <CardTitle>{t('dashboard.charts.weeklyTitle')}</CardTitle>
              </CardHeader>
              <CardContent className="pl-2">
                <ChartContainer config={chartConfig} className="h-[300px] w-full">
                  <BarChart accessibilityLayer data={weeklyChartData} margin={{ top: 20, right: 20, left: 0, bottom: 0 }}>
                    <CartesianGrid vertical={false} />
                    <XAxis
                      dataKey="day"
                      tickLine={false}
                      tickMargin={10}
                      axisLine={false}
                      tickFormatter={(value) => value.slice(0, 3)}
                    />
                    <ChartTooltip
                      cursor={false}
                      content={<ChartTooltipContent 
                        formatter={(value) => `৳${value.toLocaleString()}`} 
                        hideLabel 
                      />}
                    />
                    <Bar dataKey="sales" fill="var(--color-sales)" radius={8} />
                  </BarChart>
                </ChartContainer>
              </CardContent>
            </Card>
        </TabsContent>
        
        <TabsContent value="monthly" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <StatCard title={t('dashboard.stats.numSales')} value={`${monthlyStats.numSales}`} icon={ShoppingCart} description={t('dashboard.stats.salesMonth')} />
            <StatCard title={t('dashboard.stats.sellAmount')} value={`৳${monthlyStats.totalAmount.toFixed(2)}`} icon={DollarSign} description={t('dashboard.stats.revenueMonth')} />
            <StatCard title={t('dashboard.stats.dueAmount')} value={`৳${monthlyStats.dueAmount.toFixed(2)}`} icon={Clock} description={t('dashboard.stats.outstandingMonth')} valueClassName={monthlyStats.dueAmount > 0 ? "text-destructive" : ""} />
            <StatCard title={t('dashboard.stats.paidAmount')} value={`৳${monthlyStats.paidAmount.toFixed(2)}`} icon={CreditCard} description={t('dashboard.stats.paidMonth')} valueClassName={monthlyStats.paidAmount > 0 ? "text-green-600" : ""} />
          </div>
          <div className="grid gap-4 mt-4 md:grid-cols-2 lg:grid-cols-7">
            <Card className="lg:col-span-4">
              <CardHeader>
                <CardTitle>{t('dashboard.charts.monthlyTitle')}</CardTitle>
              </CardHeader>
              <CardContent className="pl-2">
                <ChartContainer config={chartConfig} className="h-[300px] w-full">
                  <BarChart accessibilityLayer data={monthlyChartData} margin={{ top: 20, right: 20, left: 0, bottom: 0 }}>
                    <CartesianGrid vertical={false} />
                    <XAxis
                      dataKey="month"
                      tickLine={false}
                      tickMargin={10}
                      axisLine={false}
                      tickFormatter={(value) => value.slice(0, 3)}
                    />
                    <ChartTooltip
                      cursor={false}
                      content={<ChartTooltipContent 
                        formatter={(value) => `৳${value.toLocaleString()}`} 
                        hideLabel 
                      />}
                    />
                    <Bar dataKey="sales" fill="var(--color-sales)" radius={8} />
                  </BarChart>
                </ChartContainer>
              </CardContent>
            </Card>
            <div className="lg:col-span-3 flex flex-col gap-4">
                <TopProductsCard title={t('dashboard.topProducts.month')} products={topProductsMonthly} t={t} />
                <Card>
                    <CardHeader>
                        <CardTitle>{t('dashboard.recentSales.title')}</CardTitle>
                        <CardDescription>{t('dashboard.recentSales.description')}</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Table>
                        <TableHeader>
                            <TableRow>
                            <TableHead>{t('dashboard.recentSales.customer')}</TableHead>
                            <TableHead className="text-right">{t('dashboard.recentSales.amount')}</TableHead>
                            <TableHead className="text-right">{t('dashboard.recentSales.status')}</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {recentSales.map((sale) => (
                            <TableRow key={sale.id}>
                                <TableCell>
                                <div className="font-medium">{sale.customerName}</div>
                                <div className="text-sm text-muted-foreground">{sale.date}</div>
                                </TableCell>
                                <TableCell className="text-right">{`৳${sale.amount.toFixed(2)}`}</TableCell>
                                <TableCell className="text-right">
                                <Badge variant={sale.status === "Paid" ? "secondary" : "destructive"}>{sale.status}</Badge>
                                </TableCell>
                            </TableRow>
                            ))}
                        </TableBody>
                        </Table>
                    </CardContent>
                    <CardFooter>
                        <Button asChild size="sm" className="ml-auto gap-1">
                        <a href="/sales">
                            {t('dashboard.recentSales.viewAll')}
                            <ArrowUpRight className="h-4 w-4" />
                        </a>
                        </Button>
                    </CardFooter>
                </Card>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </>
  )
}

    