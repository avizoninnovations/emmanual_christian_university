"use client";

import { useState } from "react";
import {
  Book, Search, Filter, AlertCircle, BookOpen, Clock, 
  CheckCircle, Plus, BookCopy, ScanLine, ChevronRight
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@workspace/ui/components/card";
import { Badge } from "@workspace/ui/components/badge";
import { Button } from "@workspace/ui/components/button";
import { Input } from "@workspace/ui/components/input";
import { Separator } from "@workspace/ui/components/separator";
import { Table, TableHead, TableHeader, TableRow, TableCell, TableBody } from "@workspace/ui/components/table";

/**
 * Library View
 * Uses mocked data pending schema updates for `books` and `loans`.
 */

const MOCK_BOOKS = [
  { id: "LIB-001", title: "Introduction to Algorithms", author: "Thomas H. Cormen", isbn: "9780262033848", status: "available", copies: 5 },
  { id: "LIB-002", title: "Systematic Theology", author: "Wayne Grudem", isbn: "9780310286707", status: "borrowed", copies: 0 },
  { id: "LIB-003", title: "Clean Code", author: "Robert C. Martin", isbn: "9780132350884", status: "available", copies: 2 },
  { id: "LIB-004", title: "Principles of Corporate Finance", author: "Richard A. Brealey", isbn: "9781260013900", status: "reserved", copies: 1 },
];

export const LibraryView = () => {
  const [search, setSearch] = useState("");

  const filtered = MOCK_BOOKS.filter(b => 
    b.title.toLowerCase().includes(search.toLowerCase()) || 
    b.author.toLowerCase().includes(search.toLowerCase()) ||
    b.isbn.includes(search)
  );

  return (
    <div className="p-4 lg:p-8 space-y-8 max-w-7xl mx-auto w-full">
      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Library Catalog</h1>
          <p className="text-sm text-muted-foreground mt-1">Manage physical resources, track loans, and process returns.</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" className="gap-2"><ScanLine className="size-4" /> Scan Barcode</Button>
          <Button className="gap-2"><Plus className="size-4" /> Add Book</Button>
        </div>
      </div>

      {/* ── Warning Notice for Backend ── */}
      <Card className="border border-amber-200 bg-amber-500/5">
        <CardContent className="pt-5 pb-4">
          <div className="flex gap-3">
            <AlertCircle className="size-5 text-amber-600 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p className="text-sm font-medium text-amber-700 dark:text-amber-400">Backend schema required</p>
              <p className="text-sm text-muted-foreground">
                Currently using mock data. Implement the library schema with <code className="text-xs bg-muted px-1 py-0.5 rounded">books</code> and 
                <code className="text-xs bg-muted px-1 py-0.5 rounded">loans</code> collections in Convex to activate the catalog.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ── Stats ── */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        {[
          { label: "Total Collection", val: "12,450", sub: "Books & resources", icon: Book, color: "text-blue-500" },
          { label: "Currently Borrowed", val: 342, sub: "Out with students", icon: BookCopy, color: "text-amber-500" },
          { label: "Overdue Items", val: 14, sub: "Requires follow-up", icon: Clock, color: "text-rose-500" },
          { label: "Available", val: "12,094", sub: "On shelves", icon: CheckCircle, color: "text-emerald-500" },
        ].map(s => (
           <Card key={s.label} className="border shadow-sm">
             <CardContent className="pt-5 pb-4">
               <div className="flex items-start justify-between">
                 <div>
                   <p className="text-2xl font-bold">{s.val}</p>
                   <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground mt-1">{s.label}</p>
                 </div>
                 <div className="size-8 rounded-lg bg-muted flex items-center justify-center">
                   <s.icon className={`size-4 ${s.color}`} />
                 </div>
               </div>
             </CardContent>
           </Card>
        ))}
      </div>

      {/* ── Table ── */}
      <Card className="shadow-sm">
        <CardHeader className="pb-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
             <CardTitle className="text-base font-semibold">Resource Catalog</CardTitle>
            <div className="flex items-center gap-2">
              <div className="relative w-64">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input placeholder="Search ISBN, title or author..." className="pl-8 h-9" value={search} onChange={e => setSearch(e.target.value)} />
              </div>
              <Button variant="outline" size="sm" className="h-9 gap-2">
                <Filter className="size-4" /> Filter
              </Button>
            </div>
          </div>
        </CardHeader>
        <Separator />
        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-muted/40">
              <TableRow>
                <TableHead className="pl-6 w-28">Ref</TableHead>
                <TableHead>Title & Author</TableHead>
                <TableHead>ISBN</TableHead>
                <TableHead>Available Copies</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right pr-6">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map(b => (
                <TableRow key={b.id} className="group cursor-pointer hover:bg-muted/50">
                  <TableCell className="pl-6 font-mono text-xs text-muted-foreground">{b.id}</TableCell>
                  <TableCell>
                    <p className="font-medium text-sm">{b.title}</p>
                    <p className="text-xs text-muted-foreground">{b.author}</p>
                  </TableCell>
                  <TableCell className="font-mono text-sm">{b.isbn}</TableCell>
                  <TableCell>
                    <Badge variant="secondary">{b.copies} copies</Badge>
                  </TableCell>
                  <TableCell>
                     <Badge variant="outline" className={
                      b.status === "available" ? "bg-emerald-500/10 text-emerald-600 border-emerald-200" :
                      b.status === "borrowed" ? "bg-amber-500/10 text-amber-600 border-amber-200" :
                      "bg-blue-500/10 text-blue-600 border-blue-200"
                    }>
                      {b.status.toUpperCase()}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right pr-6">
                    <Button variant="ghost" size="sm" className="h-8 gap-1 opacity-0 group-hover:opacity-100 transition-opacity text-primary">
                      Manage <ChevronRight className="size-3" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};
