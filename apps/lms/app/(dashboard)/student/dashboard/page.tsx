"use client";

import { useQuery } from "convex/react";
import { api } from "@workspace/backend/_generated/api";
import { authClient } from "@/lib/auth-client";
import { Button } from "@workspace/ui/components/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@workspace/ui/components/card";
import { BookOpen, Calendar, Clock, GraduationCap, LogOut } from "lucide-react";
import { useRouter } from "next/navigation";

export default function StudentDashboard() {
  const router = useRouter();
  const session = authClient.useSession();
  const user = session.data?.user;

  // We should fetch the student record using the user.email
  const student = useQuery(api.students.getAuthStudent); // I'll assume this helper exists or create it
  const enrolledCourses = useQuery(api.studentCourseRegistrations.getEnrolledCourses);

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
        <header className="space-y-2">
          <h1 className="text-3xl font-bold tracking-tight">Welcome, {user.name?.split(" ")[0]}! 👋</h1>
          <p className="text-muted-foreground">Continue where you left off in your academic journey.</p>
        </header>

        <section className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Main Course List */}
          <div className="md:col-span-2 space-y-6">
            <div className="flex items-center justify-between">
               <h2 className="text-xl font-bold">My Courses</h2>
               <Button variant="link" size="sm">View all</Button>
            </div>
            
            <div className="grid grid-cols-1 gap-4">
               {enrolledCourses?.map((course) => (
                  <Card key={course._id} className="group hover:border-primary/50 transition-all cursor-pointer bg-white">
                    <CardContent className="p-0 flex flex-col sm:flex-row items-stretch">
                       <div className="w-full sm:w-48 bg-slate-100 flex items-center justify-center p-8 sm:p-0 group-hover:bg-slate-200 transition-colors">
                          <BookOpen className="w-10 h-10 text-slate-400 group-hover:text-primary transition-colors" />
                       </div>
                       <div className="flex-1 p-6 flex flex-col justify-between">
                          <div>
                            <div className="flex items-center gap-2 mb-2">
                               <span className="text-[10px] font-bold uppercase tracking-widest text-primary px-2 py-0.5 bg-primary/10 rounded-full">
                                  {course.courseCode}
                               </span>
                            </div>
                            <h3 className="text-lg font-bold group-hover:text-primary transition-colors underline-offset-4 group-hover:underline">
                              {course.title}
                            </h3>
                            <p className="text-sm text-muted-foreground mt-2 line-clamp-2">
                              {course.description || "Course materials and modules are available inside the classroom."}
                            </p>
                          </div>
                          
                          <div className="mt-6 flex items-center justify-between align-bottom">
                             <div className="flex items-center gap-4 text-xs text-muted-foreground font-medium">
                                <div className="flex items-center gap-1">
                                   <Clock className="w-3.5 h-3.5" />
                                   Next Lecture: Tue
                                </div>
                                <div className="flex items-center gap-1">
                                   <Calendar className="w-3.5 h-3.5" />
                                   4/8 Modules
                                </div>
                             </div>
                             <Button size="sm" className="hidden sm:inline-flex" onClick={() => router.push(`/student/courses/${course._id}`)}>
                                Enter Classroom
                             </Button>
                          </div>
                       </div>
                    </CardContent>
                  </Card>
               ))}

               {!enrolledCourses && (
                 <div className="p-12 text-center border-2 border-dashed rounded-xl bg-white/50">
                    <BookOpen className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
                    <p className="text-muted-foreground">You are not enrolled in any classrooms yet.</p>
                 </div>
               )}
            </div>
          </div>

          {/* Sidebar / Deadlines */}
          <div className="space-y-6">
            <h2 className="text-xl font-bold">Upcoming Deadlines</h2>
            <Card className="bg-white border-primary/20 shadow-sm overflow-hidden">
               <CardHeader className="bg-primary/5 pb-4">
                  <CardTitle className="text-sm">Active Assignments</CardTitle>
               </CardHeader>
               <CardContent className="p-4 space-y-4">
                  <div className="p-3 bg-red-50 rounded-lg border border-red-100">
                     <p className="text-xs font-bold text-red-600 mb-1">Due in 2 days</p>
                     <p className="text-sm font-semibold">CS101: Midterm Project</p>
                  </div>
                  <div className="p-3 bg-blue-50 rounded-lg border border-blue-100">
                     <p className="text-xs font-bold text-blue-600 mb-1">Due in 5 days</p>
                     <p className="text-sm font-semibold">MATH202: Quiz 1</p>
                  </div>
                  <Button variant="ghost" className="w-full text-xs" size="sm">Show more</Button>
               </CardContent>
            </Card>
          </div>
        </section>
      </main>
    </div>
  );
}
