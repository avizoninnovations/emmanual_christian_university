"use client";

import { useState } from "react";
import { ArrowLeft, Save } from "lucide-react";
import { useMutation } from "convex/react";
import { api } from "@workspace/backend/_generated/api";
import { Button } from "@workspace/ui/components/button";
import { Input } from "@workspace/ui/components/input";
import { Card, CardContent } from "@workspace/ui/components/card";
import { Label } from "@workspace/ui/components/label";
import { toast } from "sonner";

interface BookFormProps {
  onBack: () => void;
}

export const BookForm = ({ onBack }: BookFormProps) => {
  const [title, setTitle] = useState("");
  const [author, setAuthor] = useState("");
  const [isbn, setIsbn] = useState("");
  const [totalCopies, setTotalCopies] = useState<number | "">("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const createBook = useMutation(api.library.createBook);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !author || !isbn || !totalCopies) {
      toast.error("Please fill in all required fields.");
      return;
    }

    setIsSubmitting(true);
    try {
      await createBook({
        title,
        author,
        isbn,
        totalCopies: Number(totalCopies),
      });
      toast.success("Book added to the catalog.");
      onBack();
    } catch (error: any) {
      toast.error(error.message || "Failed to add book");
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
            <h2 className="text-2xl font-bold tracking-tight">Add New Resource</h2>
            <p className="text-sm text-muted-foreground mt-1">Record a new physical book into the library catalog.</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6 max-w-2xl">
          <div className="space-y-2">
            <Label>Book Title</Label>
            <Input placeholder="e.g. Introduction to Algorithms" value={title} onChange={e => setTitle(e.target.value)} required className="h-11 border-muted-foreground/20 bg-muted/20" />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label>Author</Label>
              <Input placeholder="e.g. Thomas H. Cormen" value={author} onChange={e => setAuthor(e.target.value)} required className="h-11 border-muted-foreground/20 bg-muted/20" />
            </div>

            <div className="space-y-2">
              <Label>ISBN Number</Label>
              <Input placeholder="e.g. 9780262033848" value={isbn} onChange={e => setIsbn(e.target.value)} required className="h-11 border-muted-foreground/20 bg-muted/20" />
            </div>
            
             <div className="space-y-2">
              <Label>Total Copies Available</Label>
              <Input type="number" min="1" placeholder="e.g. 5" value={totalCopies} onChange={e => setTotalCopies(e.target.value ? Number(e.target.value) : "")} required className="h-11 border-muted-foreground/20 bg-muted/20" />
            </div>
          </div>

          <div className="pt-6 flex justify-end">
            <Button type="button" variant="ghost" onClick={onBack} className="mr-2">Cancel</Button>
            <Button type="submit" disabled={isSubmitting} className="gap-2 h-11 px-8 text-white bg-primary hover:bg-primary/90">
              <Save className="size-4" />
              {isSubmitting ? "Saving..." : "Save to Catalog"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
};
