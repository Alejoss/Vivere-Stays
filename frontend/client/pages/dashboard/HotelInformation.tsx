import { Building2, Plus, Save, ChevronDown } from "lucide-react";

export default function HotelInformation() {
  return (
    <div className="min-h-screen bg-white">
      {/* Hotel Information Form Section */}
      <div className="px-6 py-8">
        <div className="bg-white rounded-lg border border-black/10 shadow-lg p-8 mb-8">
          {/* Section Header */}
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-3">
              <Building2 size={40} className="text-[#287CAC]" />
              <h2 className="text-3xl font-bold text-[#287CAC]">
                Hotel Information
              </h2>
            </div>
            <button className="flex items-center gap-3 px-5 py-3 bg-[#2B6CEE] text-white rounded-lg font-semibold hover:bg-blue-600 transition-colors">
              <Plus size={24} />
              Add New Hotel
            </button>
          </div>

          <p className="text-[#8A8E94] font-bold text-lg mb-8">
            Manage your hotel's basic information
          </p>

          {/* Form Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-x-16 gap-y-6">
            {/* Left Column */}
            <div className="space-y-6">
              {/* Hotel Name */}
              <div className="space-y-2">
                <label className="block text-[#B8BABE] font-bold text-lg">
                  Hotel Name
                </label>
                <div className="w-full px-5 py-4 bg-[#2E333B] border border-[#585C63] rounded-lg">
                  <span className="text-[#D3D4D7] font-bold text-lg">
                    Casa Batllo - Premium Suite
                  </span>
                </div>
              </div>

              {/* Address */}
              <div className="space-y-2">
                <label className="block text-[#B8BABE] font-bold text-lg">
                  Address
                </label>
                <div className="w-full px-5 py-4 bg-[#2E333B] border border-[#585C63] rounded-lg">
                  <span className="text-[#D3D4D7] font-bold text-lg">
                    Passeig de Gràcia, 43
                  </span>
                </div>
              </div>

              {/* City and Country Row */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="block text-[#B8BABE] font-bold text-lg">
                    City
                  </label>
                  <div className="w-full px-5 py-4 bg-[#2E333B] border border-[#585C63] rounded-lg">
                    <span className="text-[#D3D4D7] font-bold text-lg">
                      Barcelona
                    </span>
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="block text-[#B8BABE] font-bold text-lg">
                    Country
                  </label>
                  <div className="w-full px-5 py-4 bg-[#2E333B] border border-[#585C63] rounded-lg">
                    <span className="text-[#D3D4D7] font-bold text-lg">
                      Spain
                    </span>
                  </div>
                </div>
              </div>

              {/* CIF and Number of Rooms Row */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="block text-[#B8BABE] font-bold text-lg">
                    CIF (Optional)*
                  </label>
                  <div className="w-full px-5 py-4 bg-[#2E333B] border border-[#585C63] rounded-lg">
                    <span className="text-[#D3D4D7] font-bold text-lg">
                      B12345678
                    </span>
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="block text-[#B8BABE] font-bold text-lg">
                    Number of Rooms*
                  </label>
                  <div className="w-full px-5 py-4 bg-[#2E333B] border border-[#585C63] rounded-lg">
                    <span className="text-[#D3D4D7] font-bold text-lg">2</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Column */}
            <div className="space-y-6">
              {/* Phone */}
              <div className="space-y-2">
                <label className="block text-[#B8BABE] font-bold text-lg">
                  Phone
                </label>
                <div className="w-full px-5 py-4 bg-[#2E333B] border border-[#585C63] rounded-lg">
                  <span className="text-[#D3D4D7] font-bold text-lg">
                    +34 93 216 0306
                  </span>
                </div>
              </div>

              {/* Email */}
              <div className="space-y-2">
                <label className="block text-[#B8BABE] font-bold text-lg">
                  Email
                </label>
                <div className="w-full px-5 py-4 bg-[#2E333B] border border-[#585C63] rounded-lg">
                  <span className="text-[#D3D4D7] font-bold text-lg">
                    info@casabatllo.com
                  </span>
                </div>
              </div>

              {/* URL */}
              <div className="space-y-2">
                <label className="block text-[#B8BABE] font-bold text-lg">
                  URL
                </label>
                <div className="w-full px-5 py-4 bg-[#2E333B] border border-[#585C63] rounded-lg">
                  <span className="text-[#D3D4D7] font-bold text-lg">
                    https://booking.com/hotel/casa-batllo
                  </span>
                </div>
              </div>

              {/* Property Type */}
              <div className="space-y-2">
                <label className="block text-[#B8BABE] font-bold text-lg">
                  Property Type
                </label>
                <div className="bg-[#F5F7FA] rounded-lg p-1">
                  <div className="flex items-center justify-between w-full px-4 py-4 bg-[#2E333B] border border-[#D7DFE8] rounded-lg">
                    <span className="text-white font-bold text-lg">
                      Select Property Type
                    </span>
                    <ChevronDown size={20} className="text-black" />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Save Button */}
          <div className="flex justify-end mt-12">
            <button className="flex items-center gap-4 px-6 py-3 bg-[#2B6CEE] text-white rounded-lg font-semibold hover:bg-blue-600 transition-colors">
              <Save size={24} />
              Save Changes
            </button>
          </div>
        </div>

        {/* Pricing Configuration Section */}
        <div className="bg-white rounded-lg border border-black/10 shadow-lg p-8">
          {/* Section Header with Inline Input */}
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-6">
              <Building2 size={40} className="text-[#287CAC]" />
              <h2 className="text-3xl font-bold text-[#287CAC]">
                Price Difference Between OTAs and Direct Channels
              </h2>
              <div className="relative">
                <input
                  type="number"
                  value="10"
                  className="w-24 px-4 py-3 text-xl font-bold text-center border-2 border-[#287CAC] rounded-lg bg-white text-[#287CAC] focus:outline-none focus:ring-2 focus:ring-[#287CAC]/20 focus:border-[#287CAC] transition-all shadow-sm pr-8"
                  placeholder="10"
                  readOnly
                />
                <span className="absolute right-3 top-1/2 transform -translate-y-1/2 text-xl font-bold text-[#287CAC]">
                  %
                </span>
              </div>
            </div>
          </div>

          <p className="text-[#8A8E94] font-bold text-lg mb-8">
            Configure how your hotel prices are calculated and compared to
            competitors.
          </p>
        </div>
      </div>
    </div>
  );
}
