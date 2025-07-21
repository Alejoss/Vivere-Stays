import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';

const BookingHistory = () => {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');

  // Mock data - replace with actual API call
  useEffect(() => {
    const mockBookings = [
      {
        id: 1,
        propertyTitle: 'Luxury Beach Villa',
        propertyImage: 'https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=100',
        propertyId: 1,
        checkIn: '2024-01-15',
        checkOut: '2024-01-20',
        guests: 4,
        totalPrice: 1250,
        status: 'confirmed',
        bookingDate: '2024-01-10',
        confirmationCode: 'BK2024011001'
      },
      {
        id: 2,
        propertyTitle: 'Cozy Mountain Cabin',
        propertyImage: 'https://images.unsplash.com/photo-1449824913935-59a10b8d2000?w=100',
        propertyId: 2,
        checkIn: '2024-02-10',
        checkOut: '2024-02-15',
        guests: 2,
        totalPrice: 900,
        status: 'upcoming',
        bookingDate: '2024-01-20',
        confirmationCode: 'BK2024012001'
      },
      {
        id: 3,
        propertyTitle: 'Modern City Apartment',
        propertyImage: 'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=100',
        propertyId: 3,
        checkIn: '2023-12-20',
        checkOut: '2023-12-25',
        guests: 2,
        totalPrice: 750,
        status: 'completed',
        bookingDate: '2023-12-15',
        confirmationCode: 'BK2023121501'
      },
      {
        id: 4,
        propertyTitle: 'Historic Downtown Loft',
        propertyImage: 'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=100',
        propertyId: 4,
        checkIn: '2023-11-15',
        checkOut: '2023-11-20',
        guests: 3,
        totalPrice: 1000,
        status: 'completed',
        bookingDate: '2023-11-10',
        confirmationCode: 'BK2023111001'
      },
      {
        id: 5,
        propertyTitle: 'Seaside Cottage',
        propertyImage: 'https://images.unsplash.com/photo-1571896349842-33c89424de2d?w=100',
        propertyId: 5,
        checkIn: '2023-10-05',
        checkOut: '2023-10-10',
        guests: 2,
        totalPrice: 800,
        status: 'cancelled',
        bookingDate: '2023-09-25',
        confirmationCode: 'BK2023092501'
      }
    ];

    setTimeout(() => {
      setBookings(mockBookings);
      setLoading(false);
    }, 1000);
  }, []);

  const getStatusColor = (status) => {
    switch (status) {
      case 'confirmed':
        return 'bg-green-100 text-green-800';
      case 'upcoming':
        return 'bg-blue-100 text-blue-800';
      case 'completed':
        return 'bg-gray-100 text-gray-800';
      case 'cancelled':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case 'confirmed':
        return 'Confirmed';
      case 'upcoming':
        return 'Upcoming';
      case 'completed':
        return 'Completed';
      case 'cancelled':
        return 'Cancelled';
      default:
        return status;
    }
  };

  const filteredBookings = bookings.filter(booking => {
    if (filter === 'all') return true;
    return booking.status === filter;
  });

  const getTotalSpent = () => {
    return bookings
      .filter(booking => booking.status !== 'cancelled')
      .reduce((total, booking) => total + booking.totalPrice, 0);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-1/4 mb-8"></div>
            <div className="bg-white rounded-lg shadow p-6">
              <div className="h-4 bg-gray-200 rounded w-1/3 mb-4"></div>
              <div className="space-y-4">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="h-24 bg-gray-200 rounded"></div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Booking History</h1>
          <p className="text-gray-600">View and manage all your bookings</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="p-3 rounded-full bg-indigo-100">
                <svg className="w-6 h-6 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Bookings</p>
                <p className="text-2xl font-bold text-gray-900">{bookings.length}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="p-3 rounded-full bg-green-100">
                <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                </svg>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Spent</p>
                <p className="text-2xl font-bold text-gray-900">${getTotalSpent()}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="p-3 rounded-full bg-yellow-100">
                <svg className="w-6 h-6 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Upcoming Trips</p>
                <p className="text-2xl font-bold text-gray-900">
                  {bookings.filter(b => b.status === 'upcoming').length}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-lg shadow p-6 mb-8">
          <div className="flex flex-wrap gap-4">
            <button
              onClick={() => setFilter('all')}
              className={`px-4 py-2 rounded-lg font-medium ${
                filter === 'all'
                  ? 'bg-indigo-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              All Bookings ({bookings.length})
            </button>
            <button
              onClick={() => setFilter('upcoming')}
              className={`px-4 py-2 rounded-lg font-medium ${
                filter === 'upcoming'
                  ? 'bg-indigo-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Upcoming ({bookings.filter(b => b.status === 'upcoming').length})
            </button>
            <button
              onClick={() => setFilter('completed')}
              className={`px-4 py-2 rounded-lg font-medium ${
                filter === 'completed'
                  ? 'bg-indigo-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Completed ({bookings.filter(b => b.status === 'completed').length})
            </button>
            <button
              onClick={() => setFilter('cancelled')}
              className={`px-4 py-2 rounded-lg font-medium ${
                filter === 'cancelled'
                  ? 'bg-indigo-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Cancelled ({bookings.filter(b => b.status === 'cancelled').length})
            </button>
          </div>
        </div>

        {/* Bookings List */}
        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">Your Bookings</h2>
          </div>
          <div className="divide-y divide-gray-200">
            {filteredBookings.map((booking) => (
              <div key={booking.id} className="p-6">
                <div className="flex items-start space-x-4">
                  <img
                    src={booking.propertyImage}
                    alt={booking.propertyTitle}
                    className="w-20 h-20 object-cover rounded-lg"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900 mb-1">
                          {booking.propertyTitle}
                        </h3>
                        <p className="text-sm text-gray-600 mb-2">
                          Confirmation: {booking.confirmationCode}
                        </p>
                        <div className="flex items-center space-x-4 text-sm text-gray-600">
                          <span>
                            {new Date(booking.checkIn).toLocaleDateString()} - {new Date(booking.checkOut).toLocaleDateString()}
                          </span>
                          <span>•</span>
                          <span>{booking.guests} {booking.guests === 1 ? 'guest' : 'guests'}</span>
                          <span>•</span>
                          <span>Booked on {new Date(booking.bookingDate).toLocaleDateString()}</span>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className={`inline-flex px-3 py-1 text-sm font-medium rounded-full ${getStatusColor(booking.status)}`}>
                          {getStatusText(booking.status)}
                        </div>
                        <p className="text-lg font-bold text-gray-900 mt-2">${booking.totalPrice}</p>
                      </div>
                    </div>
                    
                    <div className="mt-4 flex items-center space-x-4">
                      <Link
                        to={`/properties/${booking.propertyId}`}
                        className="text-indigo-600 hover:text-indigo-500 font-medium text-sm"
                      >
                        View Property
                      </Link>
                      {booking.status === 'upcoming' && (
                        <>
                          <button className="text-gray-600 hover:text-gray-500 font-medium text-sm">
                            Modify Booking
                          </button>
                          <button className="text-red-600 hover:text-red-500 font-medium text-sm">
                            Cancel Booking
                          </button>
                        </>
                      )}
                      {booking.status === 'completed' && (
                        <button className="text-indigo-600 hover:text-indigo-500 font-medium text-sm">
                          Book Again
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {filteredBookings.length === 0 && (
            <div className="text-center py-12">
              <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
              <h3 className="mt-2 text-sm font-medium text-gray-900">No bookings found</h3>
              <p className="mt-1 text-sm text-gray-500">
                {filter === 'all' 
                  ? "You haven't made any bookings yet."
                  : `No ${filter} bookings found.`
                }
              </p>
              {filter === 'all' && (
                <div className="mt-6">
                  <Link
                    to="/properties"
                    className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700"
                  >
                    Browse Properties
                  </Link>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default BookingHistory; 