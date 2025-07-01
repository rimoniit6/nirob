
"use client"

import * as React from "react"
import { MoreHorizontal, PlusCircle } from "lucide-react"
import { z } from "zod"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"

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
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { useToast } from "@/hooks/use-toast"
import { useAppContext } from "@/context/AppContext"
import type { Product } from "@/lib/data"
import { Switch } from "@/components/ui/switch"

const adjustStockFormSchema = z.object({
  stock: z.coerce.number().int().min(0, { message: "Stock must be a non-negative number." }),
});

const getStatus = (stock: number | null): { text: string; variant: "secondary" | "outline" | "destructive"; className?: string } => {
  if (stock === null) return { text: "Service", variant: "secondary", className: "bg-blue-100 text-blue-800" };
  if (stock === 0) return { text: "Out of Stock", variant: "destructive" };
  if (stock <= 10) return { text: "Low Stock", variant: "outline", className: 'text-amber-600 border-amber-600' };
  return { text: "In Stock", variant: "secondary" };
}

export default function InventoryPage() {
  const { toast } = useToast();
  const { inventory, addProduct, updateProduct, deleteProduct, updateInventoryStock } = useAppContext();
  const [filter, setFilter] = React.useState("");

  const [isAddEditDialogOpen, setIsAddEditDialogOpen] = React.useState(false);
  const [productToEdit, setProductToEdit] = React.useState<Product | null>(null);
  
  const [isAdjustStockDialogOpen, setIsAdjustStockDialogOpen] = React.useState(false);
  const [productToAdjust, setProductToAdjust] = React.useState<Product | null>(null);

  const [productToDelete, setProductToDelete] = React.useState<string | null>(null);

  const productFormSchema = React.useMemo(() => {
    return z.object({
      name: z.string().trim().min(2, { message: "Product name must be at least 2 characters." }),
      category: z.string().min(2, { message: "Category must be at least 2 characters." }),
      measurement: z.string().min(1, { message: "Measurement unit is required (e.g., pcs, kg, L)." }),
      price: z.coerce.number().min(0, { message: "Price must be a non-negative number." }),
      isService: z.boolean().default(false),
      stock: z.coerce.number().int().min(0).optional(),
    }).refine(data => data.isService || (typeof data.stock === 'number' && data.stock >= 0), {
      message: "Stock is required for products with tracked inventory.",
      path: ["stock"],
    }).superRefine(({ name }, ctx) => {
        const isDuplicate = inventory.some(product => 
            product.name.toLowerCase() === name.toLowerCase() && product.id !== productToEdit?.id
        );
        if (isDuplicate) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                message: "A product with this name already exists.",
                path: ["name"],
            });
        }
    });
  }, [inventory, productToEdit]);

  const addEditForm = useForm<z.infer<typeof productFormSchema>>({
    resolver: zodResolver(productFormSchema),
    defaultValues: { name: "", category: "", measurement: "", stock: 0, price: 0, isService: false },
  });

  const watchIsService = addEditForm.watch("isService");

  React.useEffect(() => {
    if (watchIsService) {
        addEditForm.setValue('stock', undefined);
        addEditForm.clearErrors('stock');
    }
  }, [watchIsService, addEditForm]);

  const adjustStockForm = useForm<z.infer<typeof adjustStockFormSchema>>({
    resolver: zodResolver(adjustStockFormSchema),
    defaultValues: { stock: 0 },
  });

  React.useEffect(() => {
    if (isAddEditDialogOpen) {
        if (productToEdit) {
            addEditForm.reset({
                ...productToEdit,
                isService: productToEdit.stock === null,
                stock: productToEdit.stock ?? undefined,
            });
        } else {
            addEditForm.reset({ name: "", category: "", measurement: "", price: 0, isService: false, stock: 0 });
        }
    }
  }, [isAddEditDialogOpen, productToEdit, addEditForm]);

  React.useEffect(() => {
    if (isAdjustStockDialogOpen && productToAdjust) {
      adjustStockForm.reset({ stock: productToAdjust.stock ?? 0 });
    }
  }, [isAdjustStockDialogOpen, productToAdjust, adjustStockForm]);

  function onAddEditSubmit(values: z.infer<typeof productFormSchema>) {
    const productData = {
        name: values.name,
        category: values.category,
        measurement: values.measurement,
        price: values.price,
        stock: values.isService ? null : values.stock!,
    };

    if (productToEdit) {
      updateProduct(productToEdit.id, productData);
      toast({ title: "Product Updated", description: `${values.name} has been successfully updated.` });
    } else {
      addProduct(productData);
      toast({ title: "Product Added", description: `${values.name} has been added to inventory.` });
    }
    setIsAddEditDialogOpen(false);
    setProductToEdit(null);
  }

  function onAdjustStockSubmit(values: z.infer<typeof adjustStockFormSchema>) {
    if (productToAdjust) {
      updateInventoryStock(productToAdjust.id, values.stock);
      toast({ title: "Stock Adjusted", description: `Stock for ${productToAdjust.name} updated to ${values.stock}.` });
    }
    setIsAdjustStockDialogOpen(false);
    setProductToAdjust(null);
  }

  const confirmDelete = () => {
    if (productToDelete) {
      const productName = inventory.find(p => p.id === productToDelete)?.name;
      deleteProduct(productToDelete);
      toast({
        title: "Product Deleted",
        description: `Product ${productName} has been successfully deleted.`,
        variant: "destructive"
      });
      setProductToDelete(null);
    }
  };
  
  const filteredProducts = React.useMemo(() => {
    return inventory.filter(product =>
      product.name.toLowerCase().includes(filter.toLowerCase()) ||
      product.category.toLowerCase().includes(filter.toLowerCase())
    );
  }, [inventory, filter]);

  return (
    <>
      <PageHeader title="Inventory" description="Track and manage your product stock.">
         <div className="flex flex-col sm:flex-row gap-2">
            <Input
                placeholder="Filter by name or category..."
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
                className="w-full sm:w-auto"
            />
            <Dialog open={isAddEditDialogOpen} onOpenChange={(open) => { setIsAddEditDialogOpen(open); if(!open) setProductToEdit(null);}}>
                <DialogTrigger asChild>
                    <Button onClick={() => { setProductToEdit(null); setIsAddEditDialogOpen(true); }} className="w-full sm:w-auto">
                        <PlusCircle className="mr-2 h-4 w-4" /> Add Product
                    </Button>
                </DialogTrigger>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{productToEdit ? 'Edit Product' : 'Add New Product'}</DialogTitle>
                        <DialogDescription>
                            {productToEdit ? `Editing ${productToEdit.name}.` : "Enter the details of the new product."}
                        </DialogDescription>
                    </DialogHeader>
                    <Form {...addEditForm}>
                        <form onSubmit={addEditForm.handleSubmit(onAddEditSubmit)} className="grid gap-4 py-4">
                            <FormField control={addEditForm.control} name="name" render={({ field }) => (
                                <FormItem><FormLabel>Product Name</FormLabel><FormControl><Input placeholder="e.g. Fresh Soyabean Oil 5L" {...field} /></FormControl><FormMessage /></FormItem>
                            )} />
                            <FormField control={addEditForm.control} name="category" render={({ field }) => (
                                <FormItem><FormLabel>Category</FormLabel><FormControl><Input placeholder="e.g. Groceries" {...field} /></FormControl><FormMessage /></FormItem>
                            )} />
                            <FormField control={addEditForm.control} name="measurement" render={({ field }) => (
                                <FormItem><FormLabel>Measurement Unit</FormLabel><FormControl><Input placeholder="e.g. pcs, kg, litre" {...field} /></FormControl><FormMessage /></FormItem>
                            )} />
                             <FormField control={addEditForm.control} name="price" render={({ field }) => (
                                <FormItem><FormLabel>Sell Price (৳)</FormLabel><FormControl><Input type="number" placeholder="e.g. 850" {...field} /></FormControl><FormMessage /></FormItem>
                            )} />
                            <FormField control={addEditForm.control} name="isService" render={({ field }) => (
                                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                                    <div className="space-y-0.5">
                                        <FormLabel>Service / No Stock</FormLabel>
                                        <FormDescription>
                                            Enable if this is a service or an item without trackable stock.
                                        </FormDescription>
                                    </div>
                                    <FormControl>
                                        <Switch checked={field.value} onCheckedChange={field.onChange} />
                                    </FormControl>
                                </FormItem>
                            )} />
                            <FormField control={addEditForm.control} name="stock" render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Stock Quantity</FormLabel>
                                  <FormControl>
                                      <Input
                                          type="number"
                                          placeholder="e.g. 25"
                                          {...field}
                                          disabled={watchIsService}
                                          value={field.value ?? ""}
                                          onChange={e => field.onChange(e.target.value === '' ? undefined : e.target.value)}
                                      />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                            )} />

                            <DialogFooter>
                                <Button type="submit">{productToEdit ? 'Save Changes' : 'Add Product'}</Button>
                            </DialogFooter>
                        </form>
                    </Form>
                </DialogContent>
            </Dialog>
        </div>
      </PageHeader>
      <Card>
        <CardHeader>
          <CardTitle>Products</CardTitle>
          <CardDescription>A list of all products in your inventory.</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Product Name</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Measurement</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Price</TableHead>
                <TableHead className="text-right">Stock</TableHead>
                <TableHead>
                  <span className="sr-only">Actions</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredProducts.map((item) => {
                const status = getStatus(item.stock);
                return (
                    <TableRow key={item.id}>
                        <TableCell className="font-medium">{item.name}</TableCell>
                        <TableCell>{item.category}</TableCell>
                        <TableCell>{item.measurement}</TableCell>
                        <TableCell>
                            <Badge variant={status.variant} className={status.className}>
                                {status.text}
                            </Badge>
                        </TableCell>
                        <TableCell className="text-right">{`৳${item.price.toFixed(2)}`}</TableCell>
                        <TableCell className="text-right">{item.stock ?? "N/A"}</TableCell>
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
                            <DropdownMenuItem onClick={() => { setProductToEdit(item); setIsAddEditDialogOpen(true); }}>Edit</DropdownMenuItem>
                            {item.stock !== null && (
                                <DropdownMenuItem onClick={() => { setProductToAdjust(item); setIsAdjustStockDialogOpen(true); }}>Adjust Stock</DropdownMenuItem>
                            )}
                            <DropdownMenuItem className="text-destructive" onClick={() => setProductToDelete(item.id)}>Delete</DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                        </TableCell>
                    </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
      
      {/* Adjust Stock Dialog */}
      <Dialog open={isAdjustStockDialogOpen} onOpenChange={setIsAdjustStockDialogOpen}>
        <DialogContent>
            <DialogHeader>
                <DialogTitle>Adjust Stock for {productToAdjust?.name}</DialogTitle>
                <DialogDescription>
                    Update the stock quantity for this product.
                </DialogDescription>
            </DialogHeader>
            <Form {...adjustStockForm}>
                <form onSubmit={adjustStockForm.handleSubmit(onAdjustStockSubmit)} className="grid gap-4 py-4">
                    <FormField control={adjustStockForm.control} name="stock" render={({ field }) => (
                        <FormItem><FormLabel>New Stock Quantity</FormLabel><FormControl><Input type="number" placeholder="Enter new stock quantity" {...field} /></FormControl><FormMessage /></FormItem>
                    )} />
                    <DialogFooter>
                        <Button type="submit">Save Changes</Button>
                    </DialogFooter>
                </form>
            </Form>
        </DialogContent>
      </Dialog>
      
      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!productToDelete} onOpenChange={(open) => !open && setProductToDelete(null)}>
        <AlertDialogContent>
            <AlertDialogHeader>
                <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                <AlertDialogDescription>
                    This action cannot be undone. This will permanently delete the product.
                </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
                <AlertDialogCancel onClick={() => setProductToDelete(null)}>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={confirmDelete}>Continue</AlertDialogAction>
            </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
