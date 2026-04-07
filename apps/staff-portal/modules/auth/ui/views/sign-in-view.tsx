"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AuthForm } from "@workspace/ui/components/auth-form";
import { authClient } from "@/lib/auth-client";
import { toast } from "sonner";

export const SignInView = () => {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  const handleSignIn = async (values: any) => {
    setIsLoading(true);
    try {
      const { error } = await authClient.signIn.email({
        email: values.email,
        password: values.password,
      });

      if (error) {
        toast.error(error.message || "Failed to sign in. Please check your credentials.");
      } else {
        toast.success("Welcome back!");
        router.push("/");
      }
    } catch (err) {
      toast.error("An unexpected error occurred.");
    } finally {
      setIsLoading(false);
    }
  };

  return ( 
    <div className="flex items-center justify-center min-h-[90vh] bg-gradient-to-tr from-background via-background to-primary/5">
      <AuthForm 
        type="sign-in" 
        onSubmit={handleSignIn} 
        isLoading={isLoading}
        title="ECU Staff Portal"
        description="Emmanuel Christian University Administrative Login"
        showSignUpLink={false}
      />
    </div>
  );
};
 