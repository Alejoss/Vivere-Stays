import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';

const PropertyDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [property, setProperty] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedDates, setSelectedDates] = useState({ start: '', end: '' });
  const [guests, setGuests] = useState(1);
  const [showBookingForm, setShowBookingForm] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors }
  } = useForm();

  // Mock data - replace with actual API call
  useEffect(() => {
    const mockProperty = {
      id: parseInt(id),
      title: 'Luxury Beach Villa',
      location: 'Miami Beach, FL',
      price: 250,
      rating: 4.8,
      reviews: 124,
      images: [
        'https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=800',
        'https://images.unsplash.com/photo-1571896349842-33c89424de2d?w=800',
        'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=800',
        'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=800'
      ],
      propertyType: 'Villa',
      bedrooms: 3,
      bathrooms: 2,
      maxGuests: 6,
      amenities: [
        'Private Pool',
        'Beach Access',
        'WiFi',
        'Kitchen',
        'Air Conditioning',
        'Free Parking',
        'Garden',
        'BBQ Grill'
      ],
      description: 'Experience luxury living in this stunning beachfront villa. With breathtaking ocean views, private pool, and modern amenities, this property offers the perfect blend of comfort and elegance. Located in the heart of Miami Beach, you\'ll have easy access to restaurants, shopping, and entertainment.',
      host: {
        name: 'Sarah Johnson',
        avatar: 'https://images.unsplash.com/photo-1494790108755-2616b612b786?w=100',
        rating: 4.9,
        responseTime: '1 hour'
      },
      availability: {
        checkIn: '3:00 PM',
        checkOut: '11:00 AM',
        minStay: 2
      }
    };

    setTimeout(() => {
      setProperty(mockProperty);
      setLoading(false);
    }, 1000);
  }, [id]);

  const handleBooking = async (data) => {
    try {
      // TODO: Implement actual booking API call
      console.log('Booking data:', {
        propertyId: id,
        checkIn: selectedDates.start,
        checkOut: selectedDates.end,
        guests,
        ...data
      });
      
      // Navigate to booking confirmation
      navigate('/booking-confirmation');
    } catch (error) {
      console.error('Booking failed:', error);
    }
  };

  const calculateTotalPrice = () => {
    if (!selectedDates.start || !selectedDates.end) return 0;
    
    const start = new Date(selectedDates.start);
    const end = new Date(selectedDates.end);
    const nights = Math.ceil((end - start) / (1000 * 60 * 60 * 24));
    
    return nights * property.price;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-1/3 mb-4"></div>
            <div className="h-64 bg-gray-200 rounded mb-6"></div>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              <div className="lg:col-span-2">
                <div className="h-4 bg-gray-200 rounded w-1/2 mb-4"></div>
                <div className="h-3 bg-gray-200 rounded w-3/4 mb-2"></div>
                <div className="h-3 bg-gray-200 rounded w-2/3 mb-2"></div>
                <div className="h-3 bg-gray-200 rounded w-1/2"></div>
              </div>
              <div className="h-96 bg-gray-200 rounded"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!property) {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Property not found</h2>
          <p className="text-gray-600 mb-6">The property you're looking for doesn't exist.</p>
          <button
            onClick={() => navigate('/properties')}
            className="bg-indigo-600 text-white px-6 py-2 rounded-lg hover:bg-indigo-700"
          >
            Back to Properties
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">{property.title}</h1>
          <p className="text-gray-600">{property.location}</p>
        </div>

        {/* Image Gallery */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 mb-8">
          <div className="lg:col-span-2">
            <img
              src={property.images[0]}
              alt={property.title}
              className="w-full h-80 object-cover rounded-lg"
            />
          </div>
          <div className="lg:col-span-2 grid grid-cols-2 gap-4">
            {property.images.slice(1, 5).map((image, index) => (
              <img
                key={index}
                src={image}
                alt={`${property.title} ${index + 2}`}
                className="w-full h-36 object-cover rounded-lg"
              />
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2">
            {/* Property Info */}
            <div className="bg-white rounded-lg shadow p-6 mb-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">{property.title}</h2>
                  <p className="text-gray-600">{property.location}</p>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-bold text-gray-900">${property.price}</div>
                  <div className="text-gray-600">per night</div>
                </div>
              </div>

              <div className="flex items-center space-x-4 mb-6">
                <div className="flex items-center">
                  <svg className="w-5 h-5 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                  </svg>
                  <span className="ml-1 text-gray-900">{property.rating}</span>
                  <span className="ml-1 text-gray-600">({property.reviews} reviews)</span>
                </div>
                <span className="text-gray-600">•</span>
                <span className="text-gray-600">{property.bedrooms} bedrooms</span>
                <span className="text-gray-600">•</span>
                <span className="text-gray-600">{property.bathrooms} bathrooms</span>
                <span className="text-gray-600">•</span>
                <span className="text-gray-600">Up to {property.maxGuests} guests</span>
              </div>

              <div className="border-t border-gray-200 pt-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">About this place</h3>
                <p className="text-gray-600 leading-relaxed">{property.description}</p>
              </div>
            </div>

            {/* Amenities */}
            <div className="bg-white rounded-lg shadow p-6 mb-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">What this place offers</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {property.amenities.map((amenity, index) => (
                  <div key={index} className="flex items-center">
                    <svg className="w-5 h-5 text-green-500 mr-3" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                    <span className="text-gray-700">{amenity}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Host Info */}
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <img
                    src={property.host.avatar}
                    alt={property.host.name}
                    className="w-12 h-12 rounded-full mr-4"
                  />
                  <div>
                    <h3 className="font-semibold text-gray-900">Hosted by {property.host.name}</h3>
                    <div className="flex items-center text-sm text-gray-600">
                      <span>{property.host.rating} rating</span>
                      <span className="mx-2">•</span>
                      <span>Response time: {property.host.responseTime}</span>
                    </div>
                  </div>
                </div>
                <button className="bg-gray-100 text-gray-900 px-4 py-2 rounded-lg hover:bg-gray-200">
                  Contact Host
                </button>
              </div>
            </div>
          </div>

          {/* Booking Sidebar */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow p-6 sticky top-8">
              <div className="mb-4">
                <div className="text-2xl font-bold text-gray-900">${property.price}</div>
                <div className="text-gray-600">per night</div>
              </div>

              {!showBookingForm ? (
                <button
                  onClick={() => setShowBookingForm(true)}
                  className="w-full bg-indigo-600 text-white py-3 px-4 rounded-lg font-semibold hover:bg-indigo-700"
                >
                  Check Availability
                </button>
              ) : (
                <form onSubmit={handleSubmit(handleBooking)} className="space-y-4">
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Check-in
                      </label>
                      <input
                        type="date"
                        value={selectedDates.start}
                        onChange={(e) => setSelectedDates(prev => ({ ...prev, start: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Check-out
                      </label>
                      <input
                        type="date"
                        value={selectedDates.end}
                        onChange={(e) => setSelectedDates(prev => ({ ...prev, end: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Guests
                    </label>
                    <select
                      value={guests}
                      onChange={(e) => setGuests(parseInt(e.target.value))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                    >
                      {[...Array(property.maxGuests)].map((_, i) => (
                        <option key={i + 1} value={i + 1}>
                          {i + 1} {i === 0 ? 'guest' : 'guests'}
                        </option>
                      ))}
                    </select>
                  </div>

                  {selectedDates.start && selectedDates.end && (
                    <div className="border-t border-gray-200 pt-4">
                      <div className="flex justify-between text-sm">
                        <span>Total ({calculateTotalPrice() / property.price} nights)</span>
                        <span>${calculateTotalPrice()}</span>
                      </div>
                    </div>
                  )}

                  <button
                    type="submit"
                    className="w-full bg-indigo-600 text-white py-3 px-4 rounded-lg font-semibold hover:bg-indigo-700"
                  >
                    Reserve
                  </button>

                  <button
                    type="button"
                    onClick={() => setShowBookingForm(false)}
                    className="w-full bg-gray-100 text-gray-900 py-2 px-4 rounded-lg hover:bg-gray-200"
                  >
                    Cancel
                  </button>
                </form>
              )}

              <div className="mt-4 text-center text-sm text-gray-600">
                You won't be charged yet
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PropertyDetail; 