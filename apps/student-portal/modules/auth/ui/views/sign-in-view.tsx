"use client";
import { getUserFacingErrorMessage } from "@workspace/ui/lib/error-message";

import { useState, type FormEvent } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight, Eye, EyeOff, LockKeyhole, Mail, LoaderCircle } from "lucide-react";
import { toast } from "sonner";
import { useConvex } from "convex/react";
import { api } from "@workspace/backend/_generated/api";
import { authClient } from "@/lib/auth-client";
import { Button } from "@workspace/ui/components/button";

export const SignInView = () => {
  const router = useRouter();
  const convex = useConvex();
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [step, setStep] = useState<"identifier" | "password">("identifier");
  const [isLoading, setIsLoading] = useState(false);

  const continueToPassword = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!identifier.trim()) {
      toast.error("Enter your university email or access number.");
      return;
    }
    setStep("password");
  };

  const handleSignIn = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!identifier.trim()) {
      toast.error("Enter a valid university email or registration number.");
      return;
    }
    if (!password) {
      toast.error("Enter your password to continue.");
      return;
    }

    setIsLoading(true);
    try {
      const accountEmail = await convex.query(api.student_identity.resolveLoginIdentifier, { identifier });
      const { error } = await authClient.signIn.email({
        email: accountEmail,
        password,
      });

      if (error) {
        toast.error(getUserFacingErrorMessage(error, "Sign-in failed. Check your university account details."));
      } else {
        toast.success("Welcome to the student portal.");
        router.push("/");
      }
    } catch {
      toast.error("Unable to sign in right now. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <main className="ecu-login relative flex min-h-svh w-full items-center justify-center overflow-hidden px-4 py-20 sm:px-8">
      <div
        className="absolute inset-0 scale-[1.025] bg-cover bg-center blur-[1px]"
        style={{ backgroundImage: "url('/001.webp')" }}
        aria-hidden="true"
      />
      <div className="absolute inset-0 bg-[#030814]/65" aria-hidden="true" />

      <header className="absolute inset-x-0 top-0 z-10 mx-auto flex w-full max-w-[1320px] items-center justify-between px-5 py-5 text-white sm:px-8">
        <div className="flex items-center gap-3">
          <Image src="/icon.png" alt="" width={42} height={42} className="size-10 object-contain" priority />
          <span className="text-sm font-semibold tracking-wide sm:text-base">ECU Student Portal</span>
        </div>
        <span className="hidden text-xs font-medium tracking-[0.16em] text-white/80 sm:block">EMMANUEL CHRISTIAN UNIVERSITY</span>
      </header>

      <section className="relative z-10 w-full max-w-[600px] overflow-hidden rounded-xl border border-[#d71559] shadow-[0_0_0_1px_#1874c9,0_24px_70px_-20px_rgba(0,0,0,0.85)]">
        <div className="flex min-h-[130px] items-center justify-center gap-5 bg-white px-5 py-5 sm:px-8">
          <Image src="/icon.png" alt="Emmanuel Christian University crest" width={86} height={86} className="size-[68px] shrink-0 object-contain sm:size-[82px]" priority />
          <div className="min-w-0">
            <h1 className="font-serif text-[25px] font-medium uppercase leading-[1.05] tracking-[0.035em] text-[#191919] sm:text-[32px]">
              Emmanuel Christian University
            </h1>
            <p className="mt-2 text-sm font-medium tracking-wide text-[#b10f3b] sm:text-base">A transformed people with academic excellence</p>
          </div>
        </div>

        <div className="border-y border-white/10 bg-[#080b18]/95 px-3 py-6 sm:px-4 sm:py-7">
          {step === "identifier" ? (
            <form onSubmit={continueToPassword} className="flex flex-col gap-3 sm:flex-row">
              <label className="relative flex min-h-[50px] flex-1 items-center rounded-md bg-[#f5f8fa] text-[#17364a] focus-within:ring-2 focus-within:ring-[#1d75c9]">
                <Mail className="ml-4 size-5 shrink-0" aria-hidden="true" />
                <span className="sr-only">University email or access number</span>
                <input
                  autoComplete="username"
                  autoFocus
                  className="h-full min-w-0 flex-1 bg-transparent px-4 text-sm text-[#1c2933] outline-none placeholder:text-[#929ba1]"
                  onChange={(event) => setIdentifier(event.target.value)}
                  placeholder="Username or access number"
                  value={identifier}
                />
              </label>
              <button className="flex h-[50px] min-w-[132px] items-center justify-center gap-3 rounded-md bg-gradient-to-r from-[#ec155e] to-[#d50c58] px-6 text-sm font-bold text-white shadow-lg shadow-[#c10c4a]/20 transition hover:brightness-110 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white disabled:cursor-not-allowed disabled:opacity-60" type="submit">
                NEXT <ArrowRight className="size-[18px]" />
              </button>
            </form>
          ) : (
            <form onSubmit={handleSignIn} className="space-y-3">
              <div className="flex items-center gap-3 rounded-md bg-white/10 px-4 py-3 text-white">
                <button type="button" onClick={() => setStep("identifier")} className="rounded p-1 text-white/80 transition hover:bg-white/10 hover:text-white" aria-label="Change username or access number">
                  <ArrowLeft className="size-4" />
                </button>
                <span className="min-w-0 flex-1 truncate text-sm">{identifier}</span>
              </div>
              <label className="flex min-h-[50px] items-center rounded-md bg-[#f5f8fa] text-[#17364a] focus-within:ring-2 focus-within:ring-[#1d75c9]">
                <LockKeyhole className="ml-4 size-5 shrink-0" aria-hidden="true" />
                <span className="sr-only">Password</span>
                <input
                  autoComplete="current-password"
                  autoFocus
                  className="h-full min-w-0 flex-1 bg-transparent px-4 text-sm text-[#1c2933] outline-none placeholder:text-[#929ba1]"
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="Password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                />
                <Button
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  className="mr-2 text-[#17364a] hover:bg-black/5"
                  onClick={() => setShowPassword((visible) => !visible)}
                  size="icon"
                  type="button"
                  variant="ghost"
                >
                  {showPassword ? <EyeOff aria-hidden="true" /> : <Eye aria-hidden="true" />}
                </Button>
              </label>
              <button className="flex h-[50px] w-full items-center justify-center gap-3 rounded-md bg-gradient-to-r from-[#ec155e] to-[#d50c58] px-6 text-sm font-bold text-white shadow-lg shadow-[#c10c4a]/20 transition hover:brightness-110 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white disabled:cursor-not-allowed disabled:opacity-60" disabled={isLoading} type="submit">
                {isLoading ? <LoaderCircle className="size-5 animate-spin" /> : <>SIGN IN <ArrowRight className="size-[18px]" /></>}
              </button>
            </form>
          )}
        </div>

        <footer className="bg-[#080b18]/95 px-5 py-5 text-center text-xs leading-6 text-white/75 sm:px-8">
          <p>Authorized access for Emmanuel Christian University students.</p>
          <p className="text-white/55">For password assistance, contact the university ICT help desk.</p>
        </footer>
      </section>

      <p className="absolute bottom-6 left-5 z-10 text-xs font-semibold text-white/90 sm:left-[max(2rem,calc((100vw-1320px)/2))]">© {new Date().getFullYear()} Emmanuel Christian University</p>
    </main>
  );
};
