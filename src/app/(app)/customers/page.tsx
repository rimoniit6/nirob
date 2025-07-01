
"use client"

import * as React from "react"
import { MoreHorizontal, PlusCircle, FileText, FileDown, Download, FileUp, MessageSquare } from "lucide-react"
import { z } from "zod"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as XLSX from "xlsx"

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
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { useToast } from "@/hooks/use-toast"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import { useAppContext } from "@/context/AppContext"
import type { Customer } from "@/lib/data"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useLanguage } from "@/context/LanguageContext"
import { Label } from "@/components/ui/label"


const paymentFormSchema = z.object({
  amount: z.coerce.number().positive({ message: "Amount must be a positive number." }),
});

export default function CustomersPage() {
  const { toast } = useToast();
  const { t } = useLanguage();
  const { customers, sales, inventory, payments, addCustomer, updateCustomer, deleteCustomer, recordPayment, shopInfo } = useAppContext();
  const [filter, setFilter] = React.useState("");
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const [isAddEditDialogOpen, setIsAddEditDialogOpen] = React.useState(false);
  const [customerToEdit, setCustomerToEdit] = React.useState<Customer | null>(null);

  const [isRecordPaymentDialogOpen, setIsRecordPaymentDialogOpen] = React.useState(false);
  const [customerToPay, setCustomerToPay] = React.useState<Customer | null>(null);

  const [isViewDetailsDialogOpen, setIsViewDetailsDialogOpen] = React.useState(false);
  const [customerToView, setCustomerToView] = React.useState<Customer | null>(null);

  const [isSmsDialogOpen, setIsSmsDialogOpen] = React.useState(false);
  const [customerToSendSms, setCustomerToSendSms] = React.useState<Customer | null>(null);
  const [smsMessage, setSmsMessage] = React.useState("");

  const [customerToDelete, setCustomerToDelete] = React.useState<string | null>(null);

  const customerFormSchema = React.useMemo(() => {
    return z.object({
      name: z.string().min(2, { message: "Name must be at least 2 characters." }),
      phone: z.string().min(11, { message: "Phone number must be at least 11 digits." }),
      address: z.string().min(5, { message: "Address must be at least 5 characters." }),
    }).superRefine(({ phone }, ctx) => {
        const isDuplicate = customers.some(customer => 
            customer.phone === phone && customer.id !== customerToEdit?.id
        );
        if (isDuplicate) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                message: "This phone number is already registered to another customer.",
                path: ["phone"],
            });
        }
    });
  }, [customers, customerToEdit]);

  const addEditForm = useForm<z.infer<typeof customerFormSchema>>({
    resolver: zodResolver(customerFormSchema),
    defaultValues: { name: "", phone: "", address: "" },
  });

  const paymentForm = useForm<z.infer<typeof paymentFormSchema>>({
    resolver: zodResolver(paymentFormSchema),
    defaultValues: { amount: "" as any },
  });

  React.useEffect(() => {
    if (isAddEditDialogOpen) {
        if (customerToEdit) {
            addEditForm.reset(customerToEdit);
        } else {
            addEditForm.reset({ name: "", phone: "", address: "" });
        }
    }
  }, [isAddEditDialogOpen, customerToEdit, addEditForm]);

  React.useEffect(() => {
    if (isRecordPaymentDialogOpen && customerToPay) {
      paymentForm.reset({ amount: "" as any });
    }
  }, [isRecordPaymentDialogOpen, customerToPay, paymentForm]);

  React.useEffect(() => {
    if (customerToSendSms) {
      const message = t('customers.sms.template', {
        name: customerToSendSms.name,
        amount: customerToSendSms.dueAmount.toFixed(2),
        shopName: shopInfo.name
      });
      setSmsMessage(message);
      setIsSmsDialogOpen(true);
    }
  }, [customerToSendSms, t, shopInfo.name]);


  function onAddEditSubmit(values: z.infer<typeof customerFormSchema>) {
    if (customerToEdit) {
      updateCustomer(customerToEdit.id, values);
      toast({ title: t('customers.toast.updatedTitle'), description: t('customers.toast.updatedDescription', { name: values.name }) });
    } else {
      addCustomer(values);
      toast({ title: t('customers.toast.addedTitle'), description: t('customers.toast.addedDescription', { name: values.name }) });
    }
    setIsAddEditDialogOpen(false);
    setCustomerToEdit(null);
  }

  function onRecordPaymentSubmit(values: z.infer<typeof paymentFormSchema>) {
    if (customerToPay) {
      recordPayment(customerToPay.id, values.amount);
      toast({ title: t('customers.toast.paymentRecordedTitle'), description: t('customers.toast.paymentRecordedDescription', { amount: values.amount, name: customerToPay.name }) });
    }
    setIsRecordPaymentDialogOpen(false);
    setCustomerToPay(null);
  }

  const confirmDelete = () => {
    if (customerToDelete) {
      const customerName = customers.find(c => c.id === customerToDelete)?.name;
      deleteCustomer(customerToDelete);
      toast({
        title: t('customers.toast.deletedTitle'),
        description: t('customers.toast.deletedDescription', { name: customerName ?? '' }),
        variant: "destructive"
      });
      setCustomerToDelete(null);
    }
  };

  const handlePrintHistory = (customer: Customer | null) => {
    if (!customer) return;

    const customerSales = sales.filter(sale => sale.customerId === customer.id);
    const customerPayments = payments.filter(p => p.customerId === customer.id);
    
    const printWindow = window.open("", "_blank", "height=800,width=800");
    if (printWindow) {
      printWindow.document.write(`
        <html>
          <head>
            <title>${t('customers.print.title', { name: customer.name })}</title>
            <style>
              body { font-family: 'PT Sans', sans-serif; margin: 2rem; color: #333; }
              .history-box { max-width: 800px; margin: auto; padding: 30px; border: 1px solid #eee; box-shadow: 0 0 10px rgba(0, 0, 0, 0.15); font-size: 16px; line-height: 24px; }
              .history-box table { width: 100%; line-height: inherit; text-align: left; border-collapse: collapse; }
              .history-box table td, .history-box table th { padding: 8px; vertical-align: top; border-bottom: 1px solid #eee; }
              .history-box table th { background: #f9f9f9; font-weight: bold; }
              .customer-details { margin-bottom: 20px; }
              .customer-details p { margin: 5px 0; }
              h1, h2 { margin-bottom: 10px; }
              .sale-summary-row td { font-weight: bold; border-bottom: none; }
              .product-table { width: 95% !important; margin-left: 5%; margin-top: 5px; margin-bottom: 5px; }
              .product-table th, .product-table td { font-size: 14px; border: none !important; padding: 4px 8px; background: none !important; }
              .product-table th { font-weight: bold; border-bottom: 1px solid #eee !important; }
            </style>
          </head>
          <body>
            <div class="history-box">
              <h1>${t('customers.print.customerHistory')}</h1>
              <div class="customer-details">
                <h2>${customer.name}</h2>
                <p><strong>${t('customers.print.id')}</strong> ${customer.id}</p>
                <p><strong>${t('customers.print.phone')}</strong> ${customer.phone}</p>
                <p><strong>${t('customers.print.address')}</strong> ${customer.address}</p>
                <p><strong>${t('customers.print.totalDue')}</strong> ৳${customer.dueAmount.toFixed(2)}</p>
              </div>
              <h2>${t('customers.print.purchaseHistory')}</h2>
              <table>
                <thead>
                  <tr>
                    <th style="text-align: left;">${t('customers.print.invoice')}</th>
                    <th style="text-align: left;">${t('customers.print.date')}</th>
                    <th style="text-align: right;">${t('customers.print.total')}</th>
                    <th style="text-align: right;">${t('customers.print.paid')}</th>
                    <th style="text-align: right;">${t('customers.print.due')}</th>
                  </tr>
                </thead>
                <tbody>
                  ${customerSales.map(sale => {
                    const due = sale.amount - sale.paidAmount;
                    return `
                    <tr class="sale-summary-row">
                      <td style="text-align: left;">${sale.id}</td>
                      <td style="text-align: left;">${sale.date}</td>
                      <td style="text-align: right;">৳${sale.amount.toFixed(2)}</td>
                      <td style="text-align: right;">৳${sale.paidAmount.toFixed(2)}</td>
                      <td style="text-align: right;">৳${due.toFixed(2)}</td>
                    </tr>
                    <tr>
                      <td colspan="5" style="padding-bottom: 15px;">
                        <table class="product-table">
                          <thead><tr><th>${t('customers.print.product')}</th><th>${t('customers.print.qty')}</th><th style="text-align: right;">${t('customers.print.price')}</th><th style="text-align: right;">${t('customers.print.subtotal')}</th></tr></thead>
                          <tbody>
                            ${sale.products.map(p => {
                                const product = inventory.find(inv => inv.id === p.productId);
                                return `
                                <tr>
                                  <td>${product?.name || 'N/A'}</td>
                                  <td>${p.quantity}</td>
                                  <td style="text-align: right;">৳${p.price.toFixed(2)}</td>
                                  <td style="text-align: right;">৳${(p.quantity * p.price).toFixed(2)}</td>
                                </tr>`
                            }).join('')}
                          </tbody>
                        </table>
                      </td>
                    </tr>
                  `}).join('')}
                  ${customerSales.length === 0 ? `<tr><td colspan="5" style="text-align: center;">${t('customers.print.noPurchaseHistory')}</td></tr>` : ''}
                </tbody>
              </table>
              <h2 style="margin-top: 30px;">${t('customers.print.paymentHistory')}</h2>
              <table>
                <thead>
                  <tr>
                    <th>${t('customers.print.date')}</th>
                    <th>${t('customers.print.referenceId')}</th>
                    <th style="text-align: right;">${t('customers.print.amount')}</th>
                  </tr>
                </thead>
                <tbody>
                  ${customerPayments.map(payment => `
                    <tr>
                      <td>${payment.date}</td>
                      <td>${payment.id}</td>
                      <td style="text-align: right;">৳${payment.amount.toFixed(2)}</td>
                    </tr>
                  `).join('')}
                  ${customerPayments.length === 0 ? `<tr><td colspan="3" style="text-align: center;">${t('customers.print.noPaymentsRecorded')}</td></tr>` : ''}
                </tbody>
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

  const handleDownloadPdf = async (customer: Customer | null) => {
    if (!customer) return;

    const { default: jsPDF } = await import("jspdf");
    const { default: html2canvas } = await import("html2canvas");

    const customerSales = sales.filter(sale => sale.customerId === customer.id);
    const customerPayments = payments.filter(p => p.customerId === customer.id);
    
    const container = document.createElement('div');
    container.style.position = 'absolute';
    container.style.left = '-9999px';
    container.style.width = '800px'; 
    container.innerHTML = `
        <div class="history-box" style="font-family: 'PT Sans', sans-serif; margin: 0; padding: 30px; border: 1px solid #eee; background: white; font-size: 16px; line-height: 24px;">
          <h1>${t('customers.print.customerHistory')}</h1>
          <div class="customer-details" style="margin-bottom: 20px;">
            <h2>${customer.name}</h2>
            <p><strong>${t('customers.print.id')}</strong> ${customer.id}</p>
            <p><strong>${t('customers.print.phone')}</strong> ${customer.phone}</p>
            <p><strong>${t('customers.print.address')}</strong> ${customer.address}</p>
            <p><strong>${t('customers.print.totalDue')}</strong> ৳${customer.dueAmount.toFixed(2)}</p>
          </div>
          <h2>${t('customers.print.purchaseHistory')}</h2>
          <table style="width: 100%; line-height: inherit; text-align: left; border-collapse: collapse;">
            <thead>
              <tr>
                <th style="font-weight: bold; padding: 4px; text-align: left; background: #f9f9f9; border-bottom: 1px solid #ddd;">${t('customers.print.invoice')}</th>
                <th style="font-weight: bold; padding: 4px; text-align: left; background: #f9f9f9; border-bottom: 1px solid #ddd;">${t('customers.print.date')}</th>
                <th style="font-weight: bold; padding: 4px; text-align: right; background: #f9f9f9; border-bottom: 1px solid #ddd;">${t('customers.print.total')}</th>
                <th style="font-weight: bold; padding: 4px; text-align: right; background: #f9f9f9; border-bottom: 1px solid #ddd;">${t('customers.print.paid')}</th>
                <th style="font-weight: bold; padding: 4px; text-align: right; background: #f9f9f9; border-bottom: 1px solid #ddd;">${t('customers.print.due')}</th>
              </tr>
            </thead>
            <tbody>
              ${customerSales.map(sale => {
                  const due = sale.amount - sale.paidAmount;
                  return `
                <tr style="font-weight: bold; border-bottom: none;">
                  <td style="padding: 8px; text-align: left;">${sale.id}</td>
                  <td style="padding: 8px; text-align: left;">${sale.date}</td>
                  <td style="padding: 8px; text-align: right;">৳${sale.amount.toFixed(2)}</td>
                  <td style="padding: 8px; text-align: right;">৳${sale.paidAmount.toFixed(2)}</td>
                  <td style="padding: 8px; text-align: right;">৳${due.toFixed(2)}</td>
                </tr>
                <tr>
                  <td colspan="5" style="padding: 0 8px 15px 8px; border-bottom: 1px solid #eee;">
                    <table style="width: 95%; margin-left: 5%; font-size: 14px; line-height: 20px; text-align: left; border-collapse: collapse;">
                      <thead>
                        <tr>
                          <th style="font-weight: bold; padding: 4px; text-align: left; border-bottom: 1px solid #eee;">${t('customers.print.product')}</th>
                          <th style="font-weight: bold; padding: 4px; text-align: center; border-bottom: 1px solid #eee;">${t('customers.print.qty')}</th>
                          <th style="font-weight: bold; padding: 4px; text-align: right; border-bottom: 1px solid #eee;">${t('customers.print.price')}</th>
                          <th style="font-weight: bold; padding: 4px; text-align: right; border-bottom: 1px solid #eee;">${t('customers.print.subtotal')}</th>
                        </tr>
                      </thead>
                      <tbody>
                      ${sale.products.map(p => {
                          const product = inventory.find(inv => inv.id === p.productId);
                          return `
                            <tr>
                              <td style="padding: 4px;">${product?.name || 'N/A'}</td>
                              <td style="padding: 4px; text-align: center;">${p.quantity}</td>
                              <td style="padding: 4px; text-align: right;">৳${p.price.toFixed(2)}</td>
                              <td style="padding: 4px; text-align: right;">৳${(p.quantity * p.price).toFixed(2)}</td>
                            </tr>`
                      }).join('')}
                      </tbody>
                    </table>
                  </td>
                </tr>
              `}).join('')}
              ${customerSales.length === 0 ? `<tr><td colspan="5" style="text-align: center; padding: 8px;">${t('customers.print.noPurchaseHistory')}</td></tr>` : ''}
            </tbody>
          </table>
          <h2 style="margin-top: 30px;">${t('customers.print.paymentHistory')}</h2>
          <table style="width: 100%; line-height: inherit; text-align: left; border-collapse: collapse;">
            <thead>
              <tr>
                <th style="font-weight: bold; padding: 4px; text-align: left; background: #f9f9f9; border-bottom: 1px solid #ddd;">${t('customers.print.date')}</th>
                <th style="font-weight: bold; padding: 4px; text-align: left; background: #f9f9f9; border-bottom: 1px solid #ddd;">${t('customers.print.referenceId')}</th>
                <th style="font-weight: bold; padding: 4px; text-align: right; background: #f9f9f9; border-bottom: 1px solid #ddd;">${t('customers.print.amount')}</th>
              </tr>
            </thead>
            <tbody>
              ${customerPayments.map(payment => `
                <tr>
                  <td style="padding: 8px;">${payment.date}</td>
                  <td style="padding: 8px;">${payment.id}</td>
                  <td style="padding: 8px; text-align: right;">৳${payment.amount.toFixed(2)}</td>
                </tr>
              `).join('')}
              ${customerPayments.length === 0 ? `<tr><td colspan="3" style="text-align: center; padding: 8px;">${t('customers.print.noPaymentsRecorded')}</td></tr>` : ''}
            </tbody>
          </table>
        </div>
    `;
    document.body.appendChild(container);

    const contentToCapture = container.querySelector('.history-box') as HTMLElement;
    if (contentToCapture) {
      try {
        const canvas = await html2canvas(contentToCapture, { scale: 2 });
        const imgData = canvas.toDataURL('image/png');
        const pdf = new jsPDF('p', 'mm', 'a4');
        const pdfWidth = pdf.internal.pageSize.getWidth();
        const pdfHeight = pdf.internal.pageSize.getHeight();
        const imgHeight = canvas.height * pdfWidth / canvas.width;
        let heightLeft = imgHeight;
        let position = 0;

        pdf.addImage(imgData, 'PNG', 0, position, pdfWidth, imgHeight);
        heightLeft -= pdfHeight;

        while (heightLeft > 0) {
          position = -heightLeft;
          pdf.addPage();
          pdf.addImage(imgData, 'PNG', 0, position, pdfWidth, imgHeight);
          heightLeft -= pdfHeight;
        }
        
        pdf.save(`history-${customer.name.replace(/\s/g, '_')}.pdf`);
        toast({
          title: t('customers.toast.pdfDownloadedTitle'),
          description: t('customers.toast.pdfDownloadedDescription', { name: customer.name }),
        });
      } catch (err) {
        console.error("PDF generation error:", err);
        toast({
          title: t('customers.toast.pdfErrorTitle'),
          description: t('customers.toast.pdfErrorDescription'),
          variant: "destructive"
        });
      } finally {
        document.body.removeChild(container);
      }
    } else {
        document.body.removeChild(container);
    }
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const json: any[] = XLSX.utils.sheet_to_json(worksheet);

        if (json.length === 0) {
          toast({ variant: "destructive", title: t('customers.toast.importErrorEmpty'), description: "" });
          return;
        }

        const newCustomers = json.map(row => ({
            name: row.Name || row.name,
            phone: String(row.Phone || row.phone).trim(),
            address: row.Address || row.address,
        }));

        const existingPhones = new Set(customers.map(c => c.phone));
        const importedPhones = new Set<string>();
        let duplicateFound: string | null = null;

        for (const customer of newCustomers) {
            if (!customer.name || !customer.phone || !customer.address) {
                toast({ variant: "destructive", title: t('customers.toast.importErrorRow'), description: "" });
                return;
            }
            if (existingPhones.has(customer.phone)) {
                duplicateFound = customer.phone;
                break;
            }
            if (importedPhones.has(customer.phone)) {
                duplicateFound = customer.phone;
                break;
            }
            importedPhones.add(customer.phone);
        }

        if (duplicateFound) {
            toast({
                variant: "destructive",
                title: t('customers.toast.importErrorDuplicate', { phone: duplicateFound }),
                description: "",
            });
            return;
        }

        newCustomers.forEach(customer => {
            addCustomer(customer);
        });

        toast({
            title: t('customers.toast.importSuccessTitle'),
            description: t('customers.toast.importSuccessDescription', { count: newCustomers.length }),
        });
      } catch (error) {
        toast({
          variant: "destructive",
          title: t('customers.toast.importErrorProcessing'),
          description: "",
        });
        console.error("Import error:", error);
      } finally {
        if (fileInputRef.current) {
          fileInputRef.current.value = "";
        }
      }
    };
    reader.onerror = () => {
        toast({
            variant: "destructive",
            title: t('customers.toast.importErrorRead'),
            description: "",
        });
    }
    reader.readAsArrayBuffer(file);
  };
  
  const filteredAndSortedCustomers = React.useMemo(() => {
    return [...customers]
      .sort((a, b) => b.dueAmount - a.dueAmount)
      .filter(customer =>
        customer.name.toLowerCase().includes(filter.toLowerCase()) ||
        customer.phone.toLowerCase().includes(filter.toLowerCase())
      );
  }, [customers, filter]);

  const handleExport = () => {
    const worksheetData = filteredAndSortedCustomers.map(c => ({
        'Customer ID': c.id,
        'Name': c.name,
        'Phone': c.phone,
        'Address': c.address,
        'Last Purchase': c.lastPurchase,
        'Total Due (৳)': c.dueAmount.toFixed(2),
    }));
    const worksheet = XLSX.utils.json_to_sheet(worksheetData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Customers");
    XLSX.writeFile(workbook, "customer_list.xlsx");
    toast({
      title: t('customers.toast.exportSuccessTitle'),
      description: t('customers.toast.exportSuccessDescription'),
    });
  };

  const totalDueAmount = React.useMemo(() => {
    return customers.reduce((sum, customer) => sum + customer.dueAmount, 0);
  }, [customers]);

  return (
    <>
      <PageHeader title={t('customers.title')} description={t('customers.description')}>
        <div className="flex flex-col sm:flex-row gap-2">
          <Input
            placeholder={t('customers.filterPlaceholder')}
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="w-full sm:w-auto"
          />
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileUpload}
            accept=".xlsx, .xls"
            className="hidden"
          />
          <Button onClick={() => fileInputRef.current?.click()} variant="outline" className="w-full sm:w-auto">
            <FileUp className="mr-2 h-4 w-4" />
            {t('customers.import')}
          </Button>
          <Button onClick={handleExport} variant="outline" className="w-full sm:w-auto">
            <Download className="mr-2 h-4 w-4" />
            {t('customers.export')}
          </Button>
          <Dialog open={isAddEditDialogOpen} onOpenChange={setIsAddEditDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={() => setCustomerToEdit(null)} className="w-full sm:w-auto">
                <PlusCircle className="mr-2 h-4 w-4" /> {t('customers.addCustomer')}
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{customerToEdit ? t('customers.dialog.editTitle') : t('customers.dialog.addTitle')}</DialogTitle>
                <DialogDescription>
                  {customerToEdit ? t('customers.dialog.editDescription', {name: customerToEdit.name}) : t('customers.dialog.addDescription')}
                </DialogDescription>
              </DialogHeader>
              <Form {...addEditForm}>
                <form onSubmit={addEditForm.handleSubmit(onAddEditSubmit)} className="grid gap-4 py-4">
                  <FormField control={addEditForm.control} name="name" render={({ field }) => (
                    <FormItem><FormLabel>{t('customers.dialog.nameLabel')}</FormLabel><FormControl><Input placeholder={t('customers.dialog.namePlaceholder')} {...field} /></FormControl><FormMessage /></FormItem>
                  )} />
                  <FormField control={addEditForm.control} name="phone" render={({ field }) => (
                    <FormItem><FormLabel>{t('customers.dialog.phoneLabel')}</FormLabel><FormControl><Input placeholder={t('customers.dialog.phonePlaceholder')} {...field} /></FormControl><FormMessage /></FormItem>
                  )} />
                  <FormField control={addEditForm.control} name="address" render={({ field }) => (
                    <FormItem><FormLabel>{t('customers.dialog.addressLabel')}</FormLabel><FormControl><Textarea placeholder={t('customers.dialog.addressPlaceholder')} {...field} /></FormControl><FormMessage /></FormItem>
                  )} />
                  <DialogFooter>
                    <Button type="submit">{customerToEdit ? t('common.saveChanges') : t('customers.addCustomer')}</Button>
                  </DialogFooter>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        </div>
      </PageHeader>
      <Card>
        <CardHeader>
          <CardTitle>{t('customers.duesTitle')}</CardTitle>
          <CardDescription>
            {t('customers.duesDescription', { count: customers.length, totalDue: totalDueAmount.toFixed(2) })}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t('customers.table.name')}</TableHead>
                <TableHead>{t('customers.table.phone')}</TableHead>
                <TableHead>{t('customers.table.lastPurchase')}</TableHead>
                <TableHead className="text-right">{t('customers.table.dueAmount')}</TableHead>
                <TableHead>
                  <span className="sr-only">{t('common.actions')}</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredAndSortedCustomers.map((customer) => (
                <TableRow key={customer.id}>
                  <TableCell className="font-medium">{customer.name}</TableCell>
                  <TableCell>{customer.phone}</TableCell>
                  <TableCell>{customer.lastPurchase}</TableCell>
                  <TableCell className={`text-right font-semibold ${customer.dueAmount > 0.001 ? 'text-destructive' : ''}`}>{`৳${customer.dueAmount.toFixed(2)}`}</TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button aria-haspopup="true" size="icon" variant="ghost">
                          <MoreHorizontal className="h-4 w-4" />
                          <span className="sr-only">Toggle menu</span>
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuLabel>{t('common.actions')}</DropdownMenuLabel>
                        <DropdownMenuItem onClick={() => { setCustomerToView(customer); setIsViewDetailsDialogOpen(true); }}>{t('common.viewDetails')}</DropdownMenuItem>
                        <DropdownMenuItem onClick={() => { setCustomerToEdit(customer); setIsAddEditDialogOpen(true); }}>{t('common.edit')}</DropdownMenuItem>
                        <DropdownMenuItem onClick={() => { setCustomerToPay(customer); setIsRecordPaymentDialogOpen(true); }}>{t('common.recordPayment')}</DropdownMenuItem>
                        <DropdownMenuItem
                            onClick={() => setCustomerToSendSms(customer)}
                            disabled={customer.dueAmount <= 0.001}
                        >
                            <MessageSquare className="mr-2 h-4 w-4" />
                            {t('customers.sms.sendReminder')}
                        </DropdownMenuItem>
                        <DropdownMenuItem className="text-destructive" onClick={() => setCustomerToDelete(customer.id)}>{t('common.delete')}</DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* View Details Dialog */}
      <Dialog open={isViewDetailsDialogOpen} onOpenChange={setIsViewDetailsDialogOpen}>
        <DialogContent className="sm:max-w-4xl">
          <DialogHeader>
              <DialogTitle>{t('customers.detailsDialog.title')}</DialogTitle>
              <DialogDescription>
                  {t('customers.detailsDialog.description', { name: customerToView?.name, id: customerToView?.id })}
              </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                  <p><strong>{t('customers.detailsDialog.phone')}</strong> {customerToView?.phone}</p>
                  <p><strong>{t('customers.detailsDialog.address')}</strong> {customerToView?.address}</p>
                  <p><strong>{t('customers.detailsDialog.lastPurchase')}</strong> {customerToView?.lastPurchase}</p>
                  <p><strong>{t('customers.detailsDialog.dueSince')}</strong> {customerToView?.dueSince}</p>
              </div>
              <p><strong>{t('customers.detailsDialog.totalDue')}</strong> <span className="font-semibold text-destructive">{`৳${customerToView?.dueAmount.toFixed(2)}`}</span></p>
              
              <Separator />
              
              <Tabs defaultValue="purchases" className="w-full">
                <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="purchases">{t('customers.detailsDialog.purchasesTab')}</TabsTrigger>
                    <TabsTrigger value="payments">{t('customers.detailsDialog.paymentsTab')}</TabsTrigger>
                </TabsList>
                <TabsContent value="purchases">
                    <ScrollArea className="h-64 border rounded-md">
                        {sales.filter(sale => sale.customerId === customerToView?.id).length > 0 ? (
                        <>
                            <div className="grid grid-cols-5 w-full pr-8 pl-4 py-2 text-sm font-bold text-muted-foreground bg-muted">
                                <span className="col-span-1 text-left">{t('customers.detailsDialog.invoice')}</span>
                                <span className="col-span-1 text-left">{t('customers.detailsDialog.date')}</span>
                                <span className="col-span-1 text-right">{t('customers.detailsDialog.total')}</span>
                                <span className="col-span-1 text-right">{t('customers.detailsDialog.paid')}</span>
                                <span className="col-span-1 text-right">{t('customers.detailsDialog.due')}</span>
                            </div>
                            <Accordion type="multiple" className="w-full">
                            {sales
                                .filter(sale => sale.customerId === customerToView?.id)
                                .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                                .map(sale => (
                                <AccordionItem value={sale.id} key={sale.id}>
                                    <AccordionTrigger className="hover:no-underline px-4 py-2 text-sm">
                                    <div className="grid grid-cols-5 items-center w-full gap-2">
                                        <span className="col-span-1 text-left font-medium">{sale.id}</span>
                                        <span className="col-span-1 text-left text-muted-foreground">{sale.date}</span>
                                        <span className="col-span-1 text-right">{`৳${sale.amount.toFixed(2)}`}</span>
                                        <span className="col-span-1 text-right text-green-600">{`৳${sale.paidAmount.toFixed(2)}`}</span>
                                        <span className="col-span-1 text-right font-semibold">
                                        <Badge variant={(sale.amount - sale.paidAmount) > 0.001 ? 'destructive' : 'secondary'}>
                                            {`৳${(sale.amount - sale.paidAmount).toFixed(2)}`}
                                        </Badge>
                                        </span>
                                    </div>
                                    </AccordionTrigger>
                                    <AccordionContent>
                                    <Table>
                                        <TableHeader>
                                        <TableRow>
                                            <TableHead>{t('customers.detailsDialog.product')}</TableHead>
                                            <TableHead className="text-center">{t('customers.detailsDialog.qty')}</TableHead>
                                            <TableHead className="text-right">{t('customers.detailsDialog.price')}</TableHead>
                                            <TableHead className="text-right">{t('customers.detailsDialog.subtotal')}</TableHead>
                                        </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                        {sale.products.map((p, index) => {
                                            const productInfo = inventory.find(i => i.id === p.productId);
                                            return (
                                            <TableRow key={index}>
                                                <TableCell>{productInfo?.name || p.productId}</TableCell>
                                                <TableCell className="text-center">{p.quantity}</TableCell>
                                                <TableCell className="text-right">{`৳${p.price.toFixed(2)}`}</TableCell>
                                                <TableCell className="text-right font-medium">{`৳${(p.quantity * p.price).toFixed(2)}`}</TableCell>
                                            </TableRow>
                                            )
                                        })}
                                        </TableBody>
                                    </Table>
                                    </AccordionContent>
                                </AccordionItem>
                                ))}
                            </Accordion>
                        </>
                        ) : (
                        <div className="text-center text-muted-foreground py-4">{t('customers.detailsDialog.noPurchaseHistory')}</div>
                        )}
                    </ScrollArea>
                </TabsContent>
                <TabsContent value="payments">
                     <ScrollArea className="h-64 border rounded-md">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>{t('customers.detailsDialog.date')}</TableHead>
                                    <TableHead>{t('customers.detailsDialog.referenceId')}</TableHead>
                                    <TableHead className="text-right">{t('customers.detailsDialog.amount')}</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {payments
                                    .filter(p => p.customerId === customerToView?.id)
                                    .sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                                    .map(payment => (
                                        <TableRow key={payment.id}>
                                            <TableCell>{payment.date}</TableCell>
                                            <TableCell>{payment.id}</TableCell>
                                            <TableCell className="text-right font-medium text-green-600">{`৳${payment.amount.toFixed(2)}`}</TableCell>
                                        </TableRow>
                                    ))
                                }
                                {payments.filter(p => p.customerId === customerToView?.id).length === 0 && (
                                    <TableRow>
                                        <TableCell colSpan={3} className="text-center text-muted-foreground">{t('customers.detailsDialog.noPaymentHistory')}</TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                     </ScrollArea>
                </TabsContent>
              </Tabs>
          </div>
          <DialogFooter className="sm:justify-between">
              <div className="flex gap-2">
                <Button variant="secondary" onClick={() => { setCustomerToPay(customerToView); setIsRecordPaymentDialogOpen(true); }}>
                    {t('customers.detailsDialog.recordPayment')}
                </Button>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => handleDownloadPdf(customerToView)}>
                    <FileDown className="mr-2 h-4 w-4" />
                    {t('customers.detailsDialog.downloadPdf')}
                </Button>
                <Button variant="outline" onClick={() => handlePrintHistory(customerToView)}>
                    <FileText className="mr-2 h-4 w-4" />
                    {t('customers.detailsDialog.printHistory')}
                </Button>
                <Button onClick={() => setIsViewDetailsDialogOpen(false)}>{t('customers.detailsDialog.close')}</Button>
              </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Record Payment Dialog */}
      <Dialog open={isRecordPaymentDialogOpen} onOpenChange={setIsRecordPaymentDialogOpen}>
        <DialogContent>
            <DialogHeader>
                <DialogTitle>{t('customers.paymentDialog.title', { name: customerToPay?.name })}</DialogTitle>
                <DialogDescription dangerouslySetInnerHTML={{ __html: t('customers.paymentDialog.description', { due: customerToPay?.dueAmount.toFixed(2) ?? '0.00' }) }} />
            </DialogHeader>
            <Form {...paymentForm}>
                <form onSubmit={paymentForm.handleSubmit(onRecordPaymentSubmit)} className="grid gap-4 py-4">
                    <FormField control={paymentForm.control} name="amount" render={({ field }) => (
                        <FormItem><FormLabel>{t('customers.paymentDialog.amountLabel')}</FormLabel><FormControl><Input type="number" placeholder={t('customers.paymentDialog.amountPlaceholder')} {...field} /></FormControl><FormMessage /></FormItem>
                    )} />
                    <DialogFooter>
                        <Button type="submit">{t('common.recordPayment')}</Button>
                    </DialogFooter>
                </form>
            </Form>
        </DialogContent>
      </Dialog>
      
      {/* SMS Reminder Dialog */}
      <Dialog open={isSmsDialogOpen} onOpenChange={(open) => {
          if (!open) {
              setCustomerToSendSms(null);
          }
          setIsSmsDialogOpen(open);
      }}>
        <DialogContent>
            <DialogHeader>
                <DialogTitle>{t('customers.sms.dialogTitle', { name: customerToSendSms?.name ?? '' })}</DialogTitle>
                <DialogDescription>
                    {t('customers.sms.dialogDescription')}
                </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
                <div className="space-y-2">
                    <Label htmlFor="sms-message">{t('customers.sms.messageLabel')}</Label>
                    <Textarea
                        id="sms-message"
                        value={smsMessage}
                        onChange={(e) => setSmsMessage(e.target.value)}
                        rows={6}
                    />
                </div>
                <p className="text-sm text-muted-foreground">{t('customers.sms.simulationNotice')}</p>
            </div>
            <DialogFooter>
                <Button variant="outline" onClick={() => setIsSmsDialogOpen(false)}>{t('common.cancel')}</Button>
                <Button onClick={() => {
                    toast({
                        title: t('customers.toast.smsSentTitle'),
                        description: t('customers.toast.smsSentDescription', { name: customerToSendSms?.name ?? 'Customer' }),
                    });
                    setIsSmsDialogOpen(false);
                    setCustomerToSendSms(null);
                }}>{t('customers.sms.sendButton')}</Button>
            </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!customerToDelete} onOpenChange={(open) => !open && setCustomerToDelete(null)}>
        <AlertDialogContent>
            <AlertDialogHeader>
                <AlertDialogTitle>{t('customers.deleteDialog.title')}</AlertDialogTitle>
                <AlertDialogDescription>
                    {t('customers.deleteDialog.description')}
                </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
                <AlertDialogCancel onClick={() => setCustomerToDelete(null)}>{t('common.cancel')}</AlertDialogCancel>
                <AlertDialogAction onClick={confirmDelete}>{t('common.continue')}</AlertDialogAction>
            </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
