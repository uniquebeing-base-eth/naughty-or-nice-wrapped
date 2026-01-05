import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { HelmetProvider } from "react-helmet-async";
import { FarcasterProvider } from "@/contexts/FarcasterContext";
import Index from "./pages/Index";
import Share from "./pages/Share";
import Bloomers from "./pages/Bloomers";
import BloomTipping from "./pages/BloomTipping";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <HelmetProvider>
      <FarcasterProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <Routes>
              <Route path="/" element={<Index />} />
              <Route path="/share" element={<Share />} />
              <Route path="/bloomers" element={<Bloomers />} />
              <Route path="/bloom-tipping" element={<BloomTipping />} />
              {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </TooltipProvider>
      </FarcasterProvider>
    </HelmetProvider>
  </QueryClientProvider>
);

export default App;