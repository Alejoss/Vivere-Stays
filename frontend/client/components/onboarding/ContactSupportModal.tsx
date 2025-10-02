import { useState } from "react";
import { X, Send, Mail } from "lucide-react";

interface ContactSupportModalProps {
  isOpen: boolean;
  onClose: () => void;
  userEmail: string;
  propertyId: string | null;
  onSubmit: (message: string) => Promise<void>;
}

export default function ContactSupportModal({
  isOpen,
  onClose,
  userEmail,
  propertyId,
  onSubmit,
}: ContactSupportModalProps) {
  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!message.trim()) {
      return;
    }

    setIsSubmitting(true);
    try {
      await onSubmit(message.trim());
      setMessage("");
      onClose();
    } catch (error) {
      console.error("Error submitting support request:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-[20px] shadow-[0_0_30px_0_rgba(0,0,0,0.25)] w-full max-w-md">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-bold text-[#1E1E1E]">Contact Support</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <X size={20} className="text-gray-500" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          <div className="mb-6">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-10 h-10 bg-gradient-to-r from-[#D7E4EB] to-[#CEF4FC] border-[0.5px] border-[#9CAABD] rounded-[10px] flex items-center justify-center">
                <Mail size={20} className="text-[#294859]" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-[#1E1E1E]">PMS Support</h3>
                <p className="text-sm text-[#485567]">We'll help you choose the right PMS</p>
              </div>
            </div>
            
            <div className="bg-[#F8FAFC] border border-[#D9D9D9] rounded-[8px] p-4">
              <p className="text-sm text-[#485567] mb-2">
                Our support team will get in touch with you to help you choose a compatible PMS system.
              </p>
              <div className="text-xs text-[#485567] space-y-1">
                <p><strong>Your email:</strong> {userEmail}</p>
                {propertyId && <p><strong>Property ID:</strong> {propertyId}</p>}
              </div>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-[#485567] mb-2">
                Message (Optional)
              </label>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Tell us about your PMS needs or any questions you have..."
                className="w-full h-24 px-3 py-2 border border-[#D7DFE8] rounded-[8px] bg-white text-sm text-[#1E1E1E] placeholder:text-[#9CAABD] focus:outline-none focus:ring-2 focus:ring-[#294859] focus:border-transparent resize-none"
                maxLength={500}
              />
              <div className="mt-1 text-xs text-[#9CAABD]">
                {message.length}/500 characters
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={onClose}
                disabled={isSubmitting}
                className="flex-1 h-[45px] bg-white border border-[#D9D9D9] text-[#294758] text-sm font-semibold rounded-[8px] hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="flex-1 h-[45px] bg-[#294859] text-white text-sm font-semibold rounded-[8px] hover:bg-[#1e3340] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {isSubmitting ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    Sending...
                  </>
                ) : (
                  <>
                    <Send size={16} />
                    Send Request
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
