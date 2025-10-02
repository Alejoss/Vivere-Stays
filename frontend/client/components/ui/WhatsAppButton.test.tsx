import { render, screen, fireEvent } from '@testing-library/react';
import WhatsAppButton from './WhatsAppButton';

// Mock window.open
const mockOpen = jest.fn();
Object.defineProperty(window, 'open', {
  value: mockOpen,
  writable: true
});

describe('WhatsAppButton', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders the WhatsApp button', () => {
    render(<WhatsAppButton />);
    
    const button = screen.getByLabelText('Chat with us on WhatsApp');
    expect(button).toBeInTheDocument();
  });

  it('opens WhatsApp with correct URL when clicked', () => {
    render(<WhatsAppButton phoneNumber="593989375445" message="Test message" />);
    
    const button = screen.getByLabelText('Chat with us on WhatsApp');
    fireEvent.click(button);
    
    // Verify WhatsApp URL was opened with correct format
    expect(mockOpen).toHaveBeenCalledWith(
      'https://wa.me/593989375445?text=Test%20message',
      '_blank'
    );
  });

  it('handles phone number formatting correctly', () => {
    render(<WhatsAppButton phoneNumber="+593-989-375-445" />);
    
    const button = screen.getByLabelText('Chat with us on WhatsApp');
    fireEvent.click(button);
    
    // Should clean the phone number (remove non-digits)
    expect(mockOpen).toHaveBeenCalledWith(
      expect.stringContaining('https://wa.me/593989375445'),
      '_blank'
    );
  });

  it('uses default message when none provided', () => {
    render(<WhatsAppButton phoneNumber="593989375445" />);
    
    const button = screen.getByLabelText('Chat with us on WhatsApp');
    fireEvent.click(button);
    
    // Should use the default onboarding message
    expect(mockOpen).toHaveBeenCalledWith(
      expect.stringContaining('text=Hi%21%20I%20need%20help%20with%20my%20Vivere%20Stays%20onboarding%20process.'),
      '_blank'
    );
  });

  it('applies correct positioning classes', () => {
    const { rerender } = render(<WhatsAppButton position="bottom-right" />);
    let button = screen.getByLabelText('Chat with us on WhatsApp');
    expect(button.closest('div')).toHaveClass('bottom-6', 'right-6');
    
    rerender(<WhatsAppButton position="bottom-left" />);
    button = screen.getByLabelText('Chat with us on WhatsApp');
    expect(button.closest('div')).toHaveClass('bottom-6', 'left-6');
  });
});
