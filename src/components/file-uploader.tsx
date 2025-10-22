"use client";

import { useCallback } from "react";
import { useDropzone, type FileRejection } from "react-dropzone";
import { FileUp, UploadCloud } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

type FileUploaderProps = {
  onFileUpload: (file: File) => void;
};

export function FileUploader({ onFileUpload }: FileUploaderProps) {
  const { toast } = useToast();

  const onDrop = useCallback(
    (acceptedFiles: File[], fileRejections: FileRejection[]) => {
      if (fileRejections.length > 0) {
        toast({
          title: "File upload failed",
          description: "Please upload a single PDF, PNG, or JPG file.",
          variant: "destructive",
        });
        return;
      }
      if (acceptedFiles.length > 0) {
        onFileUpload(acceptedFiles[0]);
      }
    },
    [onFileUpload, toast]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "application/pdf": [".pdf"],
      "image/png": [".png"],
      "image/jpeg": [".jpg", ".jpeg"],
    },
    multiple: false,
    maxFiles: 1,
  });

  return (
    <Card className="w-full shadow-lg animate-fade-in h-full">
      <CardHeader className="text-center">
        <CardTitle className="text-2xl font-headline text-primary">Analyze New Report</CardTitle>
        <CardDescription>Upload a file to get AI-powered insights in seconds.</CardDescription>
      </CardHeader>
      <CardContent className="h-full">
        <div
          {...getRootProps()}
          className={cn(
            "relative flex flex-col items-center justify-center w-full h-full min-h-[40vh] p-4 border-2 border-dashed rounded-xl cursor-pointer transition-colors duration-200",
            isDragActive ? "border-primary bg-accent/50" : "border-border hover:border-primary/50 hover:bg-muted"
          )}
        >
          <input {...getInputProps()} />
          <div className="flex flex-col items-center gap-4 text-center text-muted-foreground">
            <UploadCloud className="w-16 h-16 text-primary/70" />
            <p className="font-semibold text-lg">
              {isDragActive ? "Drop the file here" : "Drag & drop a file or click to upload"}
            </p>
            <p className="text-sm">Supported formats: PDF, PNG, JPG</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
