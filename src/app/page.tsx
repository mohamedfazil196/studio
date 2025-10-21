
"use client";

import { Header } from '@/components/layout/header';
import { Button } from '@/components/ui/button';
import { ArrowRight, FileHeart, Bot, Stethoscope, Lightbulb } from 'lucide-react';
import Link from 'next/link';

export default function Home() {

  const FeatureCard = ({ icon, title, description }: { icon: React.ReactNode, title: string, description: string }) => (
    <div className="bg-card/50 backdrop-blur-sm p-6 rounded-lg border border-primary/10 flex flex-col items-center text-center transform transition-transform duration-300 hover:scale-105 hover:border-primary/30">
      <div className="bg-primary/10 p-3 rounded-full mb-4 border border-primary/20">
        {icon}
      </div>
      <h3 className="text-xl font-headline font-bold mb-2 text-foreground">{title}</h3>
      <p className="text-muted-foreground text-sm">{description}</p>
    </div>
  );

  return (
    <div className="flex flex-col min-h-screen bg-background text-foreground">
      <Header />
      <main className="flex-grow">
        {/* Hero Section */}
        <section className="text-center py-20 lg:py-32 px-4 relative overflow-hidden">
             <div className="absolute inset-0 bg-grid-primary/5 [mask-image:linear-gradient(to_bottom,white_10%,transparent_90%)]"></div>
             <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_rgba(var(--primary-rgb),0.1),_transparent_40%)]"></div>
          <div className="max-w-4xl mx-auto relative z-10">
            <h1 className="text-4xl md:text-6xl font-headline font-bold text-transparent bg-clip-text bg-gradient-to-r from-primary-foreground to-primary">
              Welcome to MediScan AI
            </h1>
            <p className="mt-4 text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto">
              Unlock the future of personal health. Analyze your medical reports with the power of AI to gain clear, actionable insights.
            </p>
            <div className="mt-8 flex justify-center gap-4">
              <Button asChild size="lg" className="group">
                <Link href="/login">
                  Get Started <ArrowRight className="w-5 h-5 ml-2 transition-transform group-hover:translate-x-1" />
                </Link>
              </Button>
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section id="features" className="py-20 lg:py-24 px-4 bg-background/80 backdrop-blur-lg">
          <div className="max-w-7xl mx-auto">
            <div className="text-center mb-12">
              <h2 className="text-3xl md:text-4xl font-headline font-bold text-foreground">Features at Your Fingertips</h2>
              <p className="mt-2 text-md text-muted-foreground">Empowering you with knowledge and control over your health journey.</p>
            </div>
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
              <FeatureCard 
                icon={<FileHeart className="w-8 h-8 text-primary" />}
                title="AI Report Analysis"
                description="Upload your medical reports (PDFs, images) and get instant, AI-driven analysis."
              />
              <FeatureCard 
                icon={<Stethoscope className="w-8 h-8 text-primary" />}
                title="Doctor & Patient Summaries"
                description="Receive both a detailed technical summary for medical professionals and a simple, easy-to-understand version for you."
              />
              <FeatureCard 
                icon={<Bot className="w-8 h-8 text-primary" />}
                title="AI Medical Chatbot"
                description="Have questions about your report? Ask our AI assistant for clarification and further information."
              />
              <FeatureCard 
                icon={<Lightbulb className="w-8 h-8 text-primary" />}
                title="Lifestyle Suggestions"
                description="Get personalized lifestyle and health recommendations based on your report's findings."
              />
            </div>
          </div>
        </section>

        {/* Footer */}
        <footer className="text-center p-6 text-sm text-muted-foreground border-t border-border">
          <p>&copy; {new Date().getFullYear()} MediScan AI. For demonstration purposes only. Not for real medical diagnosis.</p>
        </footer>
      </main>
    </div>
  );
}
