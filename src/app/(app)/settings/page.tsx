
"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { PageHeader } from "@/components/page-header";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useAppContext } from "@/context/AppContext";
import { useToast } from "@/hooks/use-toast";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { MoreHorizontal, Trash2 } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import type { User } from "@/lib/data";


const shopInfoFormSchema = z.object({
  name: z.string().min(2, { message: "Shop name must be at least 2 characters." }).max(20, { message: "Shop name must be 20 characters or less." }),
  address: z.string().min(5, { message: "Address must be at least 5 characters." }),
  contact: z.string().min(5, { message: "Contact info must be at least 5 characters." }),
  logo: z.string().nullable(),
});

const addUserFormSchema = z.object({
  email: z.string().email({ message: "Please enter a valid email." }),
  password: z.string().min(6, { message: "Password must be at least 6 characters." }),
});

const changePasswordFormSchema = z.object({
  password: z.string().min(6, { message: "Password must be at least 6 characters." }),
});

function ShopInfoTab() {
  const { shopInfo, updateShopInfo } = useAppContext();
  const { toast } = useToast();

  const form = useForm<z.infer<typeof shopInfoFormSchema>>({
    resolver: zodResolver(shopInfoFormSchema),
    defaultValues: shopInfo,
  });

  React.useEffect(() => {
    form.reset(shopInfo);
  }, [shopInfo, form]);

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        form.setValue("logo", reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  function onSubmit(values: z.infer<typeof shopInfoFormSchema>) {
    updateShopInfo(values);
    toast({
      title: "Settings Saved",
      description: "Your shop information has been updated.",
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Shop Information</CardTitle>
        <CardDescription>This information will appear on your invoices and app header.</CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="logo"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Shop Logo</FormLabel>
                  <div className="flex items-center gap-4">
                    <Avatar className="h-20 w-20">
                      <AvatarImage src={field.value ?? undefined} alt="Shop Logo" />
                      <AvatarFallback>{shopInfo.name.charAt(0)}</AvatarFallback>
                    </Avatar>
                    <div className="flex flex-col gap-2">
                        <FormControl>
                            <Input type="file" accept="image/*" onChange={handleLogoChange} className="w-full sm:w-auto" />
                        </FormControl>
                        {field.value && (
                            <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                className="text-destructive hover:bg-destructive/10 justify-start px-2 w-fit"
                                onClick={() => form.setValue("logo", null)}
                            >
                                <Trash2 className="mr-2 h-4 w-4" />
                                Remove Logo
                            </Button>
                        )}
                    </div>
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Shop Name</FormLabel>
                  <FormControl><Input placeholder="Your Shop Name" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="address"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Shop Address</FormLabel>
                  <FormControl><Textarea placeholder="Your Shop Address" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="contact"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Contact Info</FormLabel>
                  <FormControl><Input placeholder="Phone, Email, etc." {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button type="submit">Save Changes</Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}


function UserManagementTab() {
  const { users, currentUser, addUser, updateUserPassword, deleteUser } = useAppContext();
  const { toast } = useToast();

  const [isAddUserOpen, setIsAddUserOpen] = React.useState(false);
  const [isChangePasswordOpen, setIsChangePasswordOpen] = React.useState(false);
  const [userToEdit, setUserToEdit] = React.useState<User | null>(null);
  const [userToDelete, setUserToDelete] = React.useState<User | null>(null);

  const addUserForm = useForm<z.infer<typeof addUserFormSchema>>({
    resolver: zodResolver(addUserFormSchema),
    defaultValues: { email: "", password: "" },
  });

  const changePasswordForm = useForm<z.infer<typeof changePasswordFormSchema>>({
    resolver: zodResolver(changePasswordFormSchema),
    defaultValues: { password: "" },
  });

  const onAddUserSubmit = (values: z.infer<typeof addUserFormSchema>) => {
    const result = addUser(values);
    if (result.success) {
      toast({ title: "User Created", description: `User with email ${values.email} has been created.` });
      setIsAddUserOpen(false);
      addUserForm.reset();
    } else {
      addUserForm.setError("email", { type: "manual", message: result.message });
    }
  };
  
  const onChangePasswordSubmit = (values: z.infer<typeof changePasswordFormSchema>) => {
    if (userToEdit) {
      updateUserPassword(userToEdit.id, values.password);
      toast({ title: "Password Changed", description: `Password for ${userToEdit.email} has been updated.` });
      setIsChangePasswordOpen(false);
      setUserToEdit(null);
      changePasswordForm.reset();
    }
  };

  const confirmDeleteUser = () => {
    if (userToDelete) {
      deleteUser(userToDelete.id);
      toast({ variant: "destructive", title: "User Deleted", description: `User ${userToDelete.email} has been deleted.` });
      setUserToDelete(null);
    }
  };

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>User Management</CardTitle>
          <CardDescription>
            Add, edit, or remove users who can access this system. 
            <br />
            <strong className="text-destructive">Note:</strong> An email-based password recovery system requires a server backend, which is not available in this local setup. As an administrator, you can change passwords for other users here.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Email</TableHead>
                <TableHead>Role</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map((user) => (
                <TableRow key={user.id}>
                  <TableCell className="font-medium">{user.email}</TableCell>
                  <TableCell>{user.email === 'owner@nirobmill.com' ? 'Administrator' : 'User'}</TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" disabled={currentUser?.id === user.id || users.length <= 1}>
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuLabel>Actions</DropdownMenuLabel>
                        <DropdownMenuItem onClick={() => { setUserToEdit(user); setIsChangePasswordOpen(true); }}>
                          Change Password
                        </DropdownMenuItem>
                        <DropdownMenuItem className="text-destructive" onClick={() => setUserToDelete(user)}>
                          <Trash2 className="mr-2 h-4 w-4" />
                          Delete User
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
        <CardFooter>
          <Dialog open={isAddUserOpen} onOpenChange={setIsAddUserOpen}>
            <DialogTrigger asChild>
              <Button>Add New User</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create a New User</DialogTitle>
                <DialogDescription>Enter the new user's email and a temporary password.</DialogDescription>
              </DialogHeader>
              <Form {...addUserForm}>
                <form onSubmit={addUserForm.handleSubmit(onAddUserSubmit)} className="space-y-4">
                  <FormField control={addUserForm.control} name="email" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email Address</FormLabel>
                      <FormControl><Input type="email" placeholder="user@example.com" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={addUserForm.control} name="password" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Password</FormLabel>
                      <FormControl><Input type="password" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <DialogFooter>
                    <Button type="submit">Create User</Button>
                  </DialogFooter>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        </CardFooter>
      </Card>

      {/* Change Password Dialog */}
      <Dialog open={isChangePasswordOpen} onOpenChange={setIsChangePasswordOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Change Password</DialogTitle>
            <DialogDescription>Set a new password for {userToEdit?.email}.</DialogDescription>
          </DialogHeader>
          <Form {...changePasswordForm}>
            <form onSubmit={changePasswordForm.handleSubmit(onChangePasswordSubmit)} className="space-y-4">
              <FormField control={changePasswordForm.control} name="password" render={({ field }) => (
                <FormItem>
                  <FormLabel>New Password</FormLabel>
                  <FormControl><Input type="password" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <DialogFooter>
                <Button type="submit">Save New Password</Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
      
      {/* Delete User Dialog */}
      <AlertDialog open={!!userToDelete} onOpenChange={() => setUserToDelete(null)}>
          <AlertDialogContent>
              <AlertDialogHeader>
                  <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                  <AlertDialogDescription>
                      This will permanently delete the user <span className="font-bold">{userToDelete?.email}</span>. This action cannot be undone.
                  </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={confirmDeleteUser}>Delete User</AlertDialogAction>
              </AlertDialogFooter>
          </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

export default function SettingsPage() {
  return (
    <>
      <PageHeader title="Settings" description="Configure your shop details, user accounts, and application preferences." />
      <Tabs defaultValue="shop" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="shop">Shop Information</TabsTrigger>
          <TabsTrigger value="users">User Management</TabsTrigger>
        </TabsList>
        <TabsContent value="shop" className="mt-4">
          <ShopInfoTab />
        </TabsContent>
        <TabsContent value="users" className="mt-4">
          <UserManagementTab />
        </TabsContent>
      </Tabs>
    </>
  );
}
