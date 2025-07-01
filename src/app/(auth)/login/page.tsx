
"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { useAppContext } from "@/context/AppContext";
import { Logo } from "@/components/logo";
import { useLanguage } from "@/context/LanguageContext";

const loginFormSchema = z.object({
  email: z.string().email({ message: "Please enter a valid email address." }),
  password: z.string().min(1, { message: "Password is required." }),
});

export default function LoginPage() {
  const { login } = useAppContext();
  const { toast } = useToast();
  const router = useRouter();
  const { t } = useLanguage();

  const form = useForm<z.infer<typeof loginFormSchema>>({
    resolver: zodResolver(loginFormSchema),
    defaultValues: {
      email: "owner@nirobmill.com",
      password: "password",
    },
  });

  function onSubmit(values: z.infer<typeof loginFormSchema>) {
    const success = login(values.email, values.password);
    if (success) {
      toast({
        title: t("login.toast.successTitle"),
        description: t("login.toast.successDescription"),
      });
      router.push("/dashboard");
    } else {
      toast({
        variant: "destructive",
        title: t("login.toast.errorTitle"),
        description: t("login.toast.errorDescription"),
      });
      form.setValue("password", "");
    }
  }

  return (
    <Card className="w-full max-w-sm">
      <CardHeader className="text-center">
        <div className="mx-auto">
          <Logo />
        </div>
        <CardTitle className="mt-4 text-2xl">{t('login.title')}</CardTitle>
        <CardDescription>
          {t('login.description')}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('login.emailLabel')}</FormLabel>
                  <FormControl>
                    <Input placeholder="owner@nirobmill.com" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('login.passwordLabel')}</FormLabel>
                  <FormControl>
                    <Input type="password" placeholder="••••••••" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button type="submit" className="w-full">
              {t('login.button')}
            </Button>
          </form>
        </Form>
      </CardContent>
       <CardFooter>
          <p className="text-xs text-center text-muted-foreground w-full">
              {t('login.footer')}
          </p>
      </CardFooter>
    </Card>
  );
}
