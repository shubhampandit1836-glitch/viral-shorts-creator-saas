"use client";

import { Upload } from "lucide-react";
import { Button } from "@acf/ui";
import { useState } from "react";
import { UploadModal } from "./upload-modal";

export function Navbar({ title }: { title: string }) {
  const [uploadOpen, setUploadOpen] = useState(false);

  return (
    <>
      <header className="flex h-14 items-center justify-between border-b border-[#E8E6E1] bg-white px-6">
        <h1 className="text-lg font-semibold text-[#1A1A1A]">{title}</h1>
        <Button variant="accent" onClick={() => setUploadOpen(true)}>
          <Upload className="h-4 w-4" />
          Upload Video
        </Button>
      </header>
      <UploadModal open={uploadOpen} onClose={() => setUploadOpen(false)} />
    </>
  );
}
