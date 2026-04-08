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
    console.log("Attempting sign-in for:", values.email);
    try {
      const response = await authClient.signIn.email({
        email: values.email,
        password: values.password,
      });

      console.log("Sign-in response:", response);

      if (response.error) {
        toast.error(response.error.message || "Failed to sign in. Please check your credentials.");
      } else {
        toast.success("Welcome back!");
        router.push("/");
      }
    } catch (err: any) {
      console.error("Sign-in unexpected error:", err);
      toast.error("An unexpected error occurred: " + (err.message || "Unknown error"));
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
 