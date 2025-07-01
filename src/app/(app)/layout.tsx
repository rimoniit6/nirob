
"use client";

import * as React from "react";
import { usePathname, useRouter } from "next/navigation";
import {
  BarChartHorizontal,
  LayoutGrid,
  Package,
  Settings,
  ShoppingCart,
  Truck,
  Users,
  LogOut,
  Sun,
  Moon,
  Laptop,
  Languages,
  UserCog
} from "lucide-react";
import { useTheme } from "next-themes";

import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarInset,
  SidebarFooter,
  useSidebar,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { Logo } from "@/components/logo";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { useAppContext } from "@/context/AppContext";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuPortal,
} from "@/components/ui/dropdown-menu";
import { useLanguage } from "@/context/LanguageContext";


export default function AppLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { currentUser, isAuthenticated, logout, isLoaded } = useAppContext();
  const router = useRouter();
  const { language, setLanguage, t } = useLanguage();
  const { setTheme } = useTheme();

  const menuItems = [
    { href: "/dashboard", label: t('sidebar.dashboard'), icon: LayoutGrid },
    { href: "/sales", label: t('sidebar.sales'), icon: ShoppingCart },
    { href: "/purchases", label: t('sidebar.purchases'), icon: Truck },
    { href: "/inventory", label: t('sidebar.inventory'), icon: Package },
    { href: "/customers", label: t('sidebar.customers'), icon: Users },
    { href: "/reports", label: t('sidebar.reports'), icon: BarChartHorizontal },
    { href: "/settings", label: t('sidebar.settings'), icon: Settings },
  ];

  React.useEffect(() => {
    if (isLoaded && !isAuthenticated) {
        router.replace('/login');
    }
  }, [isAuthenticated, isLoaded, router]);

  if (!isLoaded || !isAuthenticated) {
    return null; 
  }

  function MobileHeader() {
    const { toggleSidebar } = useSidebar();
    return (
      <header className="p-4 md:p-6 lg:p-2 sticky top-0 bg-background/80 backdrop-blur-sm z-10 md:hidden">
        <div className="flex justify-between items-center">
          <Logo className="text-primary" />
          <Button variant="ghost" size="icon" onClick={toggleSidebar}>
            <LayoutGrid />
          </Button>
        </div>
      </header>
    );
  }

  return (
    <SidebarProvider>
      <Sidebar side="left" collapsible="icon" className="border-r">
        <SidebarHeader className="flex flex-row items-center group-data-[state=expanded]:justify-between group-data-[state=collapsed]:justify-center">
          <Logo className="group-data-[state=collapsed]:hidden" />
          <SidebarTrigger className="hidden md:flex" />
        </SidebarHeader>
        <SidebarContent className="group-data-[state=collapsed]:hidden">
          <SidebarMenu>
            {menuItems.map((item) => (
              <SidebarMenuItem key={item.href}>
                <SidebarMenuButton
                  asChild
                  isActive={pathname === item.href}
                  tooltip={item.label}
                >
                  <a href={item.href}>
                    <item.icon />
                    <span>{item.label}</span>
                  </a>
                </SidebarMenuButton>
              </SidebarMenuItem>
            ))}
          </SidebarMenu>
        </SidebarContent>
        <SidebarFooter className="group-data-[state=collapsed]:hidden">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                  <div className="flex items-center gap-3 p-2 rounded-md bg-muted/50 cursor-pointer hover:bg-muted w-full">
                      <Avatar className="h-10 w-10">
                          <AvatarImage src="https://placehold.co/40x40.png" alt="Shop Owner" data-ai-hint="person portrait" />
                          <AvatarFallback>{currentUser?.email.charAt(0).toUpperCase()}</AvatarFallback>
                      </Avatar>
                      <div className="flex flex-col overflow-hidden text-left">
                          <span className="font-semibold truncate">{currentUser?.email === 'owner@nirobmill.com' ? t('userMenu.shopOwner') : 'User'}</span>
                          <span className="text-xs text-muted-foreground truncate">{currentUser?.email}</span>
                      </div>
                  </div>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuLabel>{t('userMenu.myAccount')}</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuSub>
                    <DropdownMenuSubTrigger>
                      <Sun className="h-4 w-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
                      <Moon className="absolute h-4 w-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
                      <span className="ml-2">{t('userMenu.theme')}</span>
                    </DropdownMenuSubTrigger>
                    <DropdownMenuPortal>
                      <DropdownMenuSubContent>
                        <DropdownMenuItem onClick={() => setTheme("light")}>{t('userMenu.light')}</DropdownMenuItem>
                        <DropdownMenuItem onClick={() => setTheme("dark")}>{t('userMenu.dark')}</DropdownMenuItem>
                        <DropdownMenuItem onClick={() => setTheme("system")}>{t('userMenu.system')}</DropdownMenuItem>
                      </DropdownMenuSubContent>
                    </DropdownMenuPortal>
                  </DropdownMenuSub>
                   <DropdownMenuSub>
                    <DropdownMenuSubTrigger>
                      <Languages className="mr-2 h-4 w-4" />
                      <span>{t('userMenu.language')}</span>
                    </DropdownMenuSubTrigger>
                    <DropdownMenuPortal>
                      <DropdownMenuSubContent>
                        <DropdownMenuItem onClick={() => setLanguage("en")} disabled={language === 'en'}>{t('userMenu.english')}</DropdownMenuItem>
                        <DropdownMenuItem onClick={() => setLanguage("bn")} disabled={language === 'bn'}>{t('userMenu.bengali')}</DropdownMenuItem>
                      </DropdownMenuSubContent>
                    </DropdownMenuPortal>
                  </DropdownMenuSub>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={logout}>
                      <LogOut className="mr-2 h-4 w-4" />
                      <span>{t('userMenu.logout')}</span>
                  </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
        </SidebarFooter>
      </Sidebar>
      <SidebarInset>
        <MobileHeader />
        <main className="p-4 md:p-6 lg:p-8">
            {children}
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}
