import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../ui/dialog";
import DateDetailsContent from "./DateDetailsContent";

interface DateDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedDate: { day: number; month: string; year: string } | null;
  propertyId?: string;
  onPriceUpdate?: () => void;
  hasPMS?: boolean;
  selectedPriceOption?: string;
}

export default function DateDetailsModal({ 
  isOpen, 
  onClose, 
  selectedDate, 
  propertyId, 
  onPriceUpdate, 
  hasPMS, 
  selectedPriceOption 
}: DateDetailsModalProps) {
  if (!selectedDate) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md mx-auto max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-center text-xl font-bold text-hotel-brand">
            Date Details
          </DialogTitle>
        </DialogHeader>
        
        <DateDetailsContent
          selectedDate={selectedDate}
          propertyId={propertyId}
          onPriceUpdate={onPriceUpdate}
          onModalClose={onClose}
          hasPMS={hasPMS}
          selectedPriceOption={selectedPriceOption}
        />
      </DialogContent>
    </Dialog>
  );
}
