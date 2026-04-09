import { useState } from "react";
import { useQuery, useMutation } from "convex/react";

import { CalendarDays, Clock, AlertCircle, PlusCircle, CheckCircle2, Loader2 } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@workspace/ui/components/card";
import { Badge } from "@workspace/ui/components/badge";
import { Button } from "@workspace/ui/components/button";
import { Input } from "@workspace/ui/components/input";
import { Label } from "@workspace/ui/components/label";
import { Separator } from "@workspace/ui/components/separator";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@workspace/ui/components/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select";
import { toast } from "sonner";
import { format } from "date-fns";
import { api } from "@workspace/backend/_generated/api";

export const AcademicCalendarView = () => {
  const periods = useQuery(api.calendar.getPeriods) || [];
  const activePeriod = useQuery(api.calendar.getActivePeriod);
  const activatePeriod = useMutation(api.calendar.activatePeriod);
  const createPeriod = useMutation(api.calendar.createPeriod);
  
  const [isAdvancing, setIsAdvancing] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [selectedPeriodId, setSelectedPeriodId] = useState<string>("");
  const [loading, setLoading] = useState(false);

  const [newPeriod, setNewPeriod] = useState({
    name: "",
    term: 1,
    year: new Date().getFullYear(),
    startDate: "",
    endDate: "",
  });

  const upcomingPeriods = periods.filter(p => p.status === "upcoming");
  const completedPeriods = periods.filter(p => p.status === "completed");

  const handleAdvance = async () => {
    if (!selectedPeriodId) return;
    setLoading(true);
    try {
      const result = await activatePeriod({ id: selectedPeriodId as any });
      toast.success(`Successfully advanced semester! Migrated ${result.migrationCount} students and billed ${result.billingCount}.`);
      setIsAdvancing(false);
    } catch (error) {
      toast.error("Failed to advance semester. Please ensure fee structures are defined for the new period.");
    } finally {
      setLoading(false);
    }
  };

  const handleCreatePeriod = async () => {
    if (!newPeriod.name || !newPeriod.startDate || !newPeriod.endDate) {
      toast.error("Please fill in all fields.");
      return;
    }
    setLoading(true);
    try {
      await createPeriod(newPeriod);
      toast.success("Academic period created successfully.");
      setIsCreating(false);
      setNewPeriod({
        name: "",
        term: 1,
        year: new Date().getFullYear(),
        startDate: "",
        endDate: "",
      });
    } catch (error) {
      toast.error("Failed to create academic period.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-4 lg:p-8 space-y-8 max-w-7xl mx-auto w-full">
      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Academic Calendar</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Manage semester periods, advance the academic cycle, and track the university calendar.
          </p>
        </div>
      </div>

      {/* ── Current Active Period ── */}
      <Card className="border shadow-sm border-l-4 border-l-emerald-500">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base text-emerald-600 dark:text-emerald-400">Current Academic Period</CardTitle>
              <CardDescription>The globally active semester for all operations</CardDescription>
            </div>
            {activePeriod && (
              <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 border-emerald-200">
                Active
              </Badge>
            )}
          </div>
        </CardHeader>
        <Separator />
        <CardContent className="pt-5">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
            <div className="flex items-center gap-4">
              <div className="size-12 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                <CalendarDays className="size-6 text-emerald-600" />
              </div>
              {activePeriod ? (
                <div>
                  <p className="text-xl font-bold">{activePeriod.name} · {activePeriod.year}</p>
                  <p className="text-sm text-muted-foreground">
                    {format(new Date(activePeriod.startDate), "d MMM yyyy")} — {format(new Date(activePeriod.endDate), "d MMM yyyy")}
                  </p>
                </div>
              ) : (
                <div>
                  <p className="text-xl font-bold text-muted-foreground italic">No active period set</p>
                  <p className="text-sm text-muted-foreground">Initialize the system to start operations.</p>
                </div>
              )}
            </div>

            <Dialog open={isAdvancing} onOpenChange={setIsAdvancing}>
              <DialogTrigger asChild>
                <Button className="gap-2" variant="default">
                  <Clock className="size-4" />
                  Advance Semester
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Advance Academic Cycle</DialogTitle>
                  <DialogDescription>
                    Select the next academic period to activate. This will close the current period, 
                    roll over all active students, and generate new ledger entries based on fee structures.
                  </DialogDescription>
                </DialogHeader>
                
                <div className="py-4 space-y-4">
                   <div className="space-y-2">
                     <p className="text-sm font-medium">Select Upcoming Period</p>
                     <Select onValueChange={setSelectedPeriodId}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a period..." />
                        </SelectTrigger>
                        <SelectContent>
                          {upcomingPeriods.map(p => (
                            <SelectItem key={p._id} value={p._id}>
                              {p.name} · {p.year}
                            </SelectItem>
                          ))}
                          {upcomingPeriods.length === 0 && (
                            <SelectItem value="none" disabled>No upcoming periods found. Create one first.</SelectItem>
                          )}
                        </SelectContent>
                     </Select>
                   </div>
                   
                   <div className="p-3 bg-amber-50 rounded-lg border border-amber-100 flex gap-3 text-amber-800 text-sm">
                      <AlertCircle className="size-5 shrink-0" />
                      <p>
                        Ensure that all programs have <strong>Fee Structures</strong> defined for the selected period 
                        before proceeding, or students will not be correctly billed.
                      </p>
                   </div>
                </div>

                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsAdvancing(false)}>Cancel</Button>
                  <Button 
                    variant="default" 
                    onClick={handleAdvance} 
                    disabled={!selectedPeriodId || loading}
                  >
                    {loading ? "Processing..." : "Confirm Advancement"}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </CardContent>
      </Card>

      {/* ── Period History ── */}
      <Card className="shadow-sm">
        <CardHeader className="pb-3 border-b">
          <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
            Academic Cycle History
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
           <div className="divide-y">
             {completedPeriods.length > 0 ? (
               completedPeriods.map(p => (
                 <div key={p._id} className="p-4 flex items-center justify-between hover:bg-muted/50 transition-colors">
                   <div className="flex items-center gap-3">
                     <CheckCircle2 className="size-5 text-muted-foreground" />
                     <div>
                       <p className="font-medium">{p.name} · {p.year}</p>
                       <p className="text-xs text-muted-foreground">
                         {format(new Date(p.startDate), "MMM yyyy")} — {format(new Date(p.endDate), "MMM yyyy")}
                       </p>
                     </div>
                   </div>
                   <Badge variant="secondary" className="opacity-70">Completed</Badge>
                 </div>
               ))
             ) : (
               <div className="pt-12 pb-12 text-center text-muted-foreground text-sm">
                 <CalendarDays className="size-8 mx-auto opacity-20 mb-3" />
                 History will appear here once the first cycle is completed.
               </div>
             )}
           </div>
        </CardContent>
      </Card>
      
      {/* ── Quick Actions ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pb-8">
        <Dialog open={isCreating} onOpenChange={setIsCreating}>
          <DialogTrigger asChild>
            <Card className="hover:border-primary/50 transition-all cursor-pointer group">
              <CardContent className="p-6 flex items-center gap-4">
                <div className="size-10 rounded-full bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                  <PlusCircle className="size-5 text-primary" />
                </div>
                <div>
                  <p className="font-semibold text-sm">Create Next Period</p>
                  <p className="text-xs text-muted-foreground">Define future semesters in the calendar.</p>
                </div>
              </CardContent>
            </Card>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Create Academic Period</DialogTitle>
              <DialogDescription>
                Define a new term or semester for the university enrollment cycle.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="name" className="text-xs font-bold uppercase text-muted-foreground">Period Name</Label>
                <Input 
                  id="name" 
                  placeholder="e.g. Semester 1" 
                  value={newPeriod.name}
                  onChange={(e) => setNewPeriod({ ...newPeriod, name: e.target.value })}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label className="text-xs font-bold uppercase text-muted-foreground">Term/Semester</Label>
                  <Select 
                    value={newPeriod.term.toString()} 
                    onValueChange={(v) => setNewPeriod({ ...newPeriod, term: parseInt(v) })}
                  >
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">Semester 1</SelectItem>
                      <SelectItem value="2">Semester 2</SelectItem>
                      <SelectItem value="3">Semester 3</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label className="text-xs font-bold uppercase text-muted-foreground">Year</Label>
                  <Input 
                    type="number" 
                    value={newPeriod.year}
                    onChange={(e) => setNewPeriod({ ...newPeriod, year: parseInt(e.target.value) })}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label className="text-xs font-bold uppercase text-muted-foreground">Start Date</Label>
                  <Input 
                    type="date" 
                    value={newPeriod.startDate}
                    onChange={(e) => setNewPeriod({ ...newPeriod, startDate: e.target.value })}
                  />
                </div>
                <div className="grid gap-2">
                  <Label className="text-xs font-bold uppercase text-muted-foreground">End Date</Label>
                  <Input 
                    type="date" 
                    value={newPeriod.endDate}
                    onChange={(e) => setNewPeriod({ ...newPeriod, endDate: e.target.value })}
                  />
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsCreating(false)}>Cancel</Button>
              <Button onClick={handleCreatePeriod} disabled={loading} className="gap-2">
                {loading && <Loader2 className="size-4 animate-spin" />}
                Create Period
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
        
        <Card className="hover:border-primary/50 transition-all cursor-pointer group">
          <CardContent className="p-6 flex items-center gap-4">
            <div className="size-10 rounded-full bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
              <Clock className="size-5 text-primary" />
            </div>
            <div>
              <p className="font-semibold text-sm">Automated Fee Settings</p>
              <p className="text-xs text-muted-foreground">Configure global rollover policies.</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
