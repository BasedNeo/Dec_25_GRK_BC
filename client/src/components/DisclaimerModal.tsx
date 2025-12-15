import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { AlertTriangle } from "lucide-react";

export function DisclaimerModal() {
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    const hasSeenDisclaimer = localStorage.getItem("has-seen-disclaimer");
    if (!hasSeenDisclaimer) {
      setIsOpen(true);
    }
  }, []);

  const handleAccept = () => {
    localStorage.setItem("has-seen-disclaimer", "true");
    setIsOpen(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => {
      // Prevent closing by clicking outside if strictly required, 
      // but for "polish" allowing standard dismiss is usually fine.
      // We'll force explicit acceptance for better legal posture.
      if (!open && localStorage.getItem("has-seen-disclaimer")) {
        setIsOpen(false);
      }
    }}>
      <DialogContent className="bg-black border-red-500/50 text-white sm:max-w-md" onInteractOutside={(e) => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-red-500 font-orbitron tracking-widest">
            <AlertTriangle className="h-5 w-5" />
            BETA ENVIRONMENT
          </DialogTitle>
          <div className="text-gray-400 pt-4 font-rajdhani text-base leading-relaxed">
            You are entering a <strong>Testnet Beta</strong> environment.
            <ul className="list-disc pl-5 mt-2 space-y-1 text-sm text-gray-500">
              <li>All funds and assets are on Base Sepolia (Testnet).</li>
              <li>Financial values shown are estimates and <strong>not real</strong>.</li>
              <li>Smart contracts are experimental and unaudited.</li>
            </ul>
          </div>
        </DialogHeader>
        <DialogFooter className="sm:justify-center mt-4">
          <Button
            onClick={handleAccept}
            className="w-full bg-red-600 text-white hover:bg-red-500 font-orbitron tracking-widest shadow-[0_0_15px_rgba(239,68,68,0.4)]"
          >
            I UNDERSTAND & ACCEPT RISKS
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
