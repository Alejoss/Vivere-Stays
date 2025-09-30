import { useNavigate } from "react-router-dom";
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";

export default function PlanInformation() {
  const navigate = useNavigate();
  const FEATURES: Array<{ name: string; start: boolean; scale: boolean; pro: boolean; description: string }>= [
    {
      name: "Dynamic Pricing tool",
      start: true,
      scale: true,
      pro: true,
      description:
        "We call it \"dynamic\" as it says it all: AI‑boosted algorithms constantly calculate the best price for your hotel.",
    },
    {
      name: "Auto-pilot",
      start: true,
      scale: true,
      pro: true,
      description:
        "Activate Auto‑Pilot so the AI sets the right price at the right time—no sifting through thousands of data points.",
    },
    {
      name: "24/7 live support",
      start: true,
      scale: true,
      pro: true,
      description:
        "Ask any question 24/7 via our website chat—we guarantee a solution in less than 24 hours.",
    },
    {
      name: "Rate shopper",
      start: false,
      scale: true,
      pro: true,
      description:
        "A customized competitor price‑scraping algorithm tailored to your hotel's needs.",
    },
    {
      name: "Automatic Comset definition",
      start: false,
      scale: true,
      pro: true,
      description:
        "AI proposes the most relevant competitors so you benchmark only against those that truly matter.",
    },
    {
      name: "Minimum stay detection",
      start: false,
      scale: true,
      pro: true,
      description:
        "Identify competitors with minimum stays on specific dates to adjust your strategy accordingly.",
    },
    {
      name: "Your Personal Revenue Manager",
      start: false,
      scale: false,
      pro: true,
      description:
        "A dedicated revenue manager (12h/day, 7 days/week) to address your needs with a human touch.",
    },
    {
      name: "Historical data add-on",
      start: false,
      scale: false,
      pro: true,
      description:
        "Leverage up to 5 years of your accommodation’s historical data to boost revenue.",
    },
    {
      name: "Forecasting",
      start: false,
      scale: false,
      pro: true,
      description:
        "Combine historical and pace data to predict market conditions and your hotel’s revenue with precision.",
    },
    {
      name: "Analytics BI",
      start: false,
      scale: false,
      pro: true,
      description:
        "Access the numbers you need for any date range across your hotel's performance.",
    },
    {
      name: "Sales Booster",
      start: false,
      scale: false,
      pro: true,
      description:
        "Ensure the right price increases or discounts are applied when market conditions require it.",
    },
    {
      name: "Price Benchmark Kicker",
      start: false,
      scale: false,
      pro: true,
      description:
        "Near‑hourly price updates using both external (pull) and internal (push) data for ultimate responsiveness.",
    },
  ];

  return (
    <div className="min-h-screen bg-[#F6F9FD] flex flex-col items-center px-4 py-8">
      {/* Header */}
      <div className="mb-8 text-center">
        <img
          src="/images/logo.png"
          alt="Vivere Stays"
          className="w-[240px] h-auto mx-auto"
        />
      </div>

      {/* Main Content Card */}
      <div className="bg-white rounded-[20px] shadow-[0_0_30px_0_rgba(0,0,0,0.25)] w-full max-w-[960px] px-[28px] sm:px-[40px] py-[30px]">
        {/* Title and Description */}
        <div className="text-center mb-6">
          <h1 className="text-[28px] sm:text-[34px] font-bold text-[#1E1E1E] mb-2">Plan information</h1>
          <p className="text-[16px] sm:text-[18px] text-[#485567]">
            Learn more about our plans and what is included in each.
          </p>
        </div>

        {/* Comparison table */}
        <div className="w-full">
          <div>
            {/* Header row */}
            <div className="grid grid-cols-4 items-end">
              <div></div>
              <div className="text-center py-3">
                <div className="text-[16px] font-semibold text-[#1E1E1E]">Start</div>
                <div className="mt-1 inline-block text-[11px] bg-[#CEF4FC] text-[#294758] px-2 py-1 rounded-full">
                  recommended for first time users
                </div>
              </div>
              <div className="text-center py-3">
                <div className="text-[16px] font-semibold text-[#1E1E1E]">Scale</div>
              </div>
              <div className="text-center py-3">
                <div className="text-[16px] font-semibold text-[#1E1E1E]">Pro</div>
                <div className="mt-1 text-[12px] text-[#64748B]">% on revenue</div>
              </div>
            </div>

            {/* Divider */}
            <div className="h-px w-full bg-[#E2E8F0]" />

            {/* Rows */}
            {FEATURES.map((feature, idx) => (
              <div key={feature.name} className={`grid grid-cols-4 items-center ${idx !== 0 ? 'border-t border-[#E2E8F0]' : ''}`}>
                <div className="py-3 pr-4">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div className="flex items-center gap-2 text-[14px] text-[#1E1E1E] cursor-help">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                          <circle cx="12" cy="12" r="10" stroke="#9CAABD" strokeWidth="1.5" />
                          <path d="M12 11V17" stroke="#294758" strokeWidth="1.5" strokeLinecap="round" />
                          <circle cx="12" cy="8" r="1" fill="#294758" />
                        </svg>
                        <span>{feature.name}</span>
                      </div>
                    </TooltipTrigger>
                    <TooltipContent className="max-w-xs text-[12px] leading-5">
                      {feature.description}
                    </TooltipContent>
                  </Tooltip>
                </div>
                <div className="py-3 flex items-center justify-center">
                  {feature.start ? (
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M20 6L9 17L4 12" stroke="#1F7A8C" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  ) : (
                    <span className="text-[#9CAABD]">—</span>
                  )}
                </div>
                <div className="py-3 flex items-center justify-center">
                  {feature.scale ? (
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M20 6L9 17L4 12" stroke="#1F7A8C" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  ) : (
                    <span className="text-[#9CAABD]">—</span>
                  )}
                </div>
                <div className="py-3 flex items-center justify-center">
                  {feature.pro ? (
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M20 6L9 17L4 12" stroke="#1F7A8C" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  ) : (
                    <span className="text-[#9CAABD]">—</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-center mt-6">
          <button
            onClick={() => navigate("/select-plan")}
            className="flex items-center gap-2 px-[36px] py-[12px] rounded-[10px] text-[14px] font-medium text-[#64748B] border border-[#E2E8F0] bg-white hover:bg-gray-50 transition-colors"
          >
            Back to plans
          </button>
        </div>
      </div>
    </div>
  );
}


