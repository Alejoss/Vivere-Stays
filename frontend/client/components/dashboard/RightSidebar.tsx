import DateDetailsContent from "./DateDetailsContent";


interface RightSidebarProps {
  selectedDate: { day: number; month: string; year: string } | null;
  propertyId?: string;
  onPriceUpdate?: () => void;
  hasPMS?: boolean;
  selectedPriceOption?: string;
}

export default function RightSidebar({ selectedDate, propertyId, onPriceUpdate, hasPMS, selectedPriceOption }: RightSidebarProps) {
  return (
    <div className="w-[300px] flex flex-col gap-6 p-4 lg:pl-6 lg:pr-6 lg:mr-6">
      <DateDetailsContent
        selectedDate={selectedDate}
        propertyId={propertyId}
        onPriceUpdate={onPriceUpdate}
        hasPMS={hasPMS}
        selectedPriceOption={selectedPriceOption}
      />
    </div>
  );
}
