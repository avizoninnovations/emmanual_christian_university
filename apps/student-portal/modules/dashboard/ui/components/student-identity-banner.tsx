import { Globe, Mail, Phone, UserRound } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@workspace/ui/components/avatar";
import { Badge } from "@workspace/ui/components/badge";

interface StudentIdentityBannerProps {
  name: string;
  program: string;
  email: string;
  phone: string;
  nationality?: string;
  imageUrl: string | null;
  status: string;
}

export function StudentIdentityBanner({
  name, program, email, phone, nationality, imageUrl, status,
}: StudentIdentityBannerProps) {
  return (
    <section
      className="relative isolate flex min-h-36 items-center gap-5 overflow-hidden rounded-xl bg-cover bg-center p-5 text-white shadow-sm sm:px-6"
      style={{ backgroundImage: "url('/banner.png')" }}
    >
      <div className="absolute inset-0 -z-10 bg-gradient-to-r from-primary/50 via-primary/20 to-transparent" />
      <Avatar className="size-20 shrink-0 border-4 border-white/90 shadow-sm sm:size-[88px]">
        <AvatarImage src={imageUrl ?? undefined} alt={name} className="object-cover" />
        <AvatarFallback className="bg-primary text-2xl font-medium text-primary-foreground">
          {name.trim().charAt(0) || <UserRound className="size-8" />}
        </AvatarFallback>
      </Avatar>
      <div className="min-w-0 flex-1 space-y-2 pr-20 sm:pr-36">
        <h1 className="break-words text-xl font-bold uppercase leading-tight drop-shadow-sm sm:text-2xl">{name}</h1>
        <p className="text-sm font-semibold leading-snug drop-shadow-sm sm:text-base">{program}</p>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs font-medium text-white/95 sm:text-sm">
          {email && <span className="flex min-w-0 items-center gap-1.5"><Mail className="size-4 shrink-0" /><span className="truncate">{email}</span></span>}
          {phone && <span className="flex items-center gap-1.5"><Phone className="size-4 shrink-0" />{phone}</span>}
          {nationality && <span className="flex items-center gap-1.5"><Globe className="size-4 shrink-0" />{nationality}</span>}
        </div>
      </div>
      <Badge className="absolute right-4 top-4 border-white/30 bg-primary/70 text-white shadow-sm hover:bg-primary/70 sm:right-5 sm:top-4">
        {status}
      </Badge>
    </section>
  );
}
