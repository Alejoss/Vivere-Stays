import { useState } from "react";
import { FileText, ChevronDown, Lightbulb, Check } from "lucide-react";

export default function Support() {
  const [selectedIssue, setSelectedIssue] = useState("General Question");
  const [description, setDescription] = useState("");
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  const issueTypes = [
    "General Question",
    "Technical Issue",
    "Billing Question",
    "Feature Request",
    "Bug Report",
  ];

  const tips = [
    "Be specific about the issue you're experiencing",
    "Include error messages or screenshots if possible",
    "Mention steps you've already tried",
    "Select the appropriate priority level",
  ];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Handle form submission
    console.log("Support ticket submitted:", { selectedIssue, description });
    setShowSuccess(true);
  };


  return (
    <div className="min-h-screen bg-white">
      <div className="border-b border-gray-300 mb-8" />

      {/* Header */}
      <div className="px-6 mb-8">
        <h1 className="text-[28px] font-bold text-[#294758] mb-2">
          Support Center
        </h1>
        <p className="text-[16px] text-[#4B5563]">
          Need help? Create a support ticket and our team will get back to you
          as soon as possible.
        </p>
      </div>

      {/* Main Content */}
      <div className="flex gap-8 px-6">
        {/* Form Section */}
        <div className="flex-1 max-w-[600px]">
          {/* Create Support Ticket Header */}
          <div className="bg-[#294859] text-white px-8 py-4 rounded-t-md mb-6">
            <div className="flex items-center gap-2">
              <FileText size={20} />
              <h2 className="text-[20px] font-bold">Create Support Ticket</h2>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Issue Type Dropdown */}
            <div>
              <label className="block text-[14px] font-normal text-black mb-4">
                What can we help you with?
              </label>
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                  className="w-full flex items-center justify-between px-4 py-3 border border-[#D7DAE0] rounded-md bg-white text-left focus:outline-none focus:ring-2 focus:ring-[#294859] focus:border-transparent"
                >
                  <div className="flex items-center gap-3">
                    <svg
                      width="20"
                      height="20"
                      viewBox="0 0 20 21"
                      fill="none"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path
                        d="M18.1292 15.5788L17.9 14.7455C18.9146 12.8517 19.2148 10.6563 18.7458 8.5597C18.2769 6.46307 17.0701 4.60478 15.3454 3.32365C13.6208 2.04251 11.4931 1.42386 9.3504 1.58049C7.20768 1.73712 5.19261 2.65859 3.67258 4.1769C2.15254 5.69521 1.22879 7.70923 1.06973 9.85177C0.910675 11.9943 1.52691 14.1227 2.80609 15.8488C4.08526 17.5749 5.94218 18.7838 8.03828 19.2551C10.1344 19.7264 12.3301 19.4287 14.225 18.4163L15.0583 18.6455L18.0583 19.4496C18.2339 19.4918 18.4189 19.4641 18.5744 19.3723C18.7299 19.2806 18.8437 19.132 18.8917 18.958C18.9251 18.8394 18.9251 18.714 18.8917 18.5955L18.1292 15.5788ZM13.9625 9.58296C14.1438 9.58296 14.321 9.63672 14.4718 9.73744C14.6225 9.83817 14.74 9.98133 14.8094 10.1488C14.8788 10.3163 14.8969 10.5006 14.8615 10.6785C14.8262 10.8563 14.7389 11.0196 14.6107 11.1478C14.4825 11.276 14.3191 11.3633 14.1413 11.3987C13.9635 11.434 13.7792 11.4159 13.6117 11.3465C13.4442 11.2771 13.301 11.1596 13.2003 11.0089C13.0996 10.8582 13.0458 10.6809 13.0458 10.4996C13.0491 10.2561 13.1479 10.0236 13.3209 9.85213C13.4939 9.68069 13.7273 9.58403 13.9708 9.58296H13.9625ZM6.02916 11.4163C5.84786 11.4163 5.67063 11.3625 5.51988 11.2618C5.36914 11.1611 5.25165 11.0179 5.18227 10.8504C5.11289 10.6829 5.09473 10.4986 5.1301 10.3208C5.16547 10.143 5.25278 9.97964 5.38098 9.85144C5.50917 9.72324 5.67251 9.63594 5.85032 9.60057C6.02814 9.5652 6.21245 9.58335 6.37995 9.65273C6.54745 9.72211 6.69061 9.83961 6.79134 9.99035C6.89206 10.1411 6.94582 10.3183 6.94582 10.4996C6.94259 10.7417 6.84497 10.973 6.67376 11.1442C6.50255 11.3154 6.27127 11.4131 6.02916 11.4163ZM9.99999 11.4163C9.81869 11.4163 9.64146 11.3625 9.49072 11.2618C9.33997 11.1611 9.22248 11.0179 9.1531 10.8504C9.08372 10.6829 9.06557 10.4986 9.10094 10.3208C9.13631 10.143 9.22361 9.97964 9.35181 9.85144C9.48001 9.72324 9.64334 9.63594 9.82116 9.60057C9.99997 9.5652 10.1833 9.58335 10.3508 9.65273C10.5183 9.72211 10.6614 9.83961 10.7622 9.99035C10.8629 10.1411 10.9167 10.3183 10.9167 10.4996C10.9134 10.7417 10.8158 10.973 10.6446 11.1442C10.4734 11.3154 10.2421 11.4131 9.99999 11.4163Z"
                        stroke="black"
                        strokeWidth="0.416667"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                    <span className="text-[14px] text-[#1E1E1E]">
                      {selectedIssue}
                    </span>
                  </div>
                  <ChevronDown
                    size={20}
                    className={`transition-transform ${
                      isDropdownOpen ? "rotate-180" : ""
                    }`}
                  />
                </button>

                {isDropdownOpen && (
                  <div className="absolute z-10 w-full mt-1 bg-white border border-[#D7DAE0] rounded-md shadow-lg">
                    {issueTypes.map((type) => (
                      <button
                        key={type}
                        type="button"
                        onClick={() => {
                          setSelectedIssue(type);
                          setIsDropdownOpen(false);
                        }}
                        className="w-full px-4 py-3 text-left text-[14px] text-[#1E1E1E] hover:bg-gray-50 focus:bg-gray-50 focus:outline-none"
                      >
                        {type}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Description */}
            <div>
              <label className="block text-[14px] font-normal text-black mb-4">
                Detailed Description *
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Please provide as much detail as possible about your issue. Include steps to reproduce, error messages, and any relevant information that might help us assist you better."
                className="w-full px-4 py-3 border border-[#D7DAE0] rounded-md bg-white text-[14px] text-[#71717A] placeholder-[#71717A] focus:outline-none focus:ring-2 focus:ring-[#294859] focus:border-transparent resize-none"
                rows={6}
                maxLength={1000}
              />
              <div className="mt-2 text-[12px] text-[#71717A]">
                {description.length}/1000 characters
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              className="w-full bg-[#294859] text-white text-[16px] font-medium py-3 px-6 rounded-md hover:bg-[#1f3642] transition-colors focus:outline-none focus:ring-2 focus:ring-[#294859] focus:ring-offset-2"
            >
              Create Support Ticket
            </button>
          </form>
        </div>

        {/* Tips Sidebar */}
        <div className="w-[281px]">
          <div className="bg-white rounded-lg shadow-lg overflow-hidden">
            {/* Header */}
            <div className="bg-gradient-to-r from-[#20C25E] to-[#069768] px-8 py-6">
              <div className="flex items-center gap-2 text-white">
                <Lightbulb size={20} fill="white" />
                <h3 className="text-[16px] font-bold">
                  Tips for Better Support
                </h3>
              </div>
            </div>

            {/* Tips List */}
            <div className="p-6 space-y-4">
              {tips.map((tip, index) => (
                <div key={index} className="flex items-start gap-2">
                  <div className="flex-shrink-0 w-5 h-5 bg-[#16B257] rounded-full flex items-center justify-center mt-0.5">
                    <Check size={12} color="white" />
                  </div>
                  <span className="text-[13px] text-black leading-relaxed">
                    {tip}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Success Modal */}
      {showSuccess && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-2xl max-w-md w-full mx-4 p-8">
            {/* Success Icon */}
            <div className="flex justify-center mb-6">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
                <Check size={32} className="text-green-600" />
              </div>
            </div>

            {/* Success Message */}
            <div className="text-center mb-6">
              <h2 className="text-xl font-bold text-gray-900 mb-2">
                Ticket Created Successfully!
              </h2>
              <p className="text-gray-600 text-sm leading-relaxed">
                Thank you for contacting us. Our support team has received your ticket and will respond soon.
              </p>
            </div>

            {/* Ticket ID */}
            <div className="bg-gray-50 rounded-lg p-4 mb-6">
              <div className="text-center">
                <div className="text-sm text-gray-600 mb-1">
                  Your ticket ID:
                </div>
                <div className="text-lg font-bold text-[#294758]">
                  #VS-2025-001
                </div>
              </div>
            </div>

            {/* OK Button */}
            <div className="flex justify-center">
              <button
                onClick={() => setShowSuccess(false)}
                className="px-8 py-3 bg-[#294758] text-white text-sm font-medium rounded-md hover:bg-[#1f3642] transition-colors focus:outline-none focus:ring-2 focus:ring-[#294758] focus:ring-offset-2"
              >
                OK
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
