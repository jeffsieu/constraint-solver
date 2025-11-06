"use client";

import { Button } from "@/components/ui/button";
import { Link2 } from "lucide-react";
import { toast } from "sonner";

interface CopyLinkProps {
  className?: string;
}

export function CopyLink({ className }: CopyLinkProps) {
  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      toast.success("Link copied");
    } catch (error) {
      toast.error("Failed to copy link");
    }
  };

  return (
    <div className={className}>
      <Button onClick={handleCopyLink} size="lg" variant="outline">
        <Link2 className="h-4 w-4 mr-2" />
        Copy link
      </Button>
    </div>
  );
}
