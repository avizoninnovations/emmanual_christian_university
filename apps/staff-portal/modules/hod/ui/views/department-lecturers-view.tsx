"use client";
import { usePaginatedQuery } from "convex/react";
import { api } from "@workspace/backend/_generated/api";
import { Button } from "@workspace/ui/components/button";
import { Skeleton } from "@workspace/ui/components/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@workspace/ui/components/table";
import { useHodScope } from "../../hooks/use-hod-scope";
import { HodScopePicker } from "../components/hod-scope-picker";
export function DepartmentLecturersView() {
 const scope=useHodScope(); const staff=usePaginatedQuery(api.hod.staffOptions,scope.departmentId?{departmentId:scope.departmentId}:"skip",{initialNumItems:25});
 return <div className="space-y-5 p-4 lg:p-6"><HodScopePicker scope={scope}/><div className="rounded-sm border bg-card"><Table><TableHeader><TableRow><TableHead>Staff member</TableHead><TableHead>Position</TableHead><TableHead>Account</TableHead></TableRow></TableHeader><TableBody>{staff.status==="LoadingFirstPage"?<TableRow><TableCell colSpan={3}><Skeleton className="h-24"/></TableCell></TableRow>:staff.results.map(person=><TableRow key={person._id}><TableCell className="font-medium">{person.name}</TableCell><TableCell className="capitalize">{person.roles.join(", ").replaceAll("_"," ")}</TableCell><TableCell>{person.email}</TableCell></TableRow>)}{staff.status!=="LoadingFirstPage"&&!staff.results.length&&<TableRow><TableCell colSpan={3} className="h-24 text-center text-muted-foreground">No active staff found in this department.</TableCell></TableRow>}</TableBody></Table>{staff.status==="CanLoadMore"&&<Button variant="outline" className="m-3" onClick={()=>staff.loadMore(25)}>Load more</Button>}</div></div>;
}
