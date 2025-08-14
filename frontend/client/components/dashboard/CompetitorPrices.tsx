import { useState } from "react";

interface Competitor {
  name: string;
  price: number;
}

const competitorData: Competitor[] = [
  { name: "Villa Maria", price: 64 },
  { name: "Yedrada Alojamientos", price: 63 },
  { name: "Hotel la canela", price: 63 },
  { name: "Hostal mainz", price: 72 },
];

interface CompetitorPricesProps {
  selectedDate?: string;
}

export default function CompetitorPrices({
  selectedDate = "1/1/2025",
}: CompetitorPricesProps) {
  const [suggestedPrice, setSuggestedPrice] = useState("66");

  const handleUpdatePrice = () => {
    // Handle price update logic here
    console.log("Updating price to:", suggestedPrice);
  };

  return (
    <div className="flex flex-col p-[23px] border border-hotel-border-light rounded-lg bg-white">
      {/* Header */}
      <h3 className="text-[15px] font-bold text-hotel-brand mb-[20px]">
        Competitor Prices - {selectedDate}
      </h3>

      {/* Occupancy */}
      <div className="text-[15px] font-bold text-hotel-status-connected mb-[20px]">
        Occupancy 234
      </div>

      {/* Competitor List */}
      <div className="flex flex-col mb-[20px]">
        {competitorData.map((competitor, index) => (
          <div
            key={competitor.name}
            className={`flex justify-between items-center py-[13px] px-[2px] ${
              index < competitorData.length - 1
                ? "border-b-[1.5px] border-hotel-border-light"
                : ""
            }`}
          >
            <span className="text-[14px] font-semibold text-black">
              {competitor.name}
            </span>
            <span className="text-[15px] font-semibold text-gray-600">
              $ {competitor.price}
            </span>
          </div>
        ))}
      </div>

      {/* Suggested Price Section */}
      <div className="border border-blue-300 rounded-[9px] bg-blue-50 p-[15px]">
        <div className="text-[15px] font-semibold text-blue-700 mb-[11px]">
          Suggested price:
        </div>

        {/* Price Input */}
        <div className="relative mb-[10px]">
          <div className="absolute left-[15px] top-1/2 transform -translate-y-1/2 text-[17px] font-medium text-blue-700">
            $
          </div>
          <input
            type="number"
            value={suggestedPrice}
            onChange={(e) => setSuggestedPrice(e.target.value)}
            className="w-full pl-[35px] pr-[15px] py-[11px] border border-blue-300 rounded-md bg-white text-[16px] font-normal text-black focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* Update Button */}
        <button
          onClick={handleUpdatePrice}
          className="w-full py-[11px] bg-blue-600 hover:bg-blue-700 rounded-lg text-white text-[14px] font-medium transition-colors"
        >
          Update price
        </button>
      </div>
    </div>
  );
}
