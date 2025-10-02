import { MessageCircle } from "lucide-react";

interface WhatsAppButtonProps {
  phoneNumber?: string;
  message?: string;
  position?: "bottom-right" | "bottom-left";
  className?: string;
}

export default function WhatsAppButton({
  phoneNumber = "593989375445", // Default to your specified number
  message = "Hi! I need help with my Vivere Stays onboarding process.",
  position = "bottom-right",
  className = ""
}: WhatsAppButtonProps) {
  
  const handleWhatsAppClick = () => {
    // Format phone number (remove any non-digits)
    const cleanPhoneNumber = phoneNumber.replace(/[^\d]/g, '');
    
    // Encode the message for URL
    const encodedMessage = encodeURIComponent(message);
    
    // Create WhatsApp URL according to the format: https://wa.me/<phone_number>?text=<custom_message>
    const whatsappUrl = `https://wa.me/${cleanPhoneNumber}?text=${encodedMessage}`;
    
    // Open WhatsApp in a new tab
    window.open(whatsappUrl, '_blank');
  };

  return (
    <div className={`fixed ${position === "bottom-right" ? "bottom-6 right-6" : "bottom-6 left-6"} z-50 ${className}`}>
      <button
        onClick={handleWhatsAppClick}
        className="w-14 h-14 bg-green-500 hover:bg-green-600 rounded-full shadow-lg hover:shadow-xl transition-all duration-300 flex items-center justify-center group"
        aria-label="Chat with us on WhatsApp"
        title="Chat with us on WhatsApp"
      >
        {/* WhatsApp Icon */}
        <MessageCircle className="w-7 h-7 text-white group-hover:scale-110 transition-transform" />
        
        {/* Pulse animation for attention */}
        <div className="absolute inset-0 bg-green-500 rounded-full animate-ping opacity-20"></div>
      </button>
      
      {/* Tooltip */}
      <div className="absolute bottom-full mb-2 right-0 bg-gray-900 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
        Chat with us on WhatsApp
      </div>
    </div>
  );
}
