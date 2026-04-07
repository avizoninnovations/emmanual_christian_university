"use client";

import { useQuery } from "convex/react";
import { api } from "@workspace/backend/_generated/api";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@workspace/ui/components/button";
import { Card, CardHeader, CardTitle, CardContent } from "@workspace/ui/components/card";
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from "@workspace/ui/components/accordion";
import { FileText, PlayCircle, Download, BookOpen, Clock, ChevronLeft } from "lucide-react";
import { Id } from "@workspace/backend/_generated/dataModel";

export default function StudentCourseClassroom() {
  const params = useParams();
  const router = useRouter();
  const courseId = params.courseId as Id<"courses">;

  const course = useQuery(api.courses.get, { id: courseId });
  const modules = useQuery(api.lms.getCourseModules, { courseId });

  if (!course || !modules) return <div className="p-10 text-center">Loading classroom...</div>;

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <div className="bg-slate-900 text-white p-8 md:p-12">
        <div className="max-w-5xl mx-auto space-y-6">
           <Button variant="ghost" className="text-white/70 hover:text-white -ml-4" onClick={() => router.push("/student/dashboard")}>
              <ChevronLeft className="w-4 h-4 mr-2" /> Back to Dashboard
           </Button>
           <div className="space-y-2">
             <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 bg-primary/20 text-primary-foreground text-[10px] font-bold rounded border border-primary/30 uppercase tracking-widest">{course.code}</span>
             </div>
             <h1 className="text-3xl md:text-4xl font-black tracking-tight">{course.title}</h1>
             <p className="text-slate-400 max-w-2xl">{course.description || "Welcome to your digital classroom. All study materials and assignments are organized into weekly modules below."}</p>
           </div>
        </div>
      </div>

      {/* Content */}
      <main className="max-w-5xl mx-auto p-6 md:p-12 grid grid-cols-1 lg:grid-cols-3 gap-12">
        <div className="lg:col-span-2 space-y-8">
           <h2 className="text-2xl font-bold border-b pb-4">Course Content</h2>
           
           <Accordion type="multiple" className="w-full space-y-4">
             {modules.map((module, idx) => (
               <AccordionItem key={module._id} value={module._id} className="border rounded-xl shadow-sm overflow-hidden bg-slate-50/30 px-4">
                 <AccordionTrigger className="hover:no-underline py-6">
                    <div className="flex items-start gap-4 text-left">
                       <div className="bg-white border w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold shadow-sm">
                          {idx + 1}
                       </div>
                       <div>
                          <p className="font-bold text-lg">{module.title}</p>
                          <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{module.description}</p>
                       </div>
                    </div>
                 </AccordionTrigger>
                 <AccordionContent className="pb-6">
                    <ModuleMaterialsList moduleId={module._id} />
                 </AccordionContent>
               </AccordionItem>
             ))}
           </Accordion>

           {modules.length === 0 && (
              <div className="py-20 text-center border-2 border-dashed rounded-2xl">
                 <BookOpen className="w-12 h-12 text-muted-foreground/20 mx-auto mb-4" />
                 <p className="text-muted-foreground">The instructor hasn't uploaded any modules yet.</p>
              </div>
           )}
        </div>

        {/* Sidebar Info */}
        <div className="space-y-8">
           <Card className="shadow-sm border-slate-100">
             <CardHeader>
                <CardTitle className="text-sm font-bold uppercase tracking-wider text-muted-foreground">Course Details</CardTitle>
             </CardHeader>
             <CardContent className="space-y-4">
                <div className="flex items-center gap-3">
                   <Clock className="w-4 h-4 text-primary" />
                   <span className="text-sm font-medium">Semester {course.semester} {course.year}</span>
                </div>
                <div className="flex items-center gap-3">
                   <BookOpen className="w-4 h-4 text-primary" />
                   <span className="text-sm font-medium">{modules.length} Modules Uploaded</span>
                </div>
             </CardContent>
           </Card>

           <Card className="shadow-sm border-primary/20 bg-primary/5">
             <CardHeader>
                <CardTitle className="text-sm font-bold">Upcoming Exam Info</CardTitle>
             </CardHeader>
             <CardContent className="text-sm text-muted-foreground">
                Exams for this course are scheduled for the end of the semester. Keep track of your module progress.
             </CardContent>
           </Card>
        </div>
      </main>
    </div>
  );
}

function ModuleMaterialsList({ moduleId }: { moduleId: Id<"courseModules"> }) {
  const materials = useQuery(api.lms.getModuleMaterials, { moduleId });

  if (!materials) return <div className="py-4 text-center text-xs">Loading materials...</div>;

  return (
    <div className="space-y-2 mt-4">
      {materials.map((material) => (
        <div key={material._id} className="group flex items-center justify-between p-3 bg-white border rounded-lg hover:border-primary/50 transition-colors">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-slate-50 group-hover:bg-primary/5 rounded">
              {material.type === "video" ? <PlayCircle className="w-4 h-4 text-slate-500 group-hover:text-primary" /> : <FileText className="w-4 h-4 text-slate-500 group-hover:text-primary" />}
            </div>
            <div>
              <p className="text-sm font-bold">{material.title}</p>
              <p className="text-[10px] text-muted-foreground uppercase">{material.type}</p>
            </div>
          </div>
          <Button variant="ghost" size="sm" onClick={() => window.open(material.fileUrl, "_blank")}>
            <Download className="w-4 h-4" />
          </Button>
        </div>
      ))}
      
      {materials.length === 0 && (
         <p className="text-xs text-muted-foreground text-center py-4 italic">No materials uploaded for this module.</p>
      )}
    </div>
  );
}
