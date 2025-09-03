import {
  Bot,
  Plus,
  Check,
  Info,
  Trash2,
  ChevronDown,
  TrendingUp,
  TrendingDown,
  BarChart3,
  Minus,
} from "lucide-react";
import { useState, useEffect } from "react";

export default function Competitors() {
  const [selectedAggregation, setSelectedAggregation] = useState("Minimum");
  const [showDropdown, setShowDropdown] = useState(false);

  const aggregationOptions = ["Maximum", "Average", "Median", "Minimum"];

  // Function to get the appropriate icon for each aggregation method
  const getAggregationIcon = (aggregation: string) => {
    switch (aggregation) {
      case "Maximum":
        return <TrendingUp size={24} className="text-[#16B257]" />;
      case "Average":
        return <BarChart3 size={24} className="text-[#16B257]" />;
      case "Median":
        return <Minus size={24} className="text-[#16B257]" />;
      case "Minimum":
        return <TrendingDown size={24} className="text-[#16B257]" />;
      default:
        return <BarChart3 size={24} className="text-[#16B257]" />;
    }
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = () => {
      setShowDropdown(false);
    };

    if (showDropdown) {
      document.addEventListener("click", handleClickOutside);
    }

    return () => {
      document.removeEventListener("click", handleClickOutside);
    };
  }, [showDropdown]);

  const competitors = [
    {
      id: 1,
      name: "Casa Batllo - Premium Suite",
      url: "https://booking.com/hotel/luxury-apt",
      status: "success",
      onlyFollow: false,
    },
    {
      id: 2,
      name: "Modern Studio City Center",
      url: "https://booking.com/hotel/modern-studio",
      status: "loading",
      onlyFollow: true,
    },
    {
      id: 3,
      name: "Cozy Flat Near Beach",
      url: "https://booking.com/hotel/cozy-flat",
      status: "error",
      onlyFollow: false,
    },
  ];

  const StatusIcon = ({ status }: { status: string }) => {
    switch (status) {
      case "success":
        return (
          <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
            <Check size={23} className="text-green-600" />
          </div>
        );
      case "loading":
        return (
          <div className="w-10 h-10 bg-[#B5D4E6] rounded-full flex items-center justify-center">
            <img
              src="https://api.builder.io/api/v1/image/assets/TEMP/17285f0c16a08fdae17008b23731660b66f9a5cb?width=140"
              alt="Loading"
              className="w-[70px] h-[70px] -ml-[15px] -mt-[17px]"
            />
          </div>
        );
      case "error":
        return (
          <div className="w-10 h-10 bg-red-200 rounded-full flex items-center justify-center">
            <div className="w-6 h-6 text-red-500">
              <svg
                width="22"
                height="22"
                viewBox="0 0 22 22"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M11 15.582C11.2598 15.582 11.4776 15.494 11.6536 15.318C11.8296 15.142 11.9173 14.9245 11.9167 14.6654C11.9161 14.4063 11.8281 14.1887 11.6527 14.0127C11.4773 13.8367 11.2598 13.7487 11 13.7487C10.7403 13.7487 10.5228 13.8367 10.3474 14.0127C10.172 14.1887 10.084 14.4063 10.0834 14.6654C10.0828 14.9245 10.1708 15.1423 10.3474 15.3189C10.524 15.4956 10.7415 15.5833 11 15.582ZM11 11.9154C11.2598 11.9154 11.4776 11.8274 11.6536 11.6514C11.8296 11.4754 11.9173 11.2578 11.9167 10.9987V7.33203C11.9167 7.07231 11.8287 6.85475 11.6527 6.67936C11.4767 6.50398 11.2592 6.41598 11 6.41536C10.7409 6.41475 10.5234 6.50275 10.3474 6.67936C10.1714 6.85598 10.0834 7.07353 10.0834 7.33203V10.9987C10.0834 11.2584 10.1714 11.4763 10.3474 11.6523C10.5234 11.8283 10.7409 11.916 11 11.9154ZM11 20.1654C9.73199 20.1654 8.54032 19.9246 7.42504 19.443C6.30976 18.9615 5.33963 18.3085 4.51463 17.4841C3.68963 16.6597 3.03665 15.6896 2.55571 14.5737C2.07476 13.4578 1.83399 12.2661 1.83338 10.9987C1.83276 9.73125 2.07354 8.53959 2.55571 7.4237C3.03788 6.30781 3.69085 5.33767 4.51463 4.51328C5.3384 3.68889 6.30854 3.03592 7.42504 2.55436C8.54154 2.07281 9.73321 1.83203 11 1.83203C12.2669 1.83203 13.4585 2.07281 14.575 2.55436C15.6915 3.03592 16.6617 3.68889 17.4855 4.51328C18.3092 5.33767 18.9625 6.30781 19.4453 7.4237C19.9281 8.53959 20.1685 9.73125 20.1667 10.9987C20.1649 12.2661 19.9241 13.4578 19.4444 14.5737C18.9647 15.6896 18.3117 16.6597 17.4855 17.4841C16.6592 18.3085 15.6891 18.9618 14.575 19.4439C13.461 19.9261 12.2693 20.1666 11 20.1654ZM11 18.332C13.0473 18.332 14.7813 17.6216 16.2021 16.2008C17.623 14.7799 18.3334 13.0459 18.3334 10.9987C18.3334 8.95148 17.623 7.21745 16.2021 5.79661C14.7813 4.37578 13.0473 3.66536 11 3.66536C8.95282 3.66536 7.21879 4.37578 5.79796 5.79661C4.37713 7.21745 3.66671 8.95148 3.66671 10.9987C3.66671 13.0459 4.37713 14.7799 5.79796 16.2008C7.21879 17.6216 8.95282 18.332 11 18.332Z"
                  fill="#EF4444"
                />
              </svg>
            </div>
          </div>
        );
      default:
        return null;
    }
  };

  const ToggleSwitch = ({ enabled }: { enabled: boolean }) => (
    <div
      className={`w-14 h-8 rounded-full flex items-center ${enabled ? "bg-[#2C4E60]" : "bg-gray-300"} transition-colors`}
    >
      <div
        className={`w-6 h-6 bg-white rounded-full transition-transform ${enabled ? "translate-x-7" : "translate-x-1"}`}
      />
    </div>
  );

  return (
    <div className="min-h-screen bg-white">
      {/* Main Content */}
      <div className="px-6 py-8">
        <div className="bg-white rounded-lg border border-black/10 shadow-lg p-8">
          {/* Section Header */}
          <div className="flex items-center mb-6">
            <div className="flex items-center gap-3">
              <svg
                width="30"
                height="30"
                viewBox="0 0 30 30"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <g clipPath="url(#clip0_251_4502)">
                  <path
                    d="M5.24 9.375H23.4925M5.24 14.375H23.4925M10.625 3.5625V15.625M18.125 3.5625V15.625M23.0512 15.625L24.375 11.875L22.0675 5.33625L14.375 1.875L6.6825 5.33625L4.375 11.875L5.69875 15.625M6.875 23.125L4.375 24.375L1.875 23.125V20L4.375 18.75L6.875 20V23.125ZM8.125 29.375V26.875L4.375 25.625L0.625 26.875V29.375H8.125ZM18.125 29.375V26.875L14.375 25.625L10.625 26.875V29.375H18.125ZM28.125 29.375V26.875L24.375 25.625L20.625 26.875V29.375H28.125ZM16.875 23.125L14.375 24.375L11.875 23.125V20L14.375 18.75L16.875 20V23.125ZM26.875 23.125L24.375 24.375L21.875 23.125V20L24.375 18.75L26.875 20V23.125Z"
                    stroke="#287CAC"
                    strokeWidth="1.66667"
                    strokeMiterlimit="10"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </g>
                <defs>
                  <clipPath id="clip0_251_4502">
                    <rect width="30" height="30" fill="white" />
                  </clipPath>
                </defs>
              </svg>
              <div>
                <h2 className="text-3xl font-bold text-[#287CAC]">
                  Competitors
                </h2>
                <p className="text-[#8A8E94] font-bold text-lg">
                  Manage your competitor tracking
                </p>
              </div>
            </div>
          </div>

          {/* Competitor Price Aggregation */}
          <div className="bg-white rounded-lg border border-black/10 p-6 mb-8">
            <div className="max-w-lg">
              <label className="block text-[#6D6D77] font-bold text-lg mb-2">
                Competitor Price Aggregation
              </label>
              <div className="relative">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowDropdown(!showDropdown);
                  }}
                  className="flex items-center justify-between w-full px-8 py-3 border border-[#9CAABD] rounded-lg bg-white mb-3 hover:border-[#287CAC] transition-colors"
                >
                  <div className="flex items-center gap-5">
                    {getAggregationIcon(selectedAggregation)}
                    <span className="text-[#60615F] font-bold text-lg">
                      {selectedAggregation}
                    </span>
                  </div>
                  <ChevronDown
                    size={16}
                    className={`text-black transition-transform ${showDropdown ? "rotate-180" : ""}`}
                  />
                </button>

                {showDropdown && (
                  <div className="absolute top-full left-0 right-0 z-10 bg-white border border-[#9CAABD] rounded-lg shadow-lg mt-1">
                    {aggregationOptions.map((option) => (
                      <button
                        key={option}
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedAggregation(option);
                          setShowDropdown(false);
                        }}
                        className={`w-full px-8 py-3 text-left hover:bg-gray-50 transition-colors flex items-center gap-5 ${
                          option === selectedAggregation ? "bg-blue-50" : ""
                        }`}
                      >
                        {getAggregationIcon(option)}
                        <span className="text-[#60615F] font-bold text-lg">
                          {option}
                        </span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <p className="text-[#9CAABD] text-xs">
                Defines how to reference your prices compared to competitors
                (Maximum, Average, Median, Minimum). Default: Minimum
              </p>
            </div>
          </div>

          {/* AI Suggestion Button */}
          <div className="flex justify-center mb-8">
            <button className="flex items-center gap-4 px-5 py-3 bg-[#E7D7FE] border border-[#422C61] rounded-lg">
              <Bot size={24} className="text-[#422C61]" />
              <span className="text-[#422C61] font-bold text-lg">
                Use AI to suggest competitors
              </span>
            </button>
          </div>

          {/* Competitors List */}
          <div className="space-y-6 mb-8">
            {competitors.map((competitor) => (
              <div
                key={competitor.id}
                className="border border-[#B6C4DA] rounded-lg p-6"
              >
                <div className="flex items-center gap-6">
                  {/* Status Icon */}
                  <StatusIcon status={competitor.status} />

                  {/* Competitor Details */}
                  <div className="flex-1 grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Name Field */}
                    <div className="space-y-2">
                      <label className="block text-[#70787C] font-bold text-lg">
                        Competitor Name
                      </label>
                      <div className="px-5 py-4 bg-[#EFF3FA] border border-[#C5C9D0] rounded-lg">
                        <span className="text-[#4C5155] font-bold text-lg">
                          {competitor.name}
                        </span>
                      </div>
                    </div>

                    {/* URL Field */}
                    <div className="space-y-2">
                      <label className="block text-[#70787C] font-bold text-lg">
                        Link (URL)
                      </label>
                      <div className="px-5 py-4 bg-[#EFF3FA] border border-[#C5C9D0] rounded-lg">
                        <span className="text-[#4C5155] font-bold text-lg">
                          {competitor.url}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Controls */}
                  <div className="flex flex-col items-center gap-3">
                    <ToggleSwitch enabled={competitor.onlyFollow} />
                    <div className="text-center">
                      <span className="text-[#8D9094] font-bold text-sm">
                        Only
                      </span>
                      <br />
                      <span className="text-[#8D9094] font-bold text-sm">
                        Follow
                      </span>
                    </div>
                  </div>

                  {/* Action Icons */}
                  <div className="flex gap-3">
                    <button className="text-gray-500 hover:text-gray-700">
                      <Info size={20} />
                    </button>
                    <button className="text-red-500 hover:text-red-700">
                      <Trash2 size={24} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Add Competitor Button */}
          <div className="flex justify-center mb-8">
            <button className="flex items-center gap-3 px-5 py-3 bg-[#2B6CEE] text-white rounded-lg font-semibold hover:bg-blue-600 transition-colors">
              <Plus size={24} />
              Add Competitor
            </button>
          </div>

          {/* Tips Section */}
          <div className="bg-[#D6E8F0] border border-[#294758]/70 rounded-lg p-6">
            <div className="flex items-center gap-3 mb-4">
              <Info size={25} className="text-[#294758]" />
              <h3 className="text-lg font-bold text-[#294758]">
                Tips for Choosing Competitors
              </h3>
            </div>
            <div className="text-black/60 leading-relaxed">
              <p>
                • Choose properties in the same geographical area as your hotel
              </p>
              <p>• Select hotels with similar size, type, and amenities</p>
              <p>• Include 3-5 competitors for optimal price analysis</p>
              <p>
                • Ensure competitor URLs are from Booking.com for best results
              </p>
              <p>
                • Use "Only Follow" for competitors you want to monitor but not
                include in pricing calculations
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
