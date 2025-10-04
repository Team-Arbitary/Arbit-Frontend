import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";

export default function Vision() {
  const navigate = useNavigate();

  const handleProceed = () => {
    navigate("/dashboard");
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-gradient-to-b from-background to-[hsl(240_5%_98%)] dark:from-gray-900 dark:to-gray-800">
      {/* Decorative Grid Background */}
      <div 
        className="absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage: `
            linear-gradient(to right, hsl(240 6% 90%) 1px, transparent 1px),
            linear-gradient(to bottom, hsl(240 6% 90%) 1px, transparent 1px)
          `,
          backgroundSize: '80px 80px'
        }}
      />
      
      {/* Energy Wave Decoration */}
      <div className="absolute top-1/4 left-0 w-full h-px bg-gradient-to-r from-transparent via-primary/20 to-transparent" />
      {/* <div className="absolute top-1/3 left-0 w-full h-px bg-gradient-to-r from-transparent via-primary/10 to-transparent" /> */}
      <div className="absolute bottom-1/3 left-0 w-full h-px bg-gradient-to-r from-transparent via-primary/10 to-transparent" />
      
      {/* Main Content */}
      <div className="relative z-10 flex min-h-screen flex-col items-center justify-center px-4 py-16">
        <div className="mx-auto max-w-5xl text-center space-y-12">
          {/* Title */}
          <div className="space-y-4 animate-fade-in">
            <h1 className="text-7xl font-bold tracking-tight text-foreground md:text-8xl">
              Arbit <span className="text-primary">V1</span>
            </h1>
            <p className="text-xl text-muted-foreground md:text-2xl max-w-2xl mx-auto">
              Manage and inspect transformers with ease and efficiency.
            </p>
          </div>

          {/* CTA Button */}
          <div className="animate-fade-in-delay">
            <Button 
              variant="hero" 
              size="xl"
              className="group"
              onClick={handleProceed}
            >
              <span>Proceed to Dashboard</span>
              <svg 
                xmlns="http://www.w3.org/2000/svg" 
                width="20" 
                height="20" 
                viewBox="0 0 24 24" 
                fill="none" 
                stroke="currentColor" 
                strokeWidth="2" 
                strokeLinecap="round" 
                strokeLinejoin="round"
                className="transition-transform group-hover:translate-x-1"
              >
                <path d="M5 12h14"/>
                <path d="m12 5 7 7-7 7"/>
              </svg>
            </Button>
          </div>

          {/* Transformer Image */}
          <div className="relative group">
            <div className="absolute -inset-4 bg-gradient-to-r from-primary/20 via-purple-500/20 to-primary/20 rounded-3xl blur-3xl opacity-30 group-hover:opacity-50 transition-opacity duration-500" />
            <div className="relative bg-gradient-to-br from-white to-gray-50 dark:from-gray-800 dark:to-gray-900 rounded-3xl p-8 shadow-lg border border-border/50">
              <img
                src="/transformer-hero.png"
                alt="Transformer 3D Illustration"
                className="w-full max-w-xl mx-auto h-auto object-contain animate-float"
              />
            </div>
          </div>

          
        </div>
      </div>

      {/* Footer */}
      <div className="absolute bottom-8 left-0 right-0 text-center">
        <p className="text-sm text-muted-foreground">
          Professional Transformer Inspection Management
        </p>
      </div>
    </div>
  );
}
