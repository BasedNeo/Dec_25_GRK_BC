import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertCircle, CheckCircle, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useQueryClient } from '@tanstack/react-query';
import { ClientValidator } from '@/lib/clientValidator';

interface CreateProposalModalProps {
  isOpen: boolean;
  onClose: () => void;
  walletAddress: string;
}

export function CreateProposalModal({ isOpen, onClose, walletAddress }: CreateProposalModalProps) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [durationDays, setDurationDays] = useState('7');
  const [category, setCategory] = useState('general');
  const [requiredQuorum, setRequiredQuorum] = useState('10');
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const validate = () => {
    const newErrors: Record<string, string> = {};

    const titleValidation = ClientValidator.validateProposalTitle(title);
    if (!titleValidation.valid) {
      newErrors.title = titleValidation.error || 'Invalid title';
    }
    
    const descValidation = ClientValidator.validateProposalDescription(description);
    if (!descValidation.valid) {
      newErrors.description = descValidation.error || 'Invalid description';
    }
    
    const duration = parseInt(durationDays);
    if (!duration || duration < 1 || duration > 30) {
      newErrors.duration = 'Duration must be between 1 and 30 days';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handlePreSubmit = () => {
    if (!validate()) {
      toast({ title: 'Validation Error', description: 'Please fix the errors before submitting', variant: 'destructive' });
      return;
    }
    setShowConfirmation(true);
  };

  const handleConfirmedSubmit = async () => {
    setIsSubmitting(true);

    try {
      const res = await fetch('/api/proposals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          description,
          proposer: walletAddress,
          durationDays: parseInt(durationDays),
          category,
          requiredQuorum: parseInt(requiredQuorum),
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to create proposal');
      }

      toast({ title: 'Proposal Created!', description: 'Your proposal is now live for voting' });
      setTitle('');
      setDescription('');
      setDurationDays('7');
      setCategory('general');
      setRequiredQuorum('10');
      setShowConfirmation(false);
      queryClient.invalidateQueries({ queryKey: ['proposals'] });
      onClose();
    } catch {
      toast({ title: 'Unable to Create', description: 'Could not create proposal. Please try again.', variant: 'destructive' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    setShowConfirmation(false);
    onClose();
  };

  if (showConfirmation) {
    return (
      <Dialog open={isOpen} onOpenChange={handleClose}>
        <DialogContent className="bg-black/95 border-cyan-500/50 w-[95vw] max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-lg sm:text-xl font-orbitron text-cyan-400">Confirm New Proposal</DialogTitle>
            <DialogDescription className="text-gray-400 text-sm">
              Please review your proposal before submitting.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 sm:space-y-4 py-3 sm:py-4">
            <div className="bg-white/5 rounded-lg p-3 sm:p-4 border border-cyan-500/30">
              <div className="text-xs sm:text-sm text-gray-400 mb-1 sm:mb-2">Title:</div>
              <div className="text-white font-bold text-sm sm:text-base break-words">{title}</div>
            </div>

            <div className="bg-white/5 rounded-lg p-3 sm:p-4 border border-cyan-500/30">
              <div className="text-xs sm:text-sm text-gray-400 mb-1 sm:mb-2">Description:</div>
              <div className="text-white text-xs sm:text-sm whitespace-pre-wrap break-words max-h-32 overflow-y-auto">{description}</div>
            </div>

            <div className="grid grid-cols-3 gap-2 sm:gap-4">
              <div className="bg-white/5 rounded-lg p-2 sm:p-3">
                <div className="text-xs text-gray-400 mb-1">Duration</div>
                <div className="text-white font-bold text-sm sm:text-base">{durationDays}d</div>
              </div>
              <div className="bg-white/5 rounded-lg p-2 sm:p-3">
                <div className="text-xs text-gray-400 mb-1">Category</div>
                <div className="text-white font-bold capitalize text-sm sm:text-base truncate">{category}</div>
              </div>
              <div className="bg-white/5 rounded-lg p-2 sm:p-3">
                <div className="text-xs text-gray-400 mb-1">Quorum</div>
                <div className="text-white font-bold text-sm sm:text-base">{requiredQuorum}</div>
              </div>
            </div>

            <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-3 sm:p-4 flex items-start gap-2 sm:gap-3">
              <AlertCircle className="w-4 h-4 sm:w-5 sm:h-5 text-yellow-400 flex-shrink-0 mt-0.5" />
              <div className="text-xs sm:text-sm text-yellow-200">
                This proposal will be visible immediately and users can vote on it.
              </div>
            </div>
          </div>

          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button 
              variant="outline" 
              onClick={() => setShowConfirmation(false)} 
              disabled={isSubmitting}
              className="w-full sm:w-auto min-h-[44px] touch-manipulation"
            >
              Go Back & Edit
            </Button>
            <Button
              onClick={handleConfirmedSubmit}
              disabled={isSubmitting}
              className="w-full sm:w-auto bg-gradient-to-r from-cyan-500 to-purple-500 text-black min-h-[44px] touch-manipulation"
              data-testid="confirm-create-proposal"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Creating...
                </>
              ) : (
                'Confirm & Create'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="bg-black/95 border-cyan-500/50 w-[95vw] max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl sm:text-2xl font-orbitron text-cyan-400">Create New Proposal</DialogTitle>
          <DialogDescription className="text-gray-400 text-sm">
            Fill out all fields to create a governance proposal
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 sm:space-y-6 py-3 sm:py-4">
          <div>
            <Label htmlFor="title" className="text-white text-sm">Proposal Title *</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g., Increase Treasury Allocation"
              className="bg-white/5 border-white/10 text-white mt-2 min-h-[44px]"
              maxLength={200}
              data-testid="proposal-title-input"
            />
            <div className="flex justify-between mt-1">
              {errors.title && <span className="text-red-400 text-xs">{errors.title}</span>}
              <span className="text-xs text-gray-500 ml-auto">{title.length}/200</span>
            </div>
          </div>

          <div>
            <Label htmlFor="description" className="text-white text-sm">Description *</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Provide detailed explanation of the proposal..."
              className="bg-white/5 border-white/10 text-white mt-2 min-h-[120px] sm:min-h-[150px]"
              maxLength={2000}
              data-testid="proposal-description-input"
            />
            <div className="flex justify-between mt-1">
              {errors.description && <span className="text-red-400 text-xs">{errors.description}</span>}
              <span className="text-xs text-gray-500 ml-auto">{description.length}/2000</span>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
            <div>
              <Label htmlFor="duration" className="text-white text-sm">Duration *</Label>
              <Select value={durationDays} onValueChange={setDurationDays}>
                <SelectTrigger className="bg-white/5 border-white/10 text-white mt-2 min-h-[44px]" data-testid="proposal-duration-select">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-black/95 border-white/20">
                  <SelectItem value="1">1 day</SelectItem>
                  <SelectItem value="3">3 days</SelectItem>
                  <SelectItem value="7">7 days</SelectItem>
                  <SelectItem value="14">14 days</SelectItem>
                  <SelectItem value="30">30 days</SelectItem>
                </SelectContent>
              </Select>
              {errors.duration && <span className="text-red-400 text-xs">{errors.duration}</span>}
            </div>

            <div>
              <Label htmlFor="category" className="text-white text-sm">Category</Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger className="bg-white/5 border-white/10 text-white mt-2 min-h-[44px]" data-testid="proposal-category-select">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-black/95 border-white/20">
                  <SelectItem value="general">General</SelectItem>
                  <SelectItem value="treasury">Treasury</SelectItem>
                  <SelectItem value="technical">Technical</SelectItem>
                  <SelectItem value="community">Community</SelectItem>
                  <SelectItem value="marketing">Marketing</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="quorum" className="text-white text-sm">Quorum</Label>
              <Input
                id="quorum"
                type="number"
                value={requiredQuorum}
                onChange={(e) => setRequiredQuorum(e.target.value)}
                min="1"
                max="100"
                className="bg-white/5 border-white/10 text-white mt-2 min-h-[44px]"
                data-testid="proposal-quorum-input"
              />
            </div>
          </div>

          <div className="bg-cyan-500/10 border border-cyan-500/30 rounded-lg p-3 sm:p-4 flex items-start gap-2 sm:gap-3">
            <CheckCircle className="w-4 h-4 sm:w-5 sm:h-5 text-cyan-400 flex-shrink-0 mt-0.5" />
            <div className="text-xs sm:text-sm text-cyan-200">
              All NFT holders can vote. Voting power = NFTs held. Proposals pass if FOR exceeds AGAINST and quorum is met.
            </div>
          </div>
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2">
          <Button 
            variant="outline" 
            onClick={handleClose}
            className="w-full sm:w-auto min-h-[44px] touch-manipulation"
          >
            Cancel
          </Button>
          <Button 
            onClick={handlePreSubmit} 
            className="w-full sm:w-auto bg-gradient-to-r from-cyan-500 to-purple-500 text-black min-h-[44px] touch-manipulation"
            data-testid="next-review-proposal"
          >
            Next: Review Proposal
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
