import React, { useState } from 'react';
import { TrendingUp, MapPin, Star, Users, Calendar, Heart, ExternalLink } from 'lucide-react';

interface Destination {
  id: string;
  name: string;
  country: string;
  image: string;
  rating: number;
  visitors: string;
  description: string;
  highlights: string[];
  bestTime: string;
  trending: boolean;
}

export const TrendingDestinations: React.FC = () => {
  const [selectedCategory, setSelectedCategory] = useState<'all' | 'beach' | 'city' | 'nature'>('all');

  const destinations: Destination[] = [
    {
      id: '1',
      name: 'Santorini',
      country: 'Greece',
      image: 'https://images.pexels.com/photos/1285625/pexels-photo-1285625.jpeg?auto=compress&cs=tinysrgb&w=800',
      rating: 4.9,
      visitors: '2.5M',
      description: 'Stunning white-washed buildings and breathtaking sunsets over the Aegean Sea.',
      highlights: ['Sunset views', 'Blue domes', 'Wine tasting', 'Beach clubs'],
      bestTime: 'April - October',
      trending: true,
    },
    {
      id: '2',
      name: 'Tokyo',
      country: 'Japan',
      image: 'https://images.pexels.com/photos/2506923/pexels-photo-2506923.jpeg?auto=compress&cs=tinysrgb&w=800',
      rating: 4.8,
      visitors: '15M',
      description: 'A perfect blend of traditional culture and cutting-edge technology.',
      highlights: ['Cherry blossoms', 'Temples', 'Street food', 'Shopping'],
      bestTime: 'March - May',
      trending: true,
    },
    {
      id: '3',
      name: 'Bali',
      country: 'Indonesia',
      image: 'https://images.pexels.com/photos/2166559/pexels-photo-2166559.jpeg?auto=compress&cs=tinysrgb&w=800',
      rating: 4.7,
      visitors: '6M',
      description: 'Tropical paradise with stunning beaches, rice terraces, and spiritual temples.',
      highlights: ['Beaches', 'Temples', 'Rice terraces', 'Surfing'],
      bestTime: 'April - October',
      trending: true,
    },
    {
      id: '4',
      name: 'Paris',
      country: 'France',
      image: 'https://images.pexels.com/photos/338515/pexels-photo-338515.jpeg?auto=compress&cs=tinysrgb&w=800',
      rating: 4.8,
      visitors: '19M',
      description: 'The City of Light offers world-class art, cuisine, and romance.',
      highlights: ['Eiffel Tower', 'Museums', 'Cafes', 'Architecture'],
      bestTime: 'April - June',
      trending: false,
    },
    {
      id: '5',
      name: 'Dubai',
      country: 'UAE',
      image: 'https://images.pexels.com/photos/1470502/pexels-photo-1470502.jpeg?auto=compress&cs=tinysrgb&w=800',
      rating: 4.6,
      visitors: '16M',
      description: 'Futuristic city with luxury shopping, ultramodern architecture, and desert adventures.',
      highlights: ['Burj Khalifa', 'Shopping', 'Desert safari', 'Beaches'],
      bestTime: 'November - March',
      trending: true,
    },
    {
      id: '6',
      name: 'Iceland',
      country: 'Iceland',
      image: 'https://images.pexels.com/photos/2387873/pexels-photo-2387873.jpeg?auto=compress&cs=tinysrgb&w=800',
      rating: 4.9,
      visitors: '2M',
      description: 'Land of fire and ice with stunning natural wonders and Northern Lights.',
      highlights: ['Northern Lights', 'Waterfalls', 'Hot springs', 'Glaciers'],
      bestTime: 'June - August',
      trending: true,
    },
  ];

  const categories = [
    { id: 'all', label: 'All Destinations', icon: TrendingUp },
    { id: 'beach', label: 'Beach', icon: MapPin },
    { id: 'city', label: 'City', icon: Users },
    { id: 'nature', label: 'Nature', icon: Star },
  ];

  return (
    <div className="h-full overflow-y-auto bg-gradient-to-br from-blue-50 to-purple-50">
      <div className="max-w-7xl mx-auto p-6 space-y-6">
        {/* Header */}
        <div className="bg-white/80 backdrop-blur-md rounded-3xl p-8 shadow-lg border border-gray-200">
          <div className="flex items-center gap-4 mb-4">
            <div className="p-3 bg-gradient-to-br from-orange-500 to-pink-600 rounded-2xl">
              <TrendingUp className="w-8 h-8 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Trending Destinations</h1>
              <p className="text-gray-600 mt-1">Discover the most popular travel spots right now</p>
            </div>
          </div>

          {/* Category Filter */}
          <div className="flex flex-wrap gap-3 mt-6">
            {categories.map((category) => {
              const Icon = category.icon;
              return (
                <button
                  key={category.id}
                  onClick={() => setSelectedCategory(category.id as any)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl transition-all ${
                    selectedCategory === category.id
                      ? 'bg-gradient-to-br from-blue-600 to-purple-600 text-white shadow-lg'
                      : 'bg-white text-gray-600 hover:bg-gray-50 border border-gray-200'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span className="font-semibold">{category.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Destinations Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {destinations.map((destination) => (
            <div
              key={destination.id}
              className="group bg-white rounded-3xl overflow-hidden shadow-lg hover:shadow-2xl transition-all duration-300 hover:-translate-y-2 border border-gray-100"
            >
              {/* Image */}
              <div className="relative h-48 overflow-hidden">
                <img
                  src={destination.image}
                  alt={destination.name}
                  className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                />
                {destination.trending && (
                  <div className="absolute top-4 right-4 px-3 py-1 bg-gradient-to-r from-orange-500 to-pink-600 text-white rounded-full text-sm font-semibold flex items-center gap-1">
                    <TrendingUp className="w-4 h-4" />
                    Trending
                  </div>
                )}
                <button className="absolute top-4 left-4 p-2 bg-white/90 backdrop-blur-sm rounded-full hover:bg-white transition-colors">
                  <Heart className="w-5 h-5 text-gray-600" />
                </button>
              </div>

              {/* Content */}
              <div className="p-6">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h3 className="text-xl font-bold text-gray-900">{destination.name}</h3>
                    <p className="text-sm text-gray-500 flex items-center gap-1 mt-1">
                      <MapPin className="w-4 h-4" />
                      {destination.country}
                    </p>
                  </div>
                  <div className="flex items-center gap-1 bg-yellow-50 px-2 py-1 rounded-lg">
                    <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
                    <span className="text-sm font-semibold text-gray-900">{destination.rating}</span>
                  </div>
                </div>

                <p className="text-sm text-gray-600 mb-4">{destination.description}</p>

                {/* Stats */}
                <div className="flex items-center gap-4 mb-4 text-sm text-gray-500">
                  <div className="flex items-center gap-1">
                    <Users className="w-4 h-4" />
                    <span>{destination.visitors} visitors</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Calendar className="w-4 h-4" />
                    <span>{destination.bestTime}</span>
                  </div>
                </div>

                {/* Highlights */}
                <div className="flex flex-wrap gap-2 mb-4">
                  {destination.highlights.slice(0, 3).map((highlight, index) => (
                    <span
                      key={index}
                      className="px-2 py-1 bg-blue-50 text-blue-700 rounded-lg text-xs font-medium"
                    >
                      {highlight}
                    </span>
                  ))}
                </div>

                {/* Action Button */}
                <button className="w-full py-3 bg-gradient-to-br from-blue-600 to-purple-600 text-white rounded-xl font-semibold hover:shadow-lg transition-all flex items-center justify-center gap-2 group">
                  <span>Explore Destination</span>
                  <ExternalLink className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* CTA Section */}
        <div className="bg-gradient-to-br from-purple-600 to-pink-600 rounded-3xl p-8 text-white shadow-2xl">
          <div className="max-w-2xl mx-auto text-center">
            <h2 className="text-3xl font-bold mb-4">Can't decide where to go?</h2>
            <p className="text-purple-100 mb-6">
              Let our AI assistant help you find the perfect destination based on your preferences, budget, and travel style.
            </p>
            <button className="px-8 py-4 bg-white text-purple-600 rounded-xl font-semibold hover:shadow-lg transition-all">
              Get AI Recommendations
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
