"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AuthForm } from "@workspace/ui/components/auth-form";
import { authClient } from "@/lib/auth-client";
import { toast } from "sonner";

export const SignUpView = () => {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  const handleSignUp = async (values: any) => {
    setIsLoading(true);
    try {
      const { error } = await authClient.signUp.email({
        email: values.email,
        password: values.password,
        name: values.name,
      });

      if (error) {
        toast.error(error.message || "Failed to create account. Please try again.");
      } else {
        toast.success("Account created successfully!");
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
        type="sign-up" 
        onSubmit={handleSignUp} 
        isLoading={isLoading}
        title="Join Inventory Portal"
        description="Create your account to start managing university stock."
      />
    </div>
  );
};
