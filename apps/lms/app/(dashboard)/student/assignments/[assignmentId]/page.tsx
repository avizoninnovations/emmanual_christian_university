"use client";

import { useQuery, useMutation } from "convex/react";
import { api } from "@workspace/backend/_generated/api";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@workspace/ui/components/button";
import { Card, CardHeader, CardTitle, CardContent, CardFooter, CardDescription } from "@workspace/ui/components/card";
import { Input } from "@workspace/ui/components/input";
import { Label } from "@workspace/ui/components/label";
import { Textarea } from "@workspace/ui/components/textarea";
import { FileText, Download, Upload, ChevronLeft, Clock, AlertCircle, CheckCircle2 } from "lucide-react";
import { useState } from "react";
import { Id } from "@workspace/backend/_generated/dataModel";
import { toast } from "sonner";

export default function AssignmentSubmissionPage() {
  const params = useParams();
  const router = useRouter();
  const assignmentId = params.assignmentId as Id<"courseAssignments">;

  const assignment = useQuery(api.lms.getAssignment, { assignmentId }); // Need to add this helper
  const student = useQuery(api.students.getAuthStudent);
  const submit = useMutation(api.lms.submitAssignment);

  const [fileUrl, setFileUrl] = useState("");
  const [textResponse, setTextResponse] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!student) return;
    setIsSubmitting(true);

    try {
      await submit({
        assignmentId,
        studentId: student._id,
        courseId: assignment?.courseId!,
        fileUrl,
        textResponse,
      });
      toast.success("Assignment submitted successfully!");
    } catch (err) {
      toast.error("Failed to submit assignment");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!assignment) return <div className="p-10 text-center">Loading assignment...</div>;

  const isExpired = Date.now() > assignment.dueDate;

  return (
    <div className="min-h-screen bg-slate-50 p-6 md:p-12">
      <div className="max-w-4xl mx-auto space-y-8">
        <Button variant="ghost" size="sm" onClick={() => router.back()}>
           <ChevronLeft className="w-4 h-4 mr-1" /> Back
        </Button>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
           {/* Instructions */}
           <div className="md:col-span-2 space-y-6">
              <div className="space-y-2">
                 <h1 className="text-3xl font-black">{assignment.title}</h1>
                 <div className="flex items-center gap-3 text-sm text-muted-foreground">
                    <span className="flex items-center gap-1"><Clock className="w-4 h-4" /> Due: {new Date(assignment.dueDate).toLocaleString()}</span>
                    <span>•</span>
                    <span className="font-bold text-primary">{assignment.maxScore} Marks</span>
                 </div>
              </div>

              <Card className="bg-white border-none shadow-sm">
                 <CardHeader>
                    <CardTitle className="text-lg">Instructions</CardTitle>
                 </CardHeader>
                 <CardContent className="prose prose-sm max-w-none">
                    <p className="whitespace-pre-wrap">{assignment.instructions}</p>
                 </CardContent>
                 {assignment.attachmentUrl && (
                    <CardFooter className="border-t pt-4">
                       <Button variant="outline" size="sm" onClick={() => window.open(assignment.attachmentUrl, "_blank")}>
                          <Download className="w-4 h-4 mr-2" /> Download Resource Materials
                       </Button>
                    </CardFooter>
                 )}
              </Card>
           </div>

           {/* Submission Box */}
           <div className="space-y-6">
              <Card className="shadow-lg border-primary/20 bg-white sticky top-12">
                 <CardHeader>
                    <CardTitle>Submit Work</CardTitle>
                    <CardDescription>Upload your solution or enter your response below.</CardDescription>
                 </CardHeader>
                 <form onSubmit={handleSubmit}>
                    <CardContent className="space-y-4">
                       {isExpired && (
                          <div className="p-3 bg-destructive/10 text-destructive text-xs rounded-md flex items-start gap-2">
                             <AlertCircle className="w-4 h-4 shrink-0" />
                             <span>Notice: The deadline has passed. Late submissions may be penalized.</span>
                          </div>
                       )}

                       <div className="space-y-2">
                          <Label>Cloudflare R2 Link (File Submission)</Label>
                          <Input 
                            placeholder="https://pub-your-id.r2.dev/..." 
                            value={fileUrl}
                            onChange={(e) => setFileUrl(e.target.value)}
                            disabled={isSubmitting}
                          />
                       </div>

                       <div className="space-y-2">
                          <Label>Online Text Response</Label>
                          <Textarea 
                            placeholder="Type your response here..." 
                            className="min-h-[120px]" 
                            value={textResponse}
                            onChange={(e) => setTextResponse(e.target.value)}
                            disabled={isSubmitting}
                          />
                       </div>
                    </CardContent>
                    <CardFooter>
                       <Button className="w-full" disabled={isSubmitting}>
                          {isSubmitting ? "Submitting..." : <><Upload className="w-4 h-4 mr-2" /> SUBMIT NOW</>}
                       </Button>
                    </CardFooter>
                 </form>
              </Card>

              {/* Status Tracker */}
              <div className="p-4 rounded-xl bg-blue-50 border border-blue-100 flex items-center gap-3">
                 <CheckCircle2 className="w-5 h-5 text-blue-600" />
                 <div className="text-xs">
                    <p className="font-bold text-blue-900 uppercase tracking-widest">Grading Status</p>
                    <p className="text-blue-700">Not Graded Yet</p>
                 </div>
              </div>
           </div>
        </div>
      </div>
    </div>
  );
}
