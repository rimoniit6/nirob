
"use client"

import * as React from "react"
import { MoreHorizontal, PlusCircle, FileText, Download } from "lucide-react"
import { z } from "zod"
import { useForm } from "react-hook-form"
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
import type { Purchase } from "@/lib/data"
import { Combobox } from "@/components/ui/combobox"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Textarea } from "@/components/ui/textarea"

const purchaseFormSchema = z.object({
  type: z.enum(['Inventory', 'Utility']),
  supplier: z.string().min(2, { message: "Supplier/Payee name is required." }),
  description: z.string().optional(),
  productId: z.string().optional(),
  quantity: z.coerce.number().int().min(1).optional(),
  amount: z.coerce.number().positive({ message: "Total amount must be a positive number." }),
  paidAmount: z.coerce.number().min(0, { message: "Paid amount cannot be negative." }),
})
.refine(data => data.paidAmount <= data.amount, {
  message: "Paid amount cannot be greater than the total amount.",
  path: ["paidAmount"],
})
.superRefine((data, ctx) => {
  if (data.type === 'Utility') {
    if (!data.description || data.description.length < 2) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "A brief description is required for utility expenses.",
        path: ["description"],
      });
    }
  } else { // Inventory
    if (!data.productId) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Please select a product for inventory purchases.",
        path: ["productId"],
      });
    }
    if (!data.quantity || data.quantity < 1) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Quantity must be at least 1.",
        path: ["quantity"],
      });
    }
  }
});


export default function PurchasesPage() {
  const { toast } = useToast()
  const { shopInfo, purchases, inventory, addPurchase, updatePurchase, deletePurchase } = useAppContext();
  const [isDialogOpen, setIsDialogOpen] = React.useState(false);
  const [filter, setFilter] = React.useState("");
  const [purchaseToDelete, setPurchaseToDelete] = React.useState<string | null>(null);
  const [purchaseToEdit, setPurchaseToEdit] = React.useState<Purchase | null>(null);

  const form = useForm<z.infer<typeof purchaseFormSchema>>({
    resolver: zodResolver(purchaseFormSchema),
    defaultValues: {
      type: "Inventory",
      supplier: "",
      description: "",
      productId: "",
      quantity: 1,
      amount: "" as any,
      paidAmount: "" as any,
    },
  });
  
  const watchedProductId = form.watch("productId");
  const watchedType = form.watch("type");

  const productOptions = React.useMemo(() => inventory
    .filter(p => p.stock !== null)
    .map(p => ({
        value: p.id,
        label: `${p.name} (${p.measurement})`,
  })), [inventory]);
  
  React.useEffect(() => {
    if (isDialogOpen) {
      if (purchaseToEdit) {
        form.reset({
          type: purchaseToEdit.type,
          supplier: purchaseToEdit.supplier,
          description: purchaseToEdit.description,
          productId: purchaseToEdit.productId,
          quantity: purchaseToEdit.quantity,
          amount: purchaseToEdit.amount,
          paidAmount: purchaseToEdit.paidAmount,
        });
      } else {
        form.reset({
          type: "Inventory",
          supplier: "",
          description: "",
          productId: "",
          quantity: 1,
          amount: "" as any,
          paidAmount: "" as any,
        });
      }
    }
  }, [isDialogOpen, purchaseToEdit, form]);

  function onSubmit(values: z.infer<typeof purchaseFormSchema>) {
    if (purchaseToEdit) {
        updatePurchase(purchaseToEdit.id, values)
        toast({
            title: "Purchase Updated",
            description: `Purchase ${purchaseToEdit.id} has been successfully updated.`,
        });
    } else {
        addPurchase(values)
        toast({
            title: "Purchase Added",
            description: `New purchase/expense has been created.`,
        });
    }
    
    setIsDialogOpen(false);
    setPurchaseToEdit(null);
  }

  const filteredPurchases = React.useMemo(() => {
    return purchases.filter(purchase =>
        purchase.supplier.toLowerCase().includes(filter.toLowerCase()) ||
        purchase.description.toLowerCase().includes(filter.toLowerCase()) ||
        purchase.id.toLowerCase().includes(filter.toLowerCase())
    ).sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [purchases, filter]);

  const handleExport = () => {
    const worksheetData = filteredPurchases.map(p => {
        const dueAmount = p.amount - p.paidAmount;
        return {
        'Purchase ID': p.id,
        'Type': p.type,
        'Supplier/Payee': p.supplier,
        'Description': p.description,
        'Quantity': p.quantity || 'N/A',
        'Measurement': p.measurement || 'N/A',
        'Date': p.date,
        'Total Amount (tk)': p.amount.toFixed(2),
        'Paid Amount (tk)': p.paidAmount.toFixed(2),
        'Due Amount (tk)': dueAmount.toFixed(2),
        'Status': p.status,
    }});
    const worksheet = XLSX.utils.json_to_sheet(worksheetData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Purchases");
    XLSX.writeFile(workbook, "purchase_history.xlsx");
    toast({
      title: "Export Successful",
      description: "Purchase history has been exported to an Excel file.",
    });
  };

  const confirmDelete = () => {
    if (purchaseToDelete) {
      deletePurchase(purchaseToDelete);
      toast({
          title: "Record Deleted",
          description: `Record ${purchaseToDelete} has been successfully deleted.`,
          variant: "destructive"
      });
      setPurchaseToDelete(null);
    }
  };

  const handleEdit = (purchase: Purchase) => {
    setPurchaseToEdit(purchase);
    setIsDialogOpen(true);
  };
  
  const handlePrint = (purchaseId: string) => {
    const purchase = purchases.find((p) => p.id === purchaseId);
    if (!purchase) return;
    const dueAmount = purchase.amount - purchase.paidAmount;

    const printWindow = window.open("", "_blank", "height=600,width=800");
    if (printWindow) {
      printWindow.document.write(`
        <html>
          <head>
            <title>Purchase Voucher - ${purchase.id}</title>
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
              <table>
                <tr class="top">
                  <td colspan="2">
                    <table>
                      <tr>
                        <td class="shop-info">
                          <h1>${shopInfo.name}</h1>
                          <p>${shopInfo.address}<br/>${shopInfo.contact}</p>
                        </td>
                        <td style="text-align: right;">
                          <strong>Voucher #:</strong> ${purchase.id}<br/>
                          <strong>Date:</strong> ${purchase.date}
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
                <tr class="information">
                  <td colspan="2">
                    <table>
                      <tr>
                        <td>
                          <strong>Paid To:</strong><br/>
                          ${purchase.supplier}
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
                <tr class="heading">
                  <td>Description</td>
                  ${purchase.type === 'Inventory' ? `<td style="text-align: center;">Quantity</td>` : ''}
                  <td style="text-align: right;">Cost</td>
                </tr>
                <tr class="item last">
                  <td>${purchase.description}</td>
                  ${purchase.type === 'Inventory' ? `<td style="text-align: center;">${purchase.quantity} ${purchase.measurement || ''}</td>` : ''}
                  <td style="text-align: right;">৳${purchase.amount.toFixed(2)}</td>
                </tr>
                <tr class="heading">
                  <td colspan="2">Summary</td>
                </tr>
                <tr class="item">
                  <td>Total Amount</td>
                  <td style="text-align: right;">৳${purchase.amount.toFixed(2)}</td>
                </tr>
                <tr class="item">
                  <td>Paid Amount</td>
                  <td style="text-align: right;">৳${purchase.paidAmount.toFixed(2)}</td>
                </tr>
                <tr class="item total">
                  <td><strong>Due Amount</strong></td>
                  <td style="text-align: right;"><strong>৳${dueAmount.toFixed(2)}</strong></td>
                </tr>
                 <tr class="heading">
                  <td>Status</td>
                  <td style="text-align: right;">${purchase.status}</td>
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


  return (
    <>
      <PageHeader title="Purchases & Expenses" description="Track all your inventory purchases and other expenses.">
        <div className="flex flex-col sm:flex-row gap-2">
            <Input
                placeholder="Filter by supplier, description..."
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
                className="w-full sm:w-auto"
            />
            <Button onClick={handleExport} variant="outline" className="w-full sm:w-auto">
                <Download className="mr-2 h-4 w-4" />
                Export
            </Button>
            <Dialog open={isDialogOpen} onOpenChange={(open) => {
                setIsDialogOpen(open);
                if (!open) {
                    setPurchaseToEdit(null);
                }
            }}>
                <DialogTrigger asChild>
                    <Button onClick={() => setPurchaseToEdit(null)} className="w-full sm:w-auto">
                        <PlusCircle className="mr-2 h-4 w-4" /> Add Record
                    </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[480px]">
                    <DialogHeader>
                        <DialogTitle>{purchaseToEdit ? 'Edit Record' : 'Add New Purchase / Expense'}</DialogTitle>
                        <DialogDescription>
                        {purchaseToEdit
                            ? `Editing record ${purchaseToEdit.id}.`
                            : "Select record type and enter the details."}
                        </DialogDescription>
                    </DialogHeader>
                    <Form {...form}>
                        <form onSubmit={form.handleSubmit(onSubmit)} className="grid gap-4 py-4">
                            <FormField
                                control={form.control}
                                name="type"
                                render={({ field }) => (
                                    <FormItem className="space-y-3">
                                    <FormLabel>Record Type</FormLabel>
                                    <FormControl>
                                        <RadioGroup
                                            onValueChange={field.onChange}
                                            defaultValue={field.value}
                                            className="flex space-x-4"
                                            disabled={!!purchaseToEdit}
                                        >
                                            <FormItem className="flex items-center space-x-2 space-y-0">
                                                <FormControl><RadioGroupItem value="Inventory" /></FormControl>
                                                <FormLabel className="font-normal">Inventory Purchase</FormLabel>
                                            </FormItem>
                                            <FormItem className="flex items-center space-x-2 space-y-0">
                                                <FormControl><RadioGroupItem value="Utility" /></FormControl>
                                                <FormLabel className="font-normal">Utility Expense</FormLabel>
                                            </FormItem>
                                        </RadioGroup>
                                    </FormControl>
                                    <FormMessage />
                                    </FormItem>
                                )}
                            />

                            <FormField control={form.control} name="supplier" render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Supplier / Payee</FormLabel>
                                    <FormControl><Input placeholder="e.g. ACI Limited / DESCO" {...field} /></FormControl>
                                    <FormMessage />
                                </FormItem>
                            )} />

                            {watchedType === 'Inventory' ? (
                                <>
                                    <FormField control={form.control} name="productId" render={({ field }) => (
                                        <FormItem className="flex flex-col">
                                            <FormLabel>Product</FormLabel>
                                            <Combobox
                                                options={productOptions}
                                                value={field.value}
                                                onChange={field.onChange}
                                                placeholder="Select product..."
                                                searchPlaceholder="Search products..."
                                            />
                                            <FormMessage />
                                        </FormItem>
                                    )} />
                                    <FormField control={form.control} name="quantity" render={({ field }) => {
                                        const selectedProduct = inventory.find(p => p.id === watchedProductId);
                                        return (
                                        <FormItem>
                                            <FormLabel>Quantity</FormLabel>
                                            <div className="flex items-center gap-2">
                                            <FormControl><Input type="number" placeholder="e.g. 100" {...field} className="w-full" /></FormControl>
                                            {selectedProduct && <span className="text-sm text-muted-foreground whitespace-nowrap">{selectedProduct.measurement}</span>}
                                            </div>
                                            <FormMessage />
                                        </FormItem>
                                        )
                                    }} />
                                </>
                            ) : (
                                <FormField control={form.control} name="description" render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Expense Description</FormLabel>
                                        <FormControl><Textarea placeholder="e.g. Electricity bill for May, Office rent" {...field} /></FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )} />
                            )}
                             
                             <FormField control={form.control} name="amount" render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Total Cost (৳)</FormLabel>
                                    <FormControl><Input type="number" placeholder="e.g. 10000.00" {...field} /></FormControl>
                                    <FormMessage />
                                </FormItem>
                            )} />
                             <FormField control={form.control} name="paidAmount" render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Paid Amount (৳)</FormLabel>
                                    <FormControl><Input type="number" placeholder="e.g. 5000.00" {...field} /></FormControl>
                                    <FormMessage />
                                </FormItem>
                            )} />
                            <DialogFooter>
                                <Button type="submit">{purchaseToEdit ? 'Save Changes' : 'Save Record'}</Button>
                            </DialogFooter>
                        </form>
                    </Form>
                </DialogContent>
            </Dialog>
        </div>
      </PageHeader>
      <Card>
        <CardHeader>
          <CardTitle>Purchases & Expenses History</CardTitle>
          <CardDescription>A list of all purchases and expenses.</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>ID</TableHead>
                <TableHead>Supplier/Payee</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Details</TableHead>
                <TableHead>Date</TableHead>
                <TableHead className="text-right">Total (৳)</TableHead>
                <TableHead className="text-right">Paid (৳)</TableHead>
                <TableHead className="text-right">Due (৳)</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>
                  <span className="sr-only">Actions</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredPurchases.map((purchase) => {
                const dueAmount = purchase.amount - purchase.paidAmount;
                return (
                <TableRow key={purchase.id}>
                  <TableCell className="font-medium">{purchase.id}</TableCell>
                  <TableCell>{purchase.supplier}</TableCell>
                  <TableCell>{purchase.description}</TableCell>
                  <TableCell>
                    {purchase.type === 'Inventory' 
                        ? `${purchase.quantity} ${purchase.measurement || ''}`
                        : <Badge variant="outline">{purchase.type}</Badge>
                    }
                  </TableCell>
                  <TableCell>{purchase.date}</TableCell>
                  <TableCell className="text-right font-semibold">{`৳${purchase.amount.toFixed(2)}`}</TableCell>
                  <TableCell className="text-right font-semibold text-green-600">{`৳${purchase.paidAmount.toFixed(2)}`}</TableCell>
                  <TableCell className="text-right">
                    <Badge variant={dueAmount > 0.001 ? 'destructive' : 'secondary'}>
                        {`৳${dueAmount.toFixed(2)}`}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant={purchase.status === 'Paid' ? 'secondary' : 'destructive'}>
                      {purchase.status}
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
                        <DropdownMenuItem onClick={() => handleEdit(purchase)}>Edit</DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handlePrint(purchase.id)}>
                            <FileText className="mr-2 h-4 w-4" />
                            Print
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem className="text-destructive" onClick={() => setPurchaseToDelete(purchase.id)}>
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
      <AlertDialog open={!!purchaseToDelete} onOpenChange={(open) => !open && setPurchaseToDelete(null)}>
        <AlertDialogContent>
            <AlertDialogHeader>
                <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                <AlertDialogDescription>
                    This action cannot be undone. This will permanently delete the record {purchaseToDelete}.
                </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
                <AlertDialogCancel onClick={() => setPurchaseToDelete(null)}>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={confirmDelete}>Continue</AlertDialogAction>
            </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
