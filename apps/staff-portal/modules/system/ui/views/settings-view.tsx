"use client";

import { useState, useEffect } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@workspace/backend/_generated/api";
import { useCurrentUser } from "@/hooks/use-current-user";
import { 
  Settings, 
  User, 
  Shield, 
  Globe, 
  Save, 
  RefreshCcw, 
  Mail, 
  Phone, 
  Building,
  Check,
  AlertCircle
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@workspace/ui/components/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@workspace/ui/components/tabs";
import { Button } from "@workspace/ui/components/button";
import { Input } from "@workspace/ui/components/input";
import { Label } from "@workspace/ui/components/label";
import { Separator } from "@workspace/ui/components/separator";
import { Badge } from "@workspace/ui/components/badge";
import { toast } from "sonner";
import { Skeleton } from "@workspace/ui/components/skeleton";

export function SettingsView() {
  const { user } = useCurrentUser();
  const config = useQuery(api.system.getSystemConfig);
  const updateConfig = useMutation(api.system.updateSystemConfig);

  const [isSaving, setIsSaving] = useState(false);
  const [activeTab, setActiveTab] = useState("profile");

  // System Config State
  const [formData, setFormData] = useState({
    universityName: "",
    universityMotto: "",
    contactEmail: "",
    contactPhone: "",
    logoUrl: "",
  });

  useEffect(() => {
    if (config) {
      setFormData({
        universityName: config.universityName || "",
        universityMotto: config.universityMotto || "",
        contactEmail: config.contactEmail || "",
        contactPhone: config.contactPhone || "",
        logoUrl: config.logoUrl || "",
      });
    }
  }, [config]);

  const handleUpdateConfig = async () => {
    setIsSaving(true);
    try {
      await updateConfig({
        id: config?._id,
        ...formData
      });
      toast.success("System configurations updated successfully");
    } catch (error) {
       console.error(error);
       toast.error("Failed to update system configurations");
    } finally {
      setIsSaving(false);
    }
  };

  if (config === undefined) {
    return (
      <div className="space-y-6 max-w-5xl mx-auto p-6 lg:p-10">
        <div className="space-y-2">
            <Skeleton className="h-10 w-48" />
            <Skeleton className="h-4 w-64" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mt-10">
            <Skeleton className="h-[400px] md:col-span-1" />
            <Skeleton className="h-[400px] md:col-span-3" />
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 lg:p-10 space-y-8 max-w-6xl mx-auto w-full anim-fade-in">
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-3">
            <div className="size-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary border border-primary/20">
                <Settings className="size-5" />
            </div>
            <div>
                <h1 className="text-3xl font-bold tracking-tight">Administrative Settings</h1>
                <p className="text-muted-foreground text-sm font-medium">Manage your profile and university-wide configurations</p>
            </div>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <div className="flex items-center justify-between border-b pb-1">
            <TabsList className="bg-transparent border-none gap-2 h-auto p-0">
                <TabsTrigger 
                    value="profile" 
                    className="data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:shadow-none rounded-none px-4 py-2 text-xs font-bold uppercase tracking-wider"
                >
                    <User className="size-3.5 mr-2" /> My Profile
                </TabsTrigger>
                <TabsTrigger 
                    value="branding" 
                    className="data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:shadow-none rounded-none px-4 py-2 text-xs font-bold uppercase tracking-wider"
                >
                    <Globe className="size-3.5 mr-2" /> University Branding
                </TabsTrigger>
                <TabsTrigger 
                    value="security" 
                    className="data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:shadow-none rounded-none px-4 py-2 text-xs font-bold uppercase tracking-wider"
                >
                    <Shield className="size-3.5 mr-2" /> Security
                </TabsTrigger>
            </TabsList>
        </div>

        {/* ── Profile Tab ── */}
        <TabsContent value="profile" className="focus-visible:outline-none">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card className="md:col-span-1 border-none shadow-none bg-muted/30">
                <CardHeader className="text-center pb-8 pt-10">
                    <div className="mx-auto size-24 rounded-full bg-gradient-to-br from-primary/20 to-primary/5 border-2 border-primary/10 flex items-center justify-center mb-4 overflow-hidden">
                        {user?.image ? (
                           <img src={user.image} alt={user.name} className="size-full object-cover" />
                        ) : (
                           <User className="size-10 text-primary/40" />
                        )}
                    </div>
                    <CardTitle className="text-xl">{user?.name}</CardTitle>
                    <CardDescription>{user?.email}</CardDescription>
                    <div className="mt-4 flex flex-wrap justify-center gap-2">
                        {user?.roles?.includes("admin") && (
                            <Badge className="bg-amber-100 text-amber-700 border-amber-200 uppercase text-[10px] font-bold">System Administrator</Badge>
                        )}
                        <Badge variant="outline" className="uppercase text-[10px] font-bold tracking-tight">Active Session</Badge>
                    </div>
                </CardHeader>
                <CardContent className="space-y-4">
                    <Separator className="bg-muted-foreground/10" />
                    <div className="space-y-3 pt-2">
                         <div className="flex items-center justify-between text-xs">
                             <span className="text-muted-foreground font-medium">Joined On</span>
                             <span className="font-bold">April 10, 2026</span>
                         </div>
                         <div className="flex items-center justify-between text-xs">
                             <span className="text-muted-foreground font-medium">Last Login</span>
                             <span className="font-bold">2 hours ago</span>
                         </div>
                    </div>
                </CardContent>
            </Card>

            <Card className="md:col-span-2 border shadow-sm">
                <CardHeader>
                    <CardTitle className="text-lg">Identity & Information</CardTitle>
                    <CardDescription>Update your personal details visible to other staff members</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="full-name" className="text-xs font-bold uppercase tracking-widest text-muted-foreground/70">Full Name</Label>
                            <Input id="full-name" defaultValue={user?.name || ""} className="h-11 shadow-sm" readOnly />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="email" className="text-xs font-bold uppercase tracking-widest text-muted-foreground/70">Email Address</Label>
                            <Input id="email" defaultValue={user?.email || ""} className="h-11 shadow-sm" readOnly />
                        </div>
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="bio" className="text-xs font-bold uppercase tracking-widest text-muted-foreground/70">Professional Summary</Label>
                        <Input id="bio" placeholder="Academic administrator at ECU..." className="h-11 shadow-sm" />
                    </div>
                </CardContent>
                <CardFooter className="bg-muted/10 border-t pt-4">
                    <Button disabled className="ml-auto text-xs font-bold h-10 px-6">
                        <Save className="size-3.5 mr-2" /> Update Local Profile
                    </Button>
                </CardFooter>
            </Card>
          </div>
        </TabsContent>

        {/* ── Branding Tab ── */}
        <TabsContent value="branding" className="focus-visible:outline-none">
          <Card className="border shadow-sm">
            <CardHeader className="border-b bg-muted/10">
                <div className="flex items-center justify-between">
                    <div>
                        <CardTitle className="text-lg">University Branding</CardTitle>
                        <CardDescription>Configure the public-facing identity of Emmanuel Christian University</CardDescription>
                    </div>
                    <div className="p-3 bg-background rounded-xl border shadow-sm">
                        <Building className="size-5 text-primary" />
                    </div>
                </div>
            </CardHeader>
            <CardContent className="space-y-8 pt-8">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="space-y-6">
                        <div className="space-y-2">
                            <Label htmlFor="uni-name" className="text-xs font-bold uppercase tracking-widest text-muted-foreground/70 flex items-center gap-2">
                                <Building className="size-3" /> University Legal Name
                            </Label>
                            <Input 
                                id="uni-name" 
                                value={formData.universityName} 
                                onChange={e => setFormData(p => ({ ...p, universityName: e.target.value }))}
                                className="h-11 shadow-inner focus:shadow-none transition-all" 
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="uni-motto" className="text-xs font-bold uppercase tracking-widest text-muted-foreground/70">Motto / Tagline</Label>
                            <Input 
                                id="uni-motto" 
                                value={formData.universityMotto} 
                                onChange={e => setFormData(p => ({ ...p, universityMotto: e.target.value }))}
                                className="h-11 shadow-inner" 
                            />
                        </div>
                    </div>
                    <div className="space-y-6 text-center md:text-left">
                        <Label className="text-xs font-bold uppercase tracking-widest text-muted-foreground/70 block">Official Logo</Label>
                        <div className="flex items-center gap-6 p-4 rounded-xl border border-dashed bg-muted/5">
                            <div className="size-20 rounded-lg bg-background border shadow-inner flex items-center justify-center overflow-hidden shrink-0">
                                {formData.logoUrl ? (
                                    <img src={formData.logoUrl} alt="Logo Preview" className="size-full object-contain" />
                                ) : (
                                    <Globe className="size-8 text-muted-foreground/20" />
                                )}
                            </div>
                            <div className="space-y-2 flex-1 text-left">
                                <p className="text-[10px] font-bold text-muted-foreground uppercase leading-tight">Recommended: 512x512 Transparent PNG</p>
                                <Input 
                                    placeholder="https://cdn.ecu.edu/logo.png" 
                                    value={formData.logoUrl} 
                                    onChange={e => setFormData(p => ({ ...p, logoUrl: e.target.value }))}
                                    className="h-8 text-xs font-mono" 
                                />
                            </div>
                        </div>
                    </div>
                </div>

                <Separator />

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="space-y-2">
                        <Label htmlFor="contact-email" className="text-xs font-bold uppercase tracking-widest text-muted-foreground/70 flex items-center gap-2">
                             <Mail className="size-3" /> System Support Email
                        </Label>
                        <Input 
                            id="contact-email" 
                            type="email" 
                            value={formData.contactEmail} 
                            onChange={e => setFormData(p => ({ ...p, contactEmail: e.target.value }))}
                            className="h-11" 
                        />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="contact-phone" className="text-xs font-bold uppercase tracking-widest text-muted-foreground/70 flex items-center gap-2">
                             <Phone className="size-3" /> Finance / Admissions Help Desk
                        </Label>
                        <Input 
                            id="contact-phone" 
                            value={formData.contactPhone} 
                            onChange={e => setFormData(p => ({ ...p, contactPhone: e.target.value }))}
                            className="h-11" 
                        />
                    </div>
                </div>
            </CardContent>
            <CardFooter className="bg-muted/10 border-t pt-4 justify-between">
                <p className="text-[10px] text-muted-foreground font-medium flex items-center gap-2 rotate-0">
                    <AlertCircle className="size-3 text-amber-500" />
                    Branding changes propagate to all portals instantly.
                </p>
                <div className="flex gap-3">
                    <Button variant="outline" className="h-10 text-xs font-bold" onClick={() => setFormData({
                        universityName: config?.universityName || "",
                        universityMotto: config?.universityMotto || "",
                        contactEmail: config?.contactEmail || "",
                        contactPhone: config?.contactPhone || "",
                        logoUrl: config?.logoUrl || "",
                    })}>
                        <RefreshCcw className="size-3.5 mr-2" /> Reset
                    </Button>
                    <Button className="h-10 text-xs font-bold px-8 shadow-lg shadow-primary/20" onClick={handleUpdateConfig} disabled={isSaving}>
                        {isSaving ? <RefreshCcw className="size-3.5 mr-2 animate-spin" /> : <Check className="size-3.5 mr-2" />}
                        Save System Changes
                    </Button>
                </div>
            </CardFooter>
          </Card>
        </TabsContent>

        {/* ── Security Tab ── */}
        <TabsContent value="security" className="focus-visible:outline-none">
            <div className="space-y-6">
                <Card className="border shadow-sm overflow-hidden">
                    <CardHeader className="border-b bg-rose-500/[0.02]">
                        <div className="flex items-center gap-3">
                            <div className="size-9 rounded-lg bg-rose-500/10 flex items-center justify-center text-rose-600 border border-rose-500/20">
                                <Shield className="size-5" />
                            </div>
                            <div>
                                <CardTitle className="text-lg">Access & Security</CardTitle>
                                <CardDescription>Manage password security and active administrative sessions</CardDescription>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent className="p-0">
                        <div className="divide-y divide-muted/50">
                            <div className="p-6 flex items-center justify-between group hover:bg-muted/5 transition-colors">
                                <div className="space-y-1">
                                    <p className="font-bold text-sm">Two-Factor Authentication</p>
                                    <p className="text-xs text-muted-foreground">Add an extra layer of security to your ECU account</p>
                                </div>
                                <Button variant="outline" disabled className="text-xs font-bold border-rose-500/20 text-rose-600 hover:bg-rose-50">
                                    Configure 2FA
                                </Button>
                            </div>
                            <div className="p-6 flex items-center justify-between group hover:bg-muted/5 transition-colors">
                                <div className="space-y-1">
                                    <p className="font-bold text-sm">Account Password</p>
                                    <p className="text-xs text-muted-foreground">Last changed 4 weeks ago via university registrar</p>
                                </div>
                                <Button variant="outline" className="text-xs font-bold">
                                    Reset Password
                                </Button>
                            </div>
                            <div className="p-6 flex items-center justify-between group hover:bg-muted/5 transition-colors">
                                <div className="space-y-1">
                                    <p className="font-bold text-sm">Active Sessions</p>
                                    <p className="text-xs text-muted-foreground">You are currently logged in from {user?.email} (Kampala, Uganda)</p>
                                </div>
                                <Button variant="outline" disabled className="text-xs font-bold text-rose-500 border-rose-100">
                                    Logout Everywhere
                                </Button>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card className="border border-amber-500/20 bg-amber-500/[0.02]">
                    <CardContent className="pt-6">
                        <div className="flex items-start gap-4">
                            <div className="size-10 rounded-full bg-amber-500/10 flex items-center justify-center shrink-0 border border-amber-500/20">
                                <AlertCircle className="size-5 text-amber-600" />
                            </div>
                            <div className="space-y-1">
                                <p className="font-bold text-sm text-amber-900">Advanced Privileges</p>
                                <p className="text-xs text-amber-700 leading-relaxed font-medium">As a system administrator, your actions are exhaustively audited. Please ensure all modifications meet university compliance standards before saving.</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
