
'use client';

import { useState } from 'react';
import { useToast } from "@/hooks/use-toast";
import { FileUp, UploadCloud, Eye, Bot, AlertTriangle, ShieldCheck, HelpCircle } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useDropzone, type FileRejection } from 'react-dropzone';
import { cn } from '@/lib/utils';
import Image from 'next/image';
import { diagnoseEyeIllness, type DiagnoseEyeIllnessOutput } from '@/ai/flows/diagnose-eye-illness';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';

const SeverityConfig = {
    'Low': {
        icon: ShieldCheck,
        color: 'border-yellow-500/50 text-yellow-400',
        label: 'Low Severity'
    },
    'Medium': {
        icon: AlertTriangle,
        color: 'border-orange-500/50 text-orange-400',
        label: 'Medium Severity'
    },
    'High': {
        icon: AlertTriangle,
        color: 'border-red-500/50 text-red-500',
        label: 'High Severity'
    },
    'Unknown': {
        icon: HelpCircle,
        color: 'border-gray-500/50 text-gray-400',
        label: 'Unknown'
    }
};


const EyeFileUploader = ({ onFileUpload, isProcessing }: { onFileUpload: (file: File, description: string) => void, isProcessing: boolean }) => {
  const { toast } = useToast();
  const [description, setDescription] = useState('');
  const [preview, setPreview] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);

  const onDrop = (acceptedFiles: File[], fileRejections: FileRejection[]) => {
    if (fileRejections.length > 0) {
      toast({
        title: "File upload failed",
        description: "Please upload a single PNG, or JPG file.",
        variant: "destructive",
      });
      return;
    }
    if (acceptedFiles.length > 0) {
      const currentFile = acceptedFiles[0];
      setFile(currentFile);
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreview(reader.result as string);
      };
      reader.readAsDataURL(currentFile);
    }
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "image/png": [".png"],
      "image/jpeg": [".jpg", ".jpeg"],
    },
    multiple: false,
    maxFiles: 1,
  });

  const handleSubmit = () => {
      if (!file) {
          toast({ title: "No file selected", description: "Please upload an image of the eye.", variant: "destructive" });
          return;
      }
      if (!description.trim()) {
          toast({ title: "Description missing", description: "Please describe your symptoms or concerns.", variant: "destructive" });
          return;
      }
      onFileUpload(file, description);
  }

  return (
    <Card className="w-full max-w-4xl mx-auto shadow-lg animate-fade-in">
      <CardHeader className="text-center">
        <div className="flex justify-center items-center gap-2 mb-2">
            <Eye className="w-8 h-8 text-primary" />
            <h1 className="text-3xl font-headline font-bold text-primary">AI Eye Analyzer</h1>
        </div>
        <CardDescription>Upload a clear picture of an eye to get an AI-powered preliminary analysis of potential conditions.</CardDescription>
      </CardHeader>
      <CardContent className="grid md:grid-cols-2 gap-6 items-start">
        <div
          {...getRootProps()}
          className={cn(
            "relative flex flex-col items-center justify-center w-full h-full min-h-[300px] p-4 border-2 border-dashed rounded-xl cursor-pointer transition-colors duration-200",
            isDragActive ? "border-primary bg-accent/50" : "border-border hover:border-primary/50 hover:bg-muted"
          )}
        >
          <input {...getInputProps()} />
          {preview ? (
            <Image src={preview} alt="Eye preview" width={300} height={300} className="object-contain rounded-md max-h-[300px]" />
          ) : (
            <div className="flex flex-col items-center gap-4 text-center text-muted-foreground">
              <UploadCloud className="w-16 h-16 text-primary/70" />
              <p className="font-semibold text-lg">
                {isDragActive ? "Drop the image here" : "Drag & drop an eye image or click"}
              </p>
              <p className="text-sm">Supported formats: PNG, JPG</p>
            </div>
          )}
        </div>
        <div className='space-y-4'>
            <Textarea 
                placeholder="Describe your symptoms... e.g., 'My eye has been red and itchy for two days, and there's some blurry vision.'"
                className="min-h-[150px] text-base"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                disabled={isProcessing}
            />
            <Button onClick={handleSubmit} className="w-full" disabled={isProcessing || !file || !description.trim()}>
                <Bot className="mr-2 h-4 w-4" />
                Analyze Eye
            </Button>
            <p className="text-xs text-center text-muted-foreground p-2 rounded-md bg-destructive/10 border border-destructive/20">
                <AlertTriangle className="inline-block w-4 h-4 mr-1" />
                This is an experimental tool and not a medical diagnosis. Always consult a qualified ophthalmologist for any health concerns.
            </p>
        </div>
      </CardContent>
    </Card>
  );
};


const ProcessingState = () => (
    <div className="w-full max-w-2xl mx-auto p-8 space-y-6 flex flex-col items-center justify-center min-h-[70vh] text-center">
        <Eye className="w-24 h-24 text-primary animate-pulse" />
        <h2 className="text-2xl font-headline font-bold mt-4">Analyzing Eye Image...</h2>
        <p className="text-muted-foreground">The AI is examining the details. This may take a moment.</p>
        <div className="w-full space-y-4 mt-8">
        <Skeleton className="h-4 w-3/4 mx-auto" />
        <Skeleton className="h-4 w-1/2 mx-auto" />
        </div>
    </div>
);

const AnalysisResultDisplay = ({ analysis, onReset }: { analysis: DiagnoseEyeIllnessOutput, onReset: () => void }) => {
    const severity = analysis.severity || 'Unknown';
    const config = SeverityConfig[severity];
    const Icon = config.icon;

    return (
        <Card className="w-full max-w-4xl mx-auto shadow-lg animate-fade-in">
            <CardHeader>
                 <CardTitle className="font-headline text-2xl text-primary flex items-center gap-2"><Bot />AI Analysis Result</CardTitle>
                 <div className="flex items-center gap-2 pt-2">
                    <Badge variant="outline" className={cn("flex items-center gap-2 text-base px-3 py-1", config.color)}>
                        <Icon className="w-5 h-5" />
                        <span>{config.label}</span>
                    </Badge>
                </div>
            </CardHeader>
            <CardContent className="space-y-6">
                <div>
                    <h3 className="text-lg font-semibold text-foreground">Possible Condition</h3>
                    <p className="text-xl font-bold text-primary">{analysis.possibleCondition}</p>
                </div>
                 <div>
                    <h3 className="text-lg font-semibold text-foreground">Description</h3>
                    <p className="text-muted-foreground whitespace-pre-wrap">{analysis.description}</p>
                </div>
                 <div className="p-4 rounded-md bg-destructive/10 border border-destructive/50">
                    <h4 className="font-bold text-destructive flex items-center gap-2"><AlertTriangle />Disclaimer</h4>
                    <p className="text-sm text-destructive/90">{analysis.disclaimer}</p>
                 </div>
                 <div className="text-center mt-4">
                    <Button variant="outline" onClick={onReset}>Analyze Another Image</Button>
                </div>
            </CardContent>
        </Card>
    )
}


export default function EyeAnalyzerPage() {
  const [isProcessing, setIsProcessing] = useState(false);
  const [analysis, setAnalysis] = useState<DiagnoseEyeIllnessOutput | null>(null);
  const { toast } = useToast();

  const handleFileUpload = async (file: File, description: string) => {
    setIsProcessing(true);
    setAnalysis(null);

    try {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = async () => {
        try {
          const dataUri = reader.result as string;
          const result = await diagnoseEyeIllness({ imageDataUri: dataUri, userDescription: description });
          setAnalysis(result);
        } catch (error) {
          console.error("Eye Analysis Error:", error);
          toast({
            title: "Analysis Failed",
            description: "Something went wrong processing the eye image. The AI may not be available at the moment.",
            variant: "destructive",
          });
          handleReset();
        } finally {
          setIsProcessing(false);
        }
      };
      reader.onerror = () => {
        throw new Error("Failed to read the image file.");
      }
    } catch (error) {
      console.error("File Read Error:", error);
      toast({
        title: "File Error",
        description: "Something went wrong while reading your file. Please try again.",
        variant: "destructive",
      });
      handleReset();
    }
  };

  const handleReset = () => {
    setAnalysis(null);
    setIsProcessing(false);
  };

  if (isProcessing) {
      return <ProcessingState />;
  }

  if (analysis) {
      return <AnalysisResultDisplay analysis={analysis} onReset={handleReset} />
  }

  return (
    <EyeFileUploader onFileUpload={handleFileUpload} isProcessing={isProcessing} />
  )
}
