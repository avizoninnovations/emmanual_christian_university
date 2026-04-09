"use client";

import { useState } from "react";
import { ArrowLeft, Send } from "lucide-react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@workspace/backend/_generated/api";
import { Button } from "@workspace/ui/components/button";
import { Input } from "@workspace/ui/components/input";
import { Card, CardContent } from "@workspace/ui/components/card";
import { Label } from "@workspace/ui/components/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@workspace/ui/components/select";
import { toast } from "sonner";
import { Id } from "@workspace/backend/_generated/dataModel";

interface ApplicantFormProps {
  onBack: () => void;
}

export const ApplicantForm = ({ onBack }: ApplicantFormProps) => {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [programId, setProgramId] = useState("");
  const [admissionType, setAdmissionType] = useState<"National" | "Direct">("National");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const programs = useQuery(api.academic.getPrograms, {}) || [];
  const activePeriod = useQuery(api.calendar.getActivePeriod);
  const createApplicant = useMutation(api.admissions.createApplicant);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !email || !programId) {
      toast.error("Please fill in all required fields.");
      return;
    }

    if (!activePeriod) {
      toast.error("No active academic period found. Please contact the administrator.");
      return;
    }

    setIsSubmitting(true);
    try {
      await createApplicant({
        name,
        email,
        phone,
        programId: programId as Id<"programs">,
        admissionType,
        term: activePeriod.term,
        year: activePeriod.year,
      });
      toast.success("Applicant recorded successfully.");
      onBack();
    } catch (error: any) {
      toast.error(error.message || "Failed to record applicant");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card className="border shadow-sm mt-4 animate-in fade-in slide-in-from-bottom-4 duration-300">
      <CardContent className="p-6 sm:p-8">
        <div className="flex items-center gap-4 mb-8">
          <Button variant="outline" size="icon" className="rounded-full size-10 shrink-0" onClick={onBack}>
            <ArrowLeft className="size-5" />
          </Button>
          <div>
            <h2 className="text-2xl font-bold tracking-tight">New Application</h2>
            <p className="text-sm text-muted-foreground mt-1">Register a new student application into the pipeline.</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-8 max-w-3xl">
          {/* Header Toggle (Optional styling matching image) */}
          <div className="flex p-1 bg-muted/50 rounded-lg w-fit">
            <button
              type="button"
              onClick={() => setAdmissionType("National")}
              className={`px-6 py-2 text-sm font-semibold rounded-md transition-colors ${admissionType === "National" ? "bg-white shadow-sm text-primary" : "text-muted-foreground hover:text-foreground"}`}
            >
              NATIONAL
            </button>
            <button
              type="button"
              onClick={() => setAdmissionType("Direct")}
              className={`px-6 py-2 text-sm font-semibold rounded-md transition-colors ${admissionType === "Direct" ? "bg-white shadow-sm text-primary" : "text-muted-foreground hover:text-foreground"}`}
            >
               DIRECT / INTL
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2 col-span-2">
              <Label>Applicant Full Name</Label>
              <Input placeholder="e.g. John Emmanuel Doe" value={name} onChange={e => setName(e.target.value)} required className="h-11 border-muted-foreground/20 bg-muted/20" />
            </div>

            <div className="space-y-2">
              <Label>Email Address</Label>
              <Input type="email" placeholder="john@example.com" value={email} onChange={e => setEmail(e.target.value)} required className="h-11 border-muted-foreground/20 bg-muted/20" />
            </div>

            <div className="space-y-2">
              <Label>Phone Number</Label>
              <Input placeholder="+211 ..." value={phone} onChange={e => setPhone(e.target.value)} className="h-11 border-muted-foreground/20 bg-muted/20" />
            </div>

            <div className="space-y-2 col-span-2">
              <Label>Program Applied For</Label>
              <Select value={programId} onValueChange={setProgramId}>
                <SelectTrigger className="h-11 border-muted-foreground/20 bg-muted/20">
                  <SelectValue placeholder="Select an academic program..." />
                </SelectTrigger>
                <SelectContent>
                  {programs.map((p: any) => (
                    <SelectItem key={p._id} value={p._id}>
                      {p.name} ({p.code})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="pt-4 flex justify-end">
            <Button type="button" variant="ghost" onClick={onBack} className="mr-2">Cancel</Button>
            <Button type="submit" disabled={isSubmitting} className="gap-2 h-11 px-8 text-white bg-primary hover:bg-primary/90">
              <Send className="size-4" />
              {isSubmitting ? "Submitting..." : "Submit Application"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
};
