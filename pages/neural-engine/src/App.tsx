import { Header } from "./components/Header";
import { BottomNav } from "./components/BottomNav";
import { BackgroundBlobs } from "./components/BackgroundBlobs";
import { NeuralNode } from "./components/NeuralNode";
import { InsightPanel } from "./components/InsightPanel";
import { Sigma, Triangle, Zap } from "lucide-react";

export default function App() {
  return (
    <div className="min-h-screen pb-32">
      <Header />
      <BackgroundBlobs />
      
      <main className="pt-24 px-6 relative">
        {/* Vertical Problem Map Section */}
        <div className="relative flex flex-col items-center">
          {/* Header Label */}
          <div className="mb-12 text-center">
            <span className="text-[12px] uppercase tracking-[0.2em] text-on-surface-variant font-medium">
              Active Processing
            </span>
            <h2 className="font-headline text-3xl font-bold tracking-tight text-primary-fixed mt-2">
              Multivariable Optimization
            </h2>
          </div>

          {/* Vertical Tree */}
          <div className="relative flex flex-col gap-16 w-full max-w-md items-center">
            {/* Connectivity Line */}
            <div className="absolute top-0 bottom-0 left-1/2 -translate-x-1/2 vertical-line -z-10" />

            {/* Node 1: Primary Equation */}
            <NeuralNode 
              icon={Sigma}
              title="Lagrange Multipliers"
              subtitle="f(x,y) subject to g(x,y)=c"
              tag="Root Level"
              tagColor="primary"
            />

            {/* Node 2: Sub-Process */}
            <div className="relative w-full flex flex-col items-center">
              <NeuralNode 
                icon={Triangle}
                title="Partial Derivatives"
                subtitle="Calculating instantaneous rates of change across vector fields."
                tag="Gradient Descent"
                tagColor="secondary"
              />
              {/* Small Connector Node */}
              <div className="absolute -bottom-8 left-1/2 -translate-x-1/2 w-3 h-3 rounded-full bg-secondary shadow-[0_0_10px_#ff51fa]" />
            </div>

            {/* Node 3: Foundational */}
            <NeuralNode 
              icon={Zap}
              title="The Power Rule"
              subtitle="d/dx(xⁿ) = nxⁿ⁻¹"
              tag="Foundational"
              tagColor="tertiary"
              className="opacity-80 scale-95"
            />
          </div>
        </div>
      </main>

      <InsightPanel />
      <BottomNav />
    </div>
  );
}
