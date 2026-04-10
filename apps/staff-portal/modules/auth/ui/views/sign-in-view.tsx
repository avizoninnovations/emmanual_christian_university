"use client";

import { useRouter } from "next/navigation";
import Image from "next/image";
import { Eye, EyeOff, X } from "lucide-react";
import { Button } from "@workspace/ui/components/button";
import { Input } from "@workspace/ui/components/input";
import { Label } from "@workspace/ui/components/label";
import { Card } from "@workspace/ui/components/card";
import { cn } from "@workspace/ui/lib/utils";
import { authClient } from "@/lib/auth-client";
import { toast } from "sonner";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Form, FormControl, FormField, FormItem, FormMessage } from "@workspace/ui/components/form";
import { Loader2 } from "lucide-react";
import { startOfWeek, addDays, format, isToday } from "date-fns";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { useQuery } from "convex/react";
import { api } from "@workspace/backend/_generated/api";

const authSchema = z.object({
  email: z.string().email({ message: "Please enter a valid email address" }),
  password: z.string().min(6, { message: "Password must be at least 6 characters" }),
});

export const SignInView = () => {
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [weekDays, setWeekDays] = useState<Date[]>([]);
  const [currentTime, setCurrentTime] = useState<Date | null>(null);
  
  const stats = useQuery(api.system.getPublicStats);

  useEffect(() => {
    // Intercept forced logouts
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const err = params.get("error");
      
      if (err === "inactive") {
        toast.error("Account Inactive", { 
          description: "Your staff account has been deactivated. Please contact an administrator." 
        });
        window.history.replaceState({}, '', '/sign-in');
      } else if (err === "banned") {
        toast.error("Account Suspended", { 
          description: "Your account is currently banned from accessing the system." 
        });
        window.history.replaceState({}, '', '/sign-in');
      }
    }

    const today = new Date();
    const weekStart = startOfWeek(today, { weekStartsOn: 0 }); // Sunday
    setWeekDays(Array.from({ length: 7 }).map((_, i) => addDays(weekStart, i)));
    
    // Set initial time and start interval for the live clock
    setCurrentTime(new Date());
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const form = useForm<z.infer<typeof authSchema>>({
    resolver: zodResolver(authSchema),
    defaultValues: { email: "", password: "" },
  });

  const handleSignIn = async (values: z.infer<typeof authSchema>) => {
    setIsLoading(true);
    try {
      const response = await authClient.signIn.email({
        email: values.email,
        password: values.password,
      });

      if (response.error) {
        toast.error(response.error.message || "Failed to sign in. Please check your credentials.");
      } else {
        toast.success("Welcome back!");
        router.push("/");
      }
    } catch (err: any) {
      toast.error("An unexpected error occurred: " + (err.message || "Unknown error"));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 font-sans relative">
      {/* Background Image (ECU Flag) */}
      <div className="absolute inset-0 z-0">
        <Image 
          src="/ecu-flag.jpg" 
          alt="ECU Background Flag" 
          fill 
          className="object-cover opacity-80"
          priority
        />
        <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" /> 
      </div>

      <div className="z-10 w-full max-w-5xl bg-muted/50 rounded-[40px] shadow-2xl overflow-hidden flex flex-col md:flex-row min-h-[600px] border border-white/20">
        {/* Left Section: Form */}
        <div className="flex-[0.9] p-8 md:p-12 flex flex-col justify-between relative bg-card">
          <div>
            <div className="inline-flex items-center px-6 py-2 border border-input rounded-full mb-10">
              <span className="text-lg font-semibold text-foreground">ECU Staff</span>
            </div>

            <div className="max-w-sm mx-auto md:mx-0">
              <h1 className="text-4xl font-bold text-foreground mb-2">Welcome back</h1>
              <p className="text-muted-foreground mb-8">Sign in to your administrative account</p>

              <Form {...form}>
                <form className="space-y-6" onSubmit={form.handleSubmit(handleSignIn)}>
                  
                  <FormField control={form.control} name="email" render={({ field }) => (
                    <FormItem className="space-y-2">
                       <Label className="text-foreground font-semibold">Email Address</Label>
                       <FormControl>
                         <Input 
                           type="email"
                           placeholder="staff@ecu.edu" 
                           className="h-14 bg-background border border-input shadow-sm rounded-2xl px-6 text-foreground placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-primary focus-visible:border-primary transition-all"
                           {...field}
                         />
                       </FormControl>
                       <FormMessage />
                    </FormItem>
                  )} />

                  <FormField control={form.control} name="password" render={({ field }) => (
                    <FormItem className="space-y-2">
                      <Label className="text-foreground font-semibold">Password</Label>
                      <FormControl>
                        <div className="relative">
                          <Input 
                            type={showPassword ? "text" : "password"}
                            placeholder="••••••••••••••••" 
                            className="h-14 bg-background border border-input shadow-sm rounded-2xl px-6 pr-12 text-foreground placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-primary focus-visible:border-primary transition-all"
                            {...field}
                          />
                          <button 
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                          >
                            {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                          </button>
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />

                  <Button 
                    type="submit" 
                    className="w-full h-14 bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-lg rounded-2xl shadow-lg transition-all active:scale-[0.98]"
                    disabled={isLoading}
                  >
                    {isLoading && <Loader2 className="mr-2 h-5 w-5 animate-spin" />}
                    Log In
                  </Button>
                </form>
              </Form>
            </div>
          </div>
        </div>

        {/* Right Section: Visual Panel */}
        <div className="flex-[1.1] relative p-6 hidden md:block bg-muted/50">
          <div className="relative h-full w-full rounded-[32px] overflow-hidden">
            {/* Background Image (login-page.jpg) */}
            <Image 
              src="/login-page.jpg" 
              alt="ECU Login Visual"
              fill
              className="absolute inset-0 w-full h-full object-cover"
              priority
            />
            
            {/* Overlay Elements */}
            <div className="absolute inset-0 bg-black/10 backdrop-blur-[2px]" />

            {/* Custom Edge Cutout (Empty Tab) */}
            <div className="absolute top-0 right-0 w-[72px] h-[72px] bg-muted/50 rounded-bl-[32px] z-30 flex items-center justify-center">
              {/* Left blending curve */}
              <div className="absolute top-0 -left-[28px] w-[28px] h-[28px]">
                <svg width="28" height="28" viewBox="0 0 30 30" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M0 0H30V30C30 13.4315 16.5685 0 0 0Z" className="fill-muted/50" />
                </svg>
              </div>
              {/* Bottom blending curve */}
              <div className="absolute -bottom-[28px] right-0 w-[28px] h-[28px]">
                <svg width="28" height="28" viewBox="0 0 30 30" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M0 0H30V30C30 13.4315 16.5685 0 0 0Z" className="fill-muted/50" />
                </svg>
              </div>
            </div>

            {/* Floating Cards */}
            <div className="absolute top-12 left-12 z-10 transition-all duration-300 hover:translate-x-2">
              <Card className="bg-[#FFD66B] dark:bg-yellow-500/90 border-none p-4 rounded-2xl shadow-xl w-48">
                <div className="flex items-center gap-2 mb-1">
                  <div className="w-2 h-2 rounded-full bg-gray-800 dark:bg-gray-100" />
                  <p className="text-[10px] font-bold text-gray-800 dark:text-gray-100 uppercase tracking-wider">Active Term</p>
                </div>
                <p className="text-[10px] text-gray-600 dark:text-gray-200">{stats ? stats.currentPeriod : "Loading..."}</p>
              </Card>
              <Card className="bg-black/60 backdrop-blur-md border-none p-4 rounded-2xl shadow-xl w-48 mt-2 ml-8">
                <div className="flex items-center gap-2 mb-1">
                  <div className="w-2 h-2 rounded-full bg-yellow-400" />
                  <p className="text-[10px] font-bold text-white uppercase tracking-wider">Programs Offered</p>
                </div>
                <p className="text-[10px] text-white/80">{stats?.activePrograms !== undefined ? `${stats.activePrograms} Active Programs` : "Loading..."}</p>
              </Card>
            </div>

            {/* Calendar Overlay */}
            <div className="absolute bottom-40 left-1/2 -translate-x-1/2 z-10 w-[80%] transition-transform hover:-translate-y-2 duration-300">
              <div className="bg-white/20 backdrop-blur-xl border border-white/30 rounded-[2rem] p-6 shadow-2xl">
                <div className="flex justify-between items-center mb-4">
                  {weekDays.length > 0 ? (
                    weekDays.map((date, i) => {
                      const isCurrentDay = isToday(date);
                      return (
                        <div key={i} className="text-center">
                          <p className="text-[10px] text-white/90 font-medium uppercase mb-1 drop-shadow-md">
                            {format(date, 'EEE')}
                          </p>
                          <p className={cn(
                            "text-lg font-extrabold text-white drop-shadow-md transition-all duration-300",
                            isCurrentDay && "bg-white/30 backdrop-blur-md rounded-xl px-2 py-1 shadow-inner border border-white/40 scale-110"
                          )}>
                            {format(date, 'd')}
                          </p>
                        </div>
                      );
                    })
                  ) : (
                    // Skeleton/ssr placeholder
                    Array.from({ length: 7 }).map((_, i) => (
                      <div key={i} className="w-8 h-10 animate-pulse bg-white/10 rounded-lg"></div>
                    ))
                  )}
                </div>
                <div className="h-10 w-full bg-white/20 rounded-xl relative overflow-hidden border border-white/10">
                  <div className="absolute inset-0 opacity-30" style={{ backgroundImage: 'repeating-linear-gradient(45deg, #fff 0, #fff 1px, transparent 0, transparent 50%)', backgroundSize: '10px 10px' }} />
                </div>
              </div>
            </div>

            {/* Daily Meeting Card */}
            <div className="absolute bottom-12 left-12 z-10 hover:scale-105 transition-transform duration-300">
              <Card className="bg-card/95 backdrop-blur-sm border-none p-5 rounded-3xl shadow-2xl w-56">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                  <p className="text-[11px] font-bold text-foreground">Faculty Overview</p>
                </div>
                <p className="text-[10px] text-muted-foreground mb-4 font-medium">{stats?.activeFaculties !== undefined ? `${stats.activeFaculties} Total Faculties Online` : "Loading..."}</p>
                <div className="flex -space-x-3">
                  <div className="w-8 h-8 rounded-full border-2 border-background bg-blue-100 dark:bg-blue-900 flex items-center justify-center text-[10px] font-bold text-blue-700 dark:text-blue-200">TRS</div>
                  <div className="w-8 h-8 rounded-full border-2 border-background bg-green-100 dark:bg-green-900 flex items-center justify-center text-[10px] font-bold text-green-700 dark:text-green-200">BMA</div>
                  <div className="w-8 h-8 rounded-full border-2 border-background bg-orange-100 dark:bg-orange-900 flex items-center justify-center text-[10px] font-bold text-orange-700 dark:text-orange-200">SCT</div>
                </div>
              </Card>
            </div>

            {/* Floating Live Clock */}
            <div className="absolute top-1/2 right-12 z-10 flex flex-col gap-4 animate-[bounce_5s_infinite]">
              {/* Hours */}
              <div className="w-12 h-12 rounded-full border-2 border-white dark:border-white/20 shadow-lg bg-pink-100/90 dark:bg-pink-900/40 flex flex-col items-center justify-center font-extrabold text-sm text-pink-700 dark:text-pink-300 backdrop-blur-sm">
                <span>{currentTime ? format(currentTime, 'HH') : '00'}</span>
                <span className="text-[6px] tracking-widest uppercase opacity-70 dark:opacity-60 -mt-1 font-bold">HR</span>
              </div>
              {/* Minutes */}
              <div className="w-16 h-16 rounded-full border-4 border-white dark:border-white/20 shadow-xl ml-6 bg-indigo-100/90 dark:bg-indigo-900/40 flex flex-col items-center justify-center font-extrabold text-lg text-indigo-700 dark:text-indigo-300 backdrop-blur-sm">
                <span>{currentTime ? format(currentTime, 'mm') : '00'}</span>
                <span className="text-[7px] tracking-widest uppercase opacity-70 dark:opacity-60 -mt-1 font-bold">MIN</span>
              </div>
              {/* Seconds */}
              <div className="w-10 h-10 rounded-full border-2 border-white dark:border-white/20 shadow-lg bg-teal-100/90 dark:bg-teal-900/40 flex flex-col items-center justify-center font-extrabold text-xs text-teal-700 dark:text-teal-300 backdrop-blur-sm">
                <span>{currentTime ? format(currentTime, 'ss') : '00'}</span>
                <span className="text-[5px] tracking-widest uppercase opacity-70 dark:opacity-60 -mt-[2px] font-bold">SEC</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};