
"use client"

import * as React from "react"
import { MoreHorizontal, PlusCircle, FileText, Download, Trash2 } from "lucide-react"
import { z } from "zod"
import { useForm, useFieldArray, Controller } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as XLSX from "xlsx"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { PageHeader } from "@/components/page-header"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { useToast } from "@/hooks/use-toast"
import { useAppContext } from "@/context/AppContext"
import type { Sale, Product } from "@/lib/data"
import { Combobox } from "@/components/ui/combobox"
import { Separator } from "@/components/ui/separator"
import { Label } from "@/components/ui/label"

const saleProductSchema = z.object({
  productId: z.string().min(1, "Please select a product."),
  quantity: z.coerce.number().min(1, "Quantity must be at least 1."),
  price: z.coerce.number().min(0, { message: "Price must be a non-negative number." }),
});

const createSaleFormSchema = (inventory: Product[], saleToEdit: Sale | null) => 
  z.object({
    customerId: z.string().min(1, "Please select a customer."),
    paidAmount: z.coerce.number().min(0, "Paid amount cannot be negative."),
    products: z.array(saleProductSchema).min(1, "Please add at least one product."),
  }).superRefine((data, ctx) => {
      data.products.forEach((product, index) => {
          const inventoryItem = inventory.find(i => i.id === product.productId);
          
          if (!inventoryItem || inventoryItem.stock === null) {
              return;
          }

          const originalQuantity = saleToEdit?.products.find(p => p.productId === product.productId)?.quantity || 0;
          const availableStock = inventoryItem.stock + originalQuantity;

          if (product.quantity > availableStock) {
              ctx.addIssue({
                  code: z.ZodIssueCode.custom,
                  message: `Only ${availableStock} in stock.`,
                  path: [`products`, index, `quantity`],
              });
          }
      });
  });


type SaleFormValues = z.infer<ReturnType<typeof createSaleFormSchema>>;

export default function SalesPage() {
  const { toast } = useToast()
  const { shopInfo, sales, customers, inventory, addSale, updateSale, deleteSale } = useAppContext();

  const [isDialogOpen, setIsDialogOpen] = React.useState(false);
  const [filter, setFilter] = React.useState("");
  const [saleToDelete, setSaleToDelete] = React.useState<string | null>(null);
  const [saleToEdit, setSaleToEdit] = React.useState<Sale | null>(null);

  const saleFormSchema = React.useMemo(() => createSaleFormSchema(inventory, saleToEdit), [inventory, saleToEdit]);

  const form = useForm<SaleFormValues>({
    resolver: zodResolver(saleFormSchema),
    defaultValues: {
      customerId: "",
      paidAmount: 0,
      products: [],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "products",
  });

  React.useEffect(() => {
    if (!isDialogOpen) {
      form.reset();
      setSaleToEdit(null);
    } else if (saleToEdit) {
        form.reset({
            customerId: saleToEdit.customerId,
            paidAmount: saleToEdit.paidAmount,
            products: saleToEdit.products.map(p => ({
                productId: p.productId,
                quantity: p.quantity,
                price: p.price,
            }))
        });
    } else {
        form.reset({
            customerId: "",
            paidAmount: 0,
            products: [],
        });
    }
  }, [isDialogOpen, saleToEdit, form]);

  const customerOptions = React.useMemo(() => customers.map(c => ({
    value: c.id,
    label: `${c.name} (${c.phone})`,
  })), [customers]);

  const productOptions = React.useMemo(() => inventory
    .filter(p => {
        if (p.stock === null) return true; // Services are always available
        const originalQuantity = saleToEdit?.products.find(sp => sp.productId === p.id)?.quantity || 0;
        return (p.stock + originalQuantity) > 0;
    })
    .map(p => {
        const originalProductInSale = saleToEdit?.products.find(sp => sp.productId === p.id);
        const currentStock = p.stock ?? 0;
        const stockForDisplay = originalProductInSale 
            ? currentStock + originalProductInSale.quantity 
            : currentStock;

        return {
            value: p.id,
            label: p.stock === null 
                ? `${p.name} (Service)` 
                : `${p.name} (${p.measurement} - Stock: ${stockForDisplay})`,
        }
  }), [inventory, saleToEdit]);

  function onSubmit(values: SaleFormValues) {
    if (saleToEdit) {
      updateSale(saleToEdit.id, values);
      toast({
        title: "Sale Updated",
        description: `Invoice ${saleToEdit.id} has been updated.`,
      });
    } else {
      addSale(values);
      toast({
        title: "Sale Added",
        description: `New sale has been created.`,
      });
    }
    
    setIsDialogOpen(false);
  }

  const filteredSales = React.useMemo(() => {
    return sales.filter(sale => {
        const customer = customers.find(c => c.id === sale.customerId);
        return customer?.name.toLowerCase().includes(filter.toLowerCase()) ||
        customer?.phone.toLowerCase().includes(filter.toLowerCase()) ||
        sale.id.toLowerCase().includes(filter.toLowerCase())
    });
  }, [sales, customers, filter]);

  const handleExport = () => {
    const worksheetData = filteredSales.map(({ id, customerId, date, amount, paidAmount }) => {
        const customer = customers.find(c => c.id === customerId);
        const dueAmount = amount - paidAmount;
        return {
            'Invoice ID': id,
            'Customer': customer?.name || 'N/A',
            'Date': date,
            'Total Amount (৳)': amount.toFixed(2),
            'Paid Amount (৳)': paidAmount.toFixed(2),
            'Due Amount (৳)': dueAmount.toFixed(2),
        }
    });
    const worksheet = XLSX.utils.json_to_sheet(worksheetData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Sales");
    XLSX.writeFile(workbook, "sales_history.xlsx");
    toast({
      title: "Export Successful",
      description: "Sales history has been exported to an Excel file.",
    });
  };

  const confirmDelete = () => {
    if (saleToDelete) {
      deleteSale(saleToDelete);
      toast({
          title: "Sale Deleted",
          description: `Invoice ${saleToDelete} has been successfully deleted.`,
          variant: "destructive"
      });
      setSaleToDelete(null);
    }
  };

  const handleEdit = (sale: Sale) => {
    setSaleToEdit(sale);
    setIsDialogOpen(true);
  };
  
  const handlePrint = (saleId: string) => {
    const sale = sales.find((s) => s.id === saleId);
    if (!sale) return;
    const customer = customers.find(c => c.id === sale.customerId);
    if (!customer) return;

    const printWindow = window.open("", "_blank", "height=600,width=800");
    if (printWindow) {
      printWindow.document.write(`
        <html>
          <head>
            <title>Invoice - ${sale.id}</title>
            <style>
              body { font-family: 'PT Sans', sans-serif; margin: 2rem; color: #333; }
              .invoice-box { max-width: 800px; margin: auto; padding: 30px; border: 1px solid #eee; box-shadow: 0 0 10px rgba(0, 0, 0, 0.15); font-size: 16px; line-height: 24px; }
              .invoice-box table { width: 100%; line-height: inherit; text-align: left; border-collapse: collapse; }
              .invoice-box table td { padding: 5px; vertical-align: top; }
              .invoice-box table tr.top table td { padding-bottom: 20px; }
              .invoice-box table tr.information table td { padding-bottom: 40px; }
              .invoice-box table tr.heading td { background: #eee; border-bottom: 1px solid #ddd; font-weight: bold; }
              .invoice-box table tr.item td { border-bottom: 1px solid #eee; }
              .invoice-box table tr.item.last td { border-bottom: none; }
              .invoice-box table tr.total td:nth-child(2) { text-align: right; border-top: 2px solid #eee; font-weight: bold; }
              .shop-info h1 { font-size: 2em; margin-bottom: 0; }
              .shop-info p { margin-top: 0.2em; }
            </style>
          </head>
          <body>
            <div class="invoice-box">
              <div class="shop-info">
                  <h1>${shopInfo.name}</h1>
                  <p>${shopInfo.address}<br/>${shopInfo.contact}</p>
              </div>
              <table>
                <tr class="information">
                  <td colspan="2">
                    <table>
                      <tr>
                        <td>
                          <strong>Bill To:</strong><br/>
                          ${customer.name}
                        </td>
                        <td style="text-align: right;">
                          <strong>Invoice #:</strong> ${sale.id}<br/>
                          <strong>Date:</strong> ${sale.date}
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
                <tr class="heading">
                  <td>Status</td>
                  <td style="text-align: right;">${sale.status}</td>
                </tr>
                <tr class="heading">
                  <td>Item</td>
                  <td style="text-align: right;">Price</td>
                </tr>
                ${sale.products.map(p => {
                    const product = inventory.find(i => i.id === p.productId)
                    return `<tr class="item">
                        <td>${product?.name || 'N/A'} x ${p.quantity} ${product?.measurement || ''}</td>
                        <td style="text-align: right;">৳${(p.price * p.quantity).toFixed(2)}</td>
                    </tr>`
                }).join('')}
                
                <tr class="heading">
                  <td style="font-weight: bold;">Summary</td>
                  <td style="font-weight: bold; text-align: right;">Amount</td>
                </tr>
                <tr class="item">
                  <td>Total Amount</td>
                  <td style="text-align: right;">৳${sale.amount.toFixed(2)}</td>
                </tr>
                 <tr class="item">
                  <td>Paid Amount</td>
                  <td style="text-align: right;">৳${sale.paidAmount.toFixed(2)}</td>
                </tr>
                <tr class="total">
                  <td>Due Amount</td>
                  <td style="text-align: right;"><strong>৳${(sale.amount - sale.paidAmount).toFixed(2)}</strong></td>
                </tr>
              </table>
            </div>
            <script>
              window.onload = function() {
                window.print();
                window.onafterprint = function() { window.close(); };
              }
            </script>
          </body>
        </html>
      `);
      printWindow.document.close();
    }
  };

  const watchProducts = form.watch("products");
  const watchPaidAmount = form.watch("paidAmount");

  const totalAmount = watchProducts.reduce((sum, product) => {
    return sum + (Number(product.price) || 0) * (Number(product.quantity) || 0);
  }, 0);
  
  const dueAmount = Math.max(0, totalAmount - (Number(watchPaidAmount) || 0));


  return (
    <>
      <PageHeader title="Sales" description="Manage and track all your sales records.">
        <div className="flex flex-col sm:flex-row gap-2">
            <Input
                placeholder="Filter by customer or ID..."
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
                className="w-full sm:w-auto"
            />
            <Button onClick={handleExport} variant="outline" className="w-full sm:w-auto">
                <Download className="mr-2 h-4 w-4" />
                Export
            </Button>
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogTrigger asChild>
                    <Button onClick={() => setSaleToEdit(null)} className="w-full sm:w-auto">
                        <PlusCircle className="mr-2 h-4 w-4" /> Add New Sale
                    </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-3xl">
                    <DialogHeader>
                        <DialogTitle>{saleToEdit ? 'Edit Sale' : 'Add New Sale'}</DialogTitle>
                        <DialogDescription>
                        {saleToEdit
                            ? `Editing invoice ${saleToEdit.id}.`
                            : "Select customer and add products to create a new sale."}
                        </DialogDescription>
                    </DialogHeader>
                    <Form {...form}>
                        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                            <FormField
                                control={form.control}
                                name="customerId"
                                render={({ field }) => (
                                <FormItem className="flex flex-col">
                                    <FormLabel>Customer</FormLabel>
                                    <Combobox
                                        options={customerOptions}
                                        value={field.value}
                                        onChange={field.onChange}
                                        placeholder="Select customer..."
                                        searchPlaceholder="Search customers..."
                                    />
                                    <FormMessage />
                                </FormItem>
                                )}
                            />
                            
                            <Separator />

                            <div>
                                <h3 className="text-lg font-medium mb-2">Products</h3>
                                <div className="space-y-4">
                                    {fields.map((field, index) => (
                                        <div key={field.id} className="flex items-end gap-2">
                                            <FormField
                                                control={form.control}
                                                name={`products.${index}.productId`}
                                                render={({ field }) => (
                                                    <FormItem className="flex-1">
                                                        <FormLabel className={index !== 0 ? 'sr-only' : ''}>Product</FormLabel>
                                                        <FormControl>
                                                            <Combobox
                                                                options={productOptions}
                                                                value={field.value}
                                                                onChange={(value) => {
                                                                    field.onChange(value);
                                                                    const product = inventory.find(p => p.id === value);
                                                                    if(product) {
                                                                        form.setValue(`products.${index}.price`, product.price);
                                                                        form.setValue(`products.${index}.quantity`, 1);
                                                                    }
                                                                }}
                                                                placeholder="Select product..."
                                                                searchPlaceholder="Search products..."
                                                                />
                                                        </FormControl>
                                                        <FormMessage />
                                                    </FormItem>
                                                )}
                                            />
                                            <FormField
                                                control={form.control}
                                                name={`products.${index}.quantity`}
                                                render={({ field }) => (
                                                    <FormItem>
                                                        <FormLabel className={index !== 0 ? 'sr-only' : ''}>Quantity</FormLabel>
                                                        <FormControl>
                                                            <Input type="number" {...field} className="w-24" placeholder="Qty"/>
                                                        </FormControl>
                                                        <FormMessage />
                                                    </FormItem>
                                                )}
                                            />
                                            <FormField
                                                control={form.control}
                                                name={`products.${index}.price`}
                                                render={({ field }) => (
                                                    <FormItem>
                                                        <FormLabel className={index !== 0 ? 'sr-only' : ''}>Price</FormLabel>
                                                        <FormControl>
                                                            <Input type="number" step="0.01" {...field} className="w-28" placeholder="Price"/>
                                                        </FormControl>
                                                        <FormMessage />
                                                    </FormItem>
                                                )}
                                            />
                                            <Button type="button" variant="destructive" size="icon" onClick={() => remove(index)}>
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    ))}
                                </div>
                                <FormMessage>{form.formState.errors.products?.message || (form.formState.errors.products as any)?.root?.message}</FormMessage>
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    className="mt-4"
                                    onClick={() => append({ productId: "", quantity: 1, price: 0 })}
                                >
                                    Add Product
                                </Button>
                            </div>
                           
                            <Separator />

                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
                               <FormField
                                    control={form.control}
                                    name="paidAmount"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Paid Amount (৳)</FormLabel>
                                            <FormControl>
                                                <Input type="number" placeholder="e.g. 500" {...field} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <div className="space-y-2">
                                    <Label>Total Amount (৳)</Label>
                                    <Input value={totalAmount.toFixed(2)} readOnly className="font-semibold" />
                                </div>
                                <div className="space-y-2">
                                    <Label>Due Amount (৳)</Label>
                                    <Input value={dueAmount.toFixed(2)} readOnly className="font-semibold text-destructive" />
                                </div>
                            </div>

                            <DialogFooter>
                                <Button type="submit">{saleToEdit ? 'Save Changes' : 'Create Sale'}</Button>
                            </DialogFooter>
                        </form>
                    </Form>
                </DialogContent>
            </Dialog>
        </div>
      </PageHeader>
      <Card>
        <CardHeader>
          <CardTitle>Sales History</CardTitle>
          <CardDescription>A list of all sales made in your shop.</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Invoice ID</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>Products Sold</TableHead>
                <TableHead>Date</TableHead>
                <TableHead className="text-right">Total Amount (৳)</TableHead>
                <TableHead className="text-right">Paid Amount (৳)</TableHead>
                <TableHead className="text-right">Due Amount (৳)</TableHead>
                <TableHead>
                  <span className="sr-only">Actions</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredSales.map((sale) => {
                const customer = customers.find(c => c.id === sale.customerId);
                const dueAmount = sale.amount - sale.paidAmount;
                const productsSold = sale.products
                    .map(p => {
                        const product = inventory.find(i => i.id === p.productId);
                        return product ? `${product.name} (x${p.quantity} ${product.measurement})` : 'Unknown Product';
                    })
                    .join(", ");
                return (
                <TableRow key={sale.id}>
                  <TableCell className="font-medium">{sale.id}</TableCell>
                  <TableCell>{customer?.name || 'N/A'}</TableCell>
                  <TableCell className="max-w-[250px] truncate" title={productsSold}>
                    {productsSold}
                  </TableCell>
                  <TableCell>{sale.date}</TableCell>
                  <TableCell className="text-right">{`৳${sale.amount.toFixed(2)}`}</TableCell>
                  <TableCell className="text-right font-medium text-green-600">{`৳${sale.paidAmount.toFixed(2)}`}</TableCell>
                  <TableCell className="text-right">
                    <Badge variant={dueAmount > 0.001 ? 'destructive' : 'secondary'}>
                      {`৳${dueAmount.toFixed(2)}`}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button aria-haspopup="true" size="icon" variant="ghost">
                          <MoreHorizontal className="h-4 w-4" />
                          <span className="sr-only">Toggle menu</span>
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuLabel>Actions</DropdownMenuLabel>
                        <DropdownMenuItem onClick={() => handleEdit(sale)}>Edit</DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handlePrint(sale.id)}>
                            <FileText className="mr-2 h-4 w-4" />
                            Print Invoice
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem className="text-destructive" onClick={() => setSaleToDelete(sale.id)}>
                            Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              )})}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
      <AlertDialog open={!!saleToDelete} onOpenChange={(open) => !open && setSaleToDelete(null)}>
        <AlertDialogContent>
            <AlertDialogHeader>
                <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                <AlertDialogDescription>
                    This action cannot be undone. This will permanently delete the sale record for invoice {saleToDelete}.
                </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
                <AlertDialogCancel onClick={() => setSaleToDelete(null)}>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={confirmDelete}>Continue</AlertDialogAction>
            </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
