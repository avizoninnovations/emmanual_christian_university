"use client";

import { useQuery, useMutation } from "convex/react";
import { api } from "@workspace/backend/_generated/api";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@workspace/ui/components/button";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@workspace/ui/components/card";
import { Input } from "@workspace/ui/components/input";
import { Label } from "@workspace/ui/components/label";
import { Textarea } from "@workspace/ui/components/textarea";
import { Plus, Upload, Trash2, ChevronLeft, MoreVertical, Eye, FileText, PlayCircle } from "lucide-react";
import { useState } from "react";
import { Id } from "@workspace/backend/_generated/dataModel";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@workspace/ui/components/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@workspace/ui/components/dropdown-menu";

export default function StaffCourseManagement() {
  const params = useParams();
  const router = useRouter();
  const courseId = params.courseId as Id<"courses">;

  const course = useQuery(api.courses.get, { id: courseId });
  const modules = useQuery(api.lms.getCourseModules, { courseId });
  const createModule = useMutation(api.lms.createModule);

  const [isModuleDialogOpen, setIsModuleDialogOpen] = useState(false);
  const [newModuleTitle, setNewModuleTitle] = useState("");
  const [newModuleDescription, setNewModuleDescription] = useState("");

  const handleCreateModule = async () => {
    if (!newModuleTitle) return;
    try {
      await createModule({
        courseId,
        title: newModuleTitle,
        description: newModuleDescription,
        semester: course?.semester || 1,
        year: course?.year || 2024,
        isPublished: true,
      });
      setIsModuleDialogOpen(false);
      setNewModuleTitle("");
      setNewModuleDescription("");
      toast.success("Module created successfully");
    } catch (err) {
      toast.error("Failed to create module");
    }
  };

  if (!course || !modules) return <div className="p-10 text-center">Loading management portal...</div>;

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="bg-white border-b p-6 md:p-8">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-6">
           <div className="space-y-4">
              <Button variant="ghost" size="sm" className="-ml-2" onClick={() => router.push("/staff/dashboard")}>
                 <ChevronLeft className="w-4 h-4 mr-1" /> Back to Teaching List
              </Button>
              <div className="space-y-1">
                 <h1 className="text-3xl font-black">{course.title}</h1>
                 <p className="text-muted-foreground flex items-center gap-2">
                    <span className="font-bold text-primary">{course.code}</span>
                    <span>•</span>
                    <span>Instructor Resource Center</span>
                 </p>
              </div>
           </div>
           
           <div className="flex gap-3">
              <Button variant="outline" size="sm">
                 <Eye className="w-4 h-4 mr-2" /> View as Student
              </Button>
              <Dialog open={isModuleDialogOpen} onOpenChange={setIsModuleDialogOpen}>
                <DialogTrigger asChild>
                  <Button size="sm">
                     <Plus className="w-4 h-4 mr-2" /> ADD MODULE
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Create New Course Module</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div className="space-y-2">
                      <Label htmlFor="title">Module Title</Label>
                      <Input id="title" placeholder="e.g. Week 1: Introduction to Mechanics" value={newModuleTitle} onChange={(e) => setNewModuleTitle(e.target.value)} />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="desc">Description (Optional)</Label>
                      <Textarea id="desc" placeholder="Briefly describe what students will learn." value={newModuleDescription} onChange={(e) => setNewModuleDescription(e.target.value)} />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button onClick={handleCreateModule}>Create Module</Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
           </div>
        </div>
      </div>

      {/* Content Area */}
      <main className="max-w-6xl mx-auto p-6 md:p-8 space-y-8">
         <div className="grid grid-cols-1 gap-6">
            {modules.map((module, idx) => (
               <Card key={module._id} className="bg-white shadow-sm border-none overflow-hidden group">
                  <div className="p-6 border-b flex items-center justify-between bg-slate-50/50">
                     <div className="flex items-center gap-4">
                        <div className="w-10 h-10 bg-white border border-slate-200 rounded-xl flex items-center justify-center font-bold text-slate-500 shadow-sm">
                           {idx + 1}
                        </div>
                        <div>
                           <h3 className="font-bold text-lg">{module.title}</h3>
                           <p className="text-xs text-muted-foreground mt-0.5">{module.description || "No description provided."}</p>
                        </div>
                     </div>
                     <DropdownMenu>
                       <DropdownMenuTrigger asChild>
                         <Button variant="ghost" size="icon"><MoreVertical className="w-4 h-4" /></Button>
                       </DropdownMenuTrigger>
                       <DropdownMenuContent align="end">
                         <DropdownMenuItem>Edit Module</DropdownMenuItem>
                         <DropdownMenuItem className="text-destructive">Delete Module</DropdownMenuItem>
                       </DropdownMenuContent>
                     </DropdownMenu>
                  </div>
                  <CardContent className="p-6">
                     <StaffMaterialManager moduleId={module._id} courseId={courseId} />
                  </CardContent>
               </Card>
            ))}

            {modules.length === 0 && (
               <div className="bg-white border-2 border-dashed rounded-2xl p-20 text-center space-y-4">
                  <div className="w-16 h-16 bg-slate-50 border border-slate-200 rounded-2xl flex items-center justify-center mx-auto text-slate-300">
                     <Plus className="w-8 h-8" />
                  </div>
                  <div className="space-y-1">
                    <p className="font-bold text-slate-500">No content modules created yet.</p>
                    <p className="text-sm text-slate-400">Click the "Add Module" button to begin structuring your classroom.</p>
                  </div>
               </div>
            )}
         </div>
      </main>
    </div>
  );
}

function StaffMaterialManager({ moduleId, courseId }: { moduleId: Id<"courseModules">, courseId: Id<"courses"> }) {
  const materials = useQuery(api.lms.getModuleMaterials, { moduleId });
  const upload = useMutation(api.lms.uploadMaterial);

  const [isAddMatOpen, setIsAddMatOpen] = useState(false);
  const [mtit, setMtit] = useState("");
  const [murl, setMurl] = useState("");
  const [mtype, setMtype] = useState<"pdf" | "video" | "document">("pdf");

  const handleUpload = async () => {
    if (!mtit || !murl) return;
    try {
      await upload({
        moduleId,
        courseId,
        title: mtit,
        type: mtype as any,
        fileUrl: murl,
        isPublished: true,
      });
      setIsAddMatOpen(false);
      setMtit("");
      setMurl("");
      toast.success("Material added");
    } catch (err) {
      toast.error("Error adding material");
    }
  };

  return (
    <div className="space-y-4">
       <div className="flex items-center justify-between mb-4">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Materials & Resources</p>
          <Dialog open={isAddMatOpen} onOpenChange={setIsAddMatOpen}>
             <DialogTrigger asChild>
                <Button variant="ghost" size="sm" className="h-8 text-primary hover:bg-primary/5">
                   <Plus className="w-3.5 h-3.5 mr-1" /> ADD CONTENT
                </Button>
             </DialogTrigger>
             <DialogContent>
                <DialogHeader>
                   <DialogTitle>Add Material to Module</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-4">
                   <div className="space-y-2">
                      <Label>Title</Label>
                      <Input placeholder="e.g. Introduction Slides" value={mtit} onChange={(e) => setMtit(e.target.value)} />
                   </div>
                   <div className="space-y-2">
                       <Label>Cloudflare R2 File URL</Label>
                       <Input placeholder="https://pub-your-id.r2.dev/..." value={murl} onChange={(e) => setMurl(e.target.value)} />
                   </div>
                   <div className="space-y-2">
                       <Label>Type</Label>
                       <select className="w-full flex h-10 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50" value={mtype} onChange={(e) => setMtype(e.target.value as any)}>
                          <option value="pdf">PDF Document</option>
                          <option value="video">MP4 Video</option>
                          <option value="document">Generic File</option>
                       </select>
                   </div>
                </div>
                <DialogFooter>
                   <Button onClick={handleUpload}>Post Material</Button>
                </DialogFooter>
             </DialogContent>
          </Dialog>
       </div>

       <div className="space-y-2">
          {materials?.map((mat) => (
             <div key={mat._id} className="flex items-center justify-between p-4 bg-slate-50/50 border border-slate-100 rounded-xl group hover:border-primary/30 transition-colors">
                <div className="flex items-center gap-3">
                   {mat.type === "video" ? <PlayCircle className="w-4 h-4 text-blue-500" /> : <FileText className="w-4 h-4 text-orange-500" />}
                   <div>
                      <p className="text-sm font-bold">{mat.title}</p>
                      <p className="text-[10px] font-medium text-muted-foreground uppercase">{mat.type} • {mat.viewCount || 0} views</p>
                   </div>
                </div>
                <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive opacity-0 group-hover:opacity-100 transition-opacity">
                   <Trash2 className="w-4 h-4" />
                </Button>
             </div>
          ))}
       </div>
    </div>
  );
}
