"use client";

import { useEffect, useState, type FormEvent } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { ArrowLeft, ArrowRight, Eye, EyeOff, LockKeyhole, Mail, LoaderCircle } from "lucide-react";
import { Button } from "@workspace/ui/components/button";
import { Input } from "@workspace/ui/components/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@workspace/ui/components/form";
import { getUserFacingErrorMessage } from "@workspace/ui/lib/error-message";
import { authClient } from "@/lib/auth-client";

const signInSchema = z.object({
  email: z.string().email("Enter a valid staff email address."),
  password: z.string().min(1, "Enter your password to continue."),
});

type SignInValues = z.infer<typeof signInSchema>;

export const SignInView = () => {
  const router = useRouter();
  const [step, setStep] = useState<"email" | "password">("email");
  const [showPassword, setShowPassword] = useState(false);
  const form = useForm<SignInValues>({
    resolver: zodResolver(signInSchema),
    defaultValues: { email: "", password: "" },
  });

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const error = params.get("error");
    if (error === "inactive") {
      toast.error("Account inactive", { description: "Contact an administrator to restore staff access." });
    } else if (error === "banned") {
      toast.error("Account suspended", { description: "Contact the university ICT office for assistance." });
    }
    if (error === "inactive" || error === "banned") window.history.replaceState({}, "", "/sign-in");
  }, []);

  const continueToPassword = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (await form.trigger("email")) setStep("password");
  };

  const handleSignIn = async (values: SignInValues) => {
    try {
      const { error } = await authClient.signIn.email({ email: values.email, password: values.password });
      if (error) {
        toast.error(getUserFacingErrorMessage(error, "Sign-in failed. Check your staff account details."));
        return;
      }
      toast.success("Welcome to the staff portal.");
      router.push("/");
    } catch (error) {
      toast.error(getUserFacingErrorMessage(error, "Unable to sign in right now. Please try again."));
    }
  };

  return (
    <main className="relative flex min-h-svh w-full items-center justify-center overflow-hidden px-4 py-20 sm:px-8">
      <div className="absolute inset-0 scale-[1.025] bg-cover bg-center blur-[1px]" style={{ backgroundImage: "url('/001.webp')" }} aria-hidden="true" />
      <div className="absolute inset-0 bg-black/65" aria-hidden="true" />

      <header className="absolute inset-x-0 top-0 z-10 mx-auto flex w-full max-w-[1320px] items-center justify-between px-5 py-5 text-white sm:px-8">
        <div className="flex items-center gap-3">
          <Image src="/logo.webp" alt="" width={42} height={42} className="size-10 object-contain" priority />
          <span className="text-sm font-semibold tracking-wide sm:text-base">ECU Staff Portal</span>
        </div>
        <span className="hidden text-xs font-medium tracking-[0.16em] text-white/80 sm:block">EMMANUEL CHRISTIAN UNIVERSITY</span>
      </header>

      <section className="relative z-10 w-full max-w-[600px] overflow-hidden rounded-xl border border-primary/50 bg-card text-card-foreground shadow-2xl ring-1 ring-primary/30">
        <div className="flex min-h-[130px] items-center justify-center gap-5 bg-card px-5 py-5 text-card-foreground sm:px-8">
          <Image src="/logo.webp" alt="Emmanuel Christian University logo" width={86} height={86} className="size-[68px] shrink-0 object-contain sm:size-[82px]" priority />
          <div className="min-w-0">
            <h1 className="font-serif text-[25px] font-medium uppercase leading-[1.05] tracking-[0.035em] text-foreground sm:text-[32px]">Emmanuel Christian University</h1>
            <p className="mt-2 text-sm font-medium tracking-wide text-primary sm:text-base">A transformed people with academic excellence</p>
          </div>
        </div>

        <div className="border-y border-border bg-muted/30 px-3 py-6 sm:px-4 sm:py-7">
          <Form {...form}>
            {step === "email" ? (
              <form onSubmit={continueToPassword} className="flex flex-col gap-3 sm:flex-row">
                <FormField control={form.control} name="email" render={({ field }) => (
                  <FormItem className="min-h-[50px] flex-1">
                    <FormLabel className="sr-only">Staff email</FormLabel>
                    <FormControl>
                      <label className="flex min-h-[50px] items-center rounded-md border border-input bg-background text-foreground focus-within:ring-2 focus-within:ring-primary">
                        <Mail className="ml-4 size-5 shrink-0 text-muted-foreground" aria-hidden="true" />
                        <Input autoComplete="username" autoFocus placeholder="Staff email" className="h-full min-w-0 flex-1 border-0 bg-transparent px-4 shadow-none focus-visible:ring-0" {...field} />
                      </label>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <Button className="h-[50px] min-w-[132px] gap-3 px-6 text-sm font-bold" type="submit">
                  NEXT <ArrowRight className="size-[18px]" />
                </Button>
              </form>
            ) : (
              <form onSubmit={form.handleSubmit(handleSignIn)} className="space-y-3">
                <div className="flex items-center gap-3 rounded-md border border-border bg-card px-4 py-2 text-foreground">
                  <Button type="button" onClick={() => setStep("email")} className="size-8 p-0 text-muted-foreground" variant="ghost" aria-label="Change staff email">
                    <ArrowLeft className="size-4" />
                  </Button>
                  <span className="min-w-0 flex-1 truncate text-sm">{form.getValues("email")}</span>
                </div>
                <FormField control={form.control} name="password" render={({ field }) => (
                  <FormItem>
                    <FormLabel className="sr-only">Password</FormLabel>
                    <FormControl>
                      <label className="flex min-h-[50px] items-center rounded-md border border-input bg-background text-foreground focus-within:ring-2 focus-within:ring-primary">
                        <LockKeyhole className="ml-4 size-5 shrink-0 text-muted-foreground" aria-hidden="true" />
                        <Input autoComplete="current-password" autoFocus placeholder="Password" type={showPassword ? "text" : "password"} className="h-full min-w-0 flex-1 border-0 bg-transparent px-4 shadow-none focus-visible:ring-0" {...field} />
                        <Button aria-label={showPassword ? "Hide password" : "Show password"} className="mr-2 text-muted-foreground hover:bg-muted" onClick={() => setShowPassword((visible) => !visible)} size="icon" type="button" variant="ghost">
                          {showPassword ? <EyeOff aria-hidden="true" /> : <Eye aria-hidden="true" />}
                        </Button>
                      </label>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <Button className="h-[50px] w-full gap-3 px-6 text-sm font-bold" disabled={form.formState.isSubmitting} type="submit">
                  {form.formState.isSubmitting ? <LoaderCircle className="size-5 animate-spin" /> : <>SIGN IN <ArrowRight className="size-[18px]" /></>}
                </Button>
              </form>
            )}
          </Form>
        </div>

        <footer className="bg-card px-5 py-5 text-center text-xs leading-6 text-muted-foreground sm:px-8">
          <p>Authorized access for Emmanuel Christian University staff.</p>
          <p className="text-muted-foreground/75">For password assistance, contact the university ICT help desk.</p>
        </footer>
      </section>

      <p className="absolute bottom-6 left-5 z-10 text-xs font-semibold text-white/90 sm:left-[max(2rem,calc((100vw-1320px)/2))]">© {new Date().getFullYear()} Emmanuel Christian University</p>
    </main>
  );
};
