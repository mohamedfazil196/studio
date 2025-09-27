"use client";

import { useCallback } from "react";
import { useDropzone, type FileRejection } from "react-dropzone";
import { FileUp } from "lucide-react";
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
    <Card className="w-full max-w-2xl mx-auto shadow-lg animate-fade-in">
      <CardHeader className="text-center">
        <CardTitle className="text-2xl font-headline">Upload Your Medical Report</CardTitle>
        <CardDescription>Get AI-powered insights in seconds.</CardDescription>
      </CardHeader>
      <CardContent>
        <div
          {...getRootProps()}
          className={cn(
            "relative flex flex-col items-center justify-center w-full h-64 p-4 border-2 border-dashed rounded-xl cursor-pointer transition-colors duration-200",
            isDragActive ? "border-primary bg-accent/50" : "border-border hover:border-primary/50 hover:bg-muted"
          )}
        >
          <input {...getInputProps()} />
          <div className="flex flex-col items-center gap-2 text-center text-muted-foreground">
            <FileUp className="w-12 h-12 text-primary" />
            <p className="font-semibold">
              {isDragActive ? "Drop the file here" : "Drag &amp; drop a file or click to upload"}
            </p>
            <p className="text-sm">Supported formats: PDF, PNG, JPG</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
