import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Sparkles } from "lucide-react";

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
      if (!open && localStorage.getItem("has-seen-disclaimer")) {
        setIsOpen(false);
      }
    }}>
      <DialogContent className="bg-black/95 border-cyan-500/30 text-white sm:max-w-md" onInteractOutside={(e) => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle className="flex items-center justify-center gap-2 text-cyan-400 font-orbitron tracking-widest text-xl">
            <Sparkles className="h-5 w-5" />
            WELCOME GUARDIAN
            <Sparkles className="h-5 w-5" />
          </DialogTitle>
          <div className="text-gray-300 pt-4 font-rajdhani text-base leading-relaxed text-center">
            <p className="mb-4">
              Thanks for trying our application! Our team works to make it better every day.
            </p>
            <p className="text-sm text-gray-500">
              This is a beta release on BasedAI L1. Some features are still being refined.
            </p>
          </div>
        </DialogHeader>
        <DialogFooter className="sm:justify-center mt-4">
          <Button
            onClick={handleAccept}
            className="w-full bg-cyan-500 text-white hover:bg-cyan-400 font-orbitron tracking-widest shadow-[0_0_15px_rgba(0,255,255,0.4)]"
          >
            LET'S GO
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
