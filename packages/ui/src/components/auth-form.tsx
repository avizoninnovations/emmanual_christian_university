"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Loader2, Mail, Lock, User } from "lucide-react";

import { Button } from "./button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "./form";
import { Input } from "./input";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "./card";

const authSchema = z.object({
  email: z.string().email({ message: "Please enter a valid email address" }),
  password: z.string().min(6, { message: "Password must be at least 6 characters" }),
  name: z.string().min(2, { message: "Name must be at least 2 characters" }).optional(),
});

type AuthFormValues = z.infer<typeof authSchema>;

interface AuthFormProps {
  type: "sign-in" | "sign-up";
  onSubmit: (values: AuthFormValues) => Promise<void>;
  isLoading?: boolean;
  title: string;
  description: string;
}

export function AuthForm({ type, onSubmit, isLoading, title, description }: AuthFormProps) {
  const form = useForm<AuthFormValues>({
    resolver: zodResolver(authSchema),
    defaultValues: {
      email: "",
      password: "",
      name: "",
    },
  });

  return (
    <Card className="w-full max-w-md mx-auto shadow-2xl border-primary/5 bg-background/60 backdrop-blur-xl">
      <CardHeader className="space-y-2 text-center">
        <CardTitle className="text-3xl font-bold tracking-tight bg-gradient-to-br from-foreground to-foreground/70 bg-clip-text text-transparent">
          {title}
        </CardTitle>
        <CardDescription className="text-muted-foreground/80 text-base">
          {description}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
            {type === "sign-up" && (
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Full Name</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <User className="absolute left-3 top-2.5 h-5 w-5 text-muted-foreground/50" />
                        <Input placeholder="John Doe" className="pl-10 h-11 bg-muted/30 border-muted-foreground/10 focus:border-primary/30 transition-all" {...field} />
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email Address</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <Mail className="absolute left-3 top-2.5 h-5 w-5 text-muted-foreground/50" />
                      <Input placeholder="name@example.com" type="email" className="pl-10 h-11 bg-muted/30 border-muted-foreground/10 focus:border-primary/30 transition-all" {...field} />
                    </div>
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
                  <FormLabel>Password</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <Lock className="absolute left-3 top-2.5 h-5 w-5 text-muted-foreground/50" />
                      <Input placeholder="••••••••" type="password" className="pl-10 h-11 bg-muted/30 border-muted-foreground/10 focus:border-primary/30 transition-all" {...field} />
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button type="submit" className="w-full h-12 text-lg font-semibold shadow-lg shadow-primary/20 hover:shadow-primary/30 transition-all active:scale-[0.98]" disabled={isLoading}>
              {isLoading && <Loader2 className="mr-2 h-5 w-5 animate-spin" />}
              {type === "sign-in" ? "Log In" : "Create Account"}
            </Button>
          </form>
        </Form>
      </CardContent>
      <CardFooter className="flex justify-center border-t border-muted/50 pt-6">
        <p className="text-sm text-muted-foreground">
          {type === "sign-in" ? (
            <>
              Don&apos;t have an account?{" "}
              <a href="/sign-up" className="text-primary font-medium hover:underline underline-offset-4 decoration-primary/30">
                Sign up instead
              </a>
            </>
          ) : (
            <>
              Already have an account?{" "}
              <a href="/sign-in" className="text-primary font-medium hover:underline underline-offset-4 decoration-primary/30">
                Sign in instead
              </a>
            </>
          )}
        </p>
      </CardFooter>
    </Card>
  );
}
