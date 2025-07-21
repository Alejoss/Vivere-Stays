import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';

const PropertyList = () => {
  const [properties, setProperties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState({
    priceRange: '',
    propertyType: '',
    amenities: []
  });

  // Mock data - replace with actual API call
  useEffect(() => {
    const mockProperties = [
      {
        id: 1,
        title: 'Luxury Beach Villa',
        location: 'Miami Beach, FL',
        price: 250,
        rating: 4.8,
        image: 'https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=500',
        propertyType: 'Villa',
        bedrooms: 3,
        bathrooms: 2,
        amenities: ['Pool', 'Beach Access', 'WiFi', 'Kitchen']
      },
      {
        id: 2,
        title: 'Cozy Mountain Cabin',
        location: 'Aspen, CO',
        price: 180,
        rating: 4.6,
        image: 'https://images.unsplash.com/photo-1449824913935-59a10b8d2000?w=500',
        propertyType: 'Cabin',
        bedrooms: 2,
        bathrooms: 1,
        amenities: ['Fireplace', 'Mountain View', 'WiFi', 'Kitchen']
      },
      {
        id: 3,
        title: 'Modern City Apartment',
        location: 'New York, NY',
        price: 150,
        rating: 4.7,
        image: 'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=500',
        propertyType: 'Apartment',
        bedrooms: 1,
        bathrooms: 1,
        amenities: ['Gym', 'WiFi', 'Kitchen', 'Balcony']
      },
      {
        id: 4,
        title: 'Historic Downtown Loft',
        location: 'San Francisco, CA',
        price: 200,
        rating: 4.9,
        image: 'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=500',
        propertyType: 'Loft',
        bedrooms: 2,
        bathrooms: 1,
        amenities: ['City View', 'WiFi', 'Kitchen', 'Workspace']
      }
    ];

    setTimeout(() => {
      setProperties(mockProperties);
      setLoading(false);
    }, 1000);
  }, []);

  const filteredProperties = properties.filter(property => {
    const matchesSearch = property.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         property.location.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesPrice = !filters.priceRange || 
      (filters.priceRange === '0-100' && property.price <= 100) ||
      (filters.priceRange === '100-200' && property.price > 100 && property.price <= 200) ||
      (filters.priceRange === '200+' && property.price > 200);
    
    const matchesType = !filters.propertyType || property.propertyType === filters.propertyType;
    
    return matchesSearch && matchesPrice && matchesType;
  });

  const handleFilterChange = (filterType, value) => {
    setFilters(prev => ({
      ...prev,
      [filterType]: value
    }));
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-1/4 mb-8"></div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {[...Array(8)].map((_, i) => (
                <div key={i} className="bg-white rounded-lg shadow overflow-hidden">
                  <div className="h-48 bg-gray-200"></div>
                  <div className="p-4">
                    <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                    <div className="h-3 bg-gray-200 rounded w-1/2 mb-2"></div>
                    <div className="h-3 bg-gray-200 rounded w-1/4"></div>
                  </div>
                </div>
              ))}
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
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Find Your Perfect Stay</h1>
          <p className="text-gray-600">Discover amazing properties in your favorite destinations</p>
        </div>

        {/* Search and Filters */}
        <div className="bg-white rounded-lg shadow p-6 mb-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* Search */}
            <div className="md:col-span-2">
              <label htmlFor="search" className="block text-sm font-medium text-gray-700 mb-1">
                Search
              </label>
              <input
                type="text"
                id="search"
                placeholder="Search by property name or location..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>

            {/* Price Range */}
            <div>
              <label htmlFor="priceRange" className="block text-sm font-medium text-gray-700 mb-1">
                Price Range
              </label>
              <select
                id="priceRange"
                value={filters.priceRange}
                onChange={(e) => handleFilterChange('priceRange', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
              >
                <option value="">All Prices</option>
                <option value="0-100">$0 - $100</option>
                <option value="100-200">$100 - $200</option>
                <option value="200+">$200+</option>
              </select>
            </div>

            {/* Property Type */}
            <div>
              <label htmlFor="propertyType" className="block text-sm font-medium text-gray-700 mb-1">
                Property Type
              </label>
              <select
                id="propertyType"
                value={filters.propertyType}
                onChange={(e) => handleFilterChange('propertyType', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
              >
                <option value="">All Types</option>
                <option value="Apartment">Apartment</option>
                <option value="Villa">Villa</option>
                <option value="Cabin">Cabin</option>
                <option value="Loft">Loft</option>
              </select>
            </div>
          </div>
        </div>

        {/* Results Count */}
        <div className="mb-6">
          <p className="text-gray-600">
            Showing {filteredProperties.length} of {properties.length} properties
          </p>
        </div>

        {/* Property Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filteredProperties.map((property) => (
            <Link
              key={property.id}
              to={`/properties/${property.id}`}
              className="bg-white rounded-lg shadow overflow-hidden hover:shadow-lg transition-shadow duration-200"
            >
              <div className="relative">
                <img
                  src={property.image}
                  alt={property.title}
                  className="w-full h-48 object-cover"
                />
                <div className="absolute top-2 right-2 bg-white px-2 py-1 rounded text-sm font-semibold text-gray-900">
                  ${property.price}/night
                </div>
              </div>
              <div className="p-4">
                <h3 className="text-lg font-semibold text-gray-900 mb-1">
                  {property.title}
                </h3>
                <p className="text-gray-600 text-sm mb-2">
                  {property.location}
                </p>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center">
                    <svg className="w-4 h-4 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                    </svg>
                    <span className="ml-1 text-sm text-gray-600">{property.rating}</span>
                  </div>
                  <span className="text-sm text-gray-500">
                    {property.bedrooms} bed • {property.bathrooms} bath
                  </span>
                </div>
                <div className="flex flex-wrap gap-1">
                  {property.amenities.slice(0, 2).map((amenity, index) => (
                    <span
                      key={index}
                      className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded"
                    >
                      {amenity}
                    </span>
                  ))}
                  {property.amenities.length > 2 && (
                    <span className="text-xs text-gray-500">
                      +{property.amenities.length - 2} more
                    </span>
                  )}
                </div>
              </div>
            </Link>
          ))}
        </div>

        {filteredProperties.length === 0 && (
          <div className="text-center py-12">
            <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
            <h3 className="mt-2 text-sm font-medium text-gray-900">No properties found</h3>
            <p className="mt-1 text-sm text-gray-500">
              Try adjusting your search criteria or filters.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default PropertyList; 