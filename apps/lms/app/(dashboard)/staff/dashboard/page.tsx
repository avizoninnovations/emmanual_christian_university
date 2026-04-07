"use client";

import { useQuery } from "convex/react";
import { api } from "@workspace/backend/_generated/api";
import { authClient } from "@/lib/auth-client";
import { Button } from "@workspace/ui/components/button";
import { Card, CardContent } from "@workspace/ui/components/card";
import { BookOpen, GraduationCap, LogOut, Plus, Users, LayoutDashboard } from "lucide-react";
import { useRouter } from "next/navigation";

export default function StaffDashboard() {
  const router = useRouter();
  const session = authClient.useSession();
  const user = session.data?.user;

  // We should fetch the staff record using the user.email
  const teachingCourses = useQuery(api.courses.getTaughtCourses);

  if (session.isPending) return <div>Loading...</div>;
  if (!user) return null;

  return (
    <div className="min-h-screen bg-slate-50/50 flex flex-col">
      {/* Mini Nav */}
      <nav className="border-b bg-white px-6 py-4 flex items-center justify-between sticky top-0 z-30 shadow-sm">
        <div className="flex items-center gap-2">
           <div className="bg-primary p-1.5 rounded-lg text-primary-foreground transform rotate-12">
             <GraduationCap className="w-6 h-6" />
           </div>
           <span className="text-xl font-bold tracking-tight">ECU <span className="text-primary">LMS</span></span>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-right hidden sm:block">
            <p className="text-sm font-semibold">{user.name}</p>
            <p className="text-xs text-muted-foreground">{user.email}</p>
          </div>
          <Button variant="ghost" size="icon" onClick={() => authClient.signOut()}>
            <LogOut className="w-5 h-5 text-muted-foreground" />
          </Button>
        </div>
      </nav>

      <main className="flex-1 p-6 md:p-10 max-w-7xl mx-auto w-full space-y-8">
        <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <h1 className="text-3xl font-bold tracking-tight">Staff Instructor Portal 👋</h1>
            <p className="text-muted-foreground text-sm">Manage your course modules, materials, and student submissions.</p>
          </div>
          <Button className="w-full sm:w-auto shadow-sm">
             <Plus className="w-4 h-4 mr-2" /> CREATE NEW MODULE
          </Button>
        </header>

        <section className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {/* Quick Stats */}
          <Card className="bg-white border-none shadow-sm flex items-center p-6 gap-4">
             <div className="p-3 bg-blue-50 rounded-lg text-blue-600">
                <LayoutDashboard className="w-6 h-6" />
             </div>
             <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Active Courses</p>
                <p className="text-2xl font-bold">{teachingCourses?.length || 0}</p>
             </div>
          </Card>
          <Card className="bg-white border-none shadow-sm flex items-center p-6 gap-4">
             <div className="p-3 bg-green-50 rounded-lg text-green-600">
                <Users className="w-6 h-6" />
             </div>
             <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Total Students</p>
                <p className="text-2xl font-bold">--</p>
             </div>
          </Card>
        </section>

        <section className="space-y-6">
           <h2 className="text-xl font-bold">Manage Classrooms</h2>
           <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {teachingCourses?.map((course) => (
                <Card key={course._id} className="group hover:ring-2 hover:ring-primary/20 transition-all cursor-pointer bg-white overflow-hidden shadow-sm">
                   <div className="h-24 bg-gradient-to-r from-blue-600 to-indigo-700 p-6 flex items-start justify-between">
                      <span className="text-[10px] font-bold uppercase tracking-widest text-white/80 px-2 py-0.5 bg-white/10 rounded-full border border-white/20">
                         {course.courseCode}
                      </span>
                      <BookOpen className="w-10 h-10 text-white/20" />
                   </div>
                   <CardContent className="p-6">
                      <h3 className="text-lg font-extrabold mb-1">{course.title}</h3>
                      <p className="text-sm text-muted-foreground mb-4 line-clamp-2">{course.description || "Course description not available."}</p>
                      
                      <div className="pt-4 border-t flex items-center justify-between">
                         <div className="flex -space-x-2">
                           {[1, 2, 3].map(i => (
                             <div key={i} className="w-7 h-7 rounded-full border-2 border-white bg-slate-200" />
                           ))}
                         </div>
                         <Button variant="outline" size="sm" onClick={() => router.push(`/staff/courses/${course._id}`)}>
                            Manage Content
                         </Button>
                      </div>
                   </CardContent>
                </Card>
              ))}

              {!teachingCourses && (
                 <div className="col-span-full p-20 text-center border-2 border-dashed rounded-xl bg-white/50">
                    <LayoutDashboard className="w-12 h-12 text-muted-foreground/20 mx-auto mb-4" />
                    <p className="text-muted-foreground">You don't have any assigned courses currently.</p>
                 </div>
              )}
           </div>
        </section>
      </main>
    </div>
  );
}
