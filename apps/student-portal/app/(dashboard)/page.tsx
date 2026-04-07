"use client";

import { useMutation } from "convex/react";
import { api } from "@workspace/backend/_generated/api";
import { Button } from "@workspace/ui/components/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@workspace/ui/components/card";

export default function Page() {
  const addUser = useMutation(api.users.add);

  return (
    <div className="flex flex-col items-center justify-center min-h-[80vh] p-4">
      <Card className="w-full max-w-md shadow-lg border-primary/10">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
            Welcome, Student
          </CardTitle>
          <CardDescription>
            Your central hub for academic success and campus life.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="p-8 rounded-xl bg-muted/50 flex flex-col items-center gap-2 border border-dashed border-muted-foreground/20">
            <p className="text-sm text-muted-foreground font-medium uppercase tracking-wider">Module Status</p>
            <p className="text-lg font-semibold text-primary">Migration Successful</p>
          </div>
          <Button 
            className="w-full h-11 text-base font-medium transition-all hover:scale-[1.02]"
            onClick={() => addUser()}
          >
            Update Profile
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
