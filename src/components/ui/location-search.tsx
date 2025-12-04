import React, { useState, useEffect, useRef } from 'react';
import { Search, MapPin, Globe, Building, Navigation } from 'lucide-react';
import { Input } from './input';
import { Button } from './button';
import { Badge } from './badge';
import { ScrollArea } from './scroll-area';
import { Separator } from './separator';
import { locationService } from '@/services/location/LocationService';
import { LocationSearchResult, GeolocationResult } from '@/services/location/types';
import { cn } from '@/lib/utils';

interface LocationSearchProps {
  placeholder?: string;
  onLocationSelect?: (location: LocationSearchResult) => void;
  onGeolocationDetect?: (location: GeolocationResult) => void;
  enableGeolocation?: boolean;
  className?: string;
  value?: string;
  showPopulation?: boolean;
  maxResults?: number;
}

const LocationSearch: React.FC<LocationSearchProps> = ({
  placeholder = "Search countries, states, cities...",
  onLocationSelect,
  onGeolocationDetect,
  enableGeolocation = true,
  className,
  value = "",
  showPopulation = true,
  maxResults = 30
}) => {
  const [query, setQuery] = useState(value);
  const [results, setResults] = useState<LocationSearchResult[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [isDetectingLocation, setIsDetectingLocation] = useState(false);
  
  const inputRef = useRef<HTMLInputElement>(null);
  const resultsRef = useRef<HTMLDivElement>(null);

  // Search functionality
  useEffect(() => {
    if (query.length >= 2) {
      setIsLoading(true);
      try {
        const searchResults = locationService.searchLocations(query);
        setResults(searchResults.slice(0, maxResults));
        setIsOpen(true);
        setSelectedIndex(-1);
      } catch (error) {
        console.error('Search error:', error);
        setResults([]);
      } finally {
        setIsLoading(false);
      }
    } else {
      setResults([]);
      setIsOpen(false);
    }
  }, [query, maxResults]);

  // Handle geolocation
  const handleGeolocation = async () => {
    if (!enableGeolocation) return;
    
    setIsDetectingLocation(true);
    try {
      const location = await locationService.getCurrentLocation();
      if (location && onGeolocationDetect) {
        onGeolocationDetect(location);
        setQuery(`${location.city || ''}, ${location.state || ''}, ${location.country}`);
        setIsOpen(false);
      }
    } catch (error) {
      console.error('Geolocation failed:', error);
    } finally {
      setIsDetectingLocation(false);
    }
  };

  // Handle keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen || results.length === 0) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex(prev => (prev < results.length - 1 ? prev + 1 : prev));
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex(prev => (prev > 0 ? prev - 1 : -1));
        break;
      case 'Enter':
        e.preventDefault();
        if (selectedIndex >= 0 && selectedIndex < results.length) {
          handleLocationSelect(results[selectedIndex]);
        }
        break;
      case 'Escape':
        setIsOpen(false);
        setSelectedIndex(-1);
        inputRef.current?.blur();
        break;
    }
  };

  // Handle location selection
  const handleLocationSelect = (location: LocationSearchResult) => {
    setQuery(location.displayName);
    setIsOpen(false);
    setSelectedIndex(-1);
    onLocationSelect?.(location);
  };

  // Get icon for location type
  const getLocationIcon = (type: LocationSearchResult['type']) => {
    switch (type) {
      case 'country':
        return <Globe className="h-4 w-4" />;
      case 'state':
        return <Building className="h-4 w-4" />;
      case 'city':
        return <MapPin className="h-4 w-4" />;
      default:
        return <MapPin className="h-4 w-4" />;
    }
  };

  // Format population
  const formatPopulation = (population?: number) => {
    if (!population) return null;
    if (population >= 1000000) {
      return `${(population / 1000000).toFixed(1)}M`;
    }
    if (population >= 1000) {
      return `${(population / 1000).toFixed(0)}K`;
    }
    return population.toLocaleString();
  };

  return (
    <div className={cn("relative", className)}>
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          ref={inputRef}
          type="text"
          placeholder={placeholder}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={() => query.length >= 2 && setIsOpen(true)}
          className="pl-10 pr-12 rounded-[8px] border-0 shadow-none focus:outline-none focus-visible:outline-none focus-visible:ring-0 focus-visible:ring-offset-0 focus-visible:ring-offset-transparent"
        />
        {enableGeolocation && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="absolute right-1 top-1/2 transform -translate-y-1/2 h-8 w-8 p-0"
            onClick={handleGeolocation}
            disabled={isDetectingLocation}
            title="Detect my location"
          >
            <Navigation className={cn(
              "h-4 w-4",
              isDetectingLocation && "animate-spin"
            )} />
          </Button>
        )}
      </div>

      {/* Search Results */}
      {isOpen && (
        <div className="absolute top-full left-0 right-0 z-50 mt-1 rounded-md shadow-lg border border-secondary-foreground bg-black/90 text-white">
          <ScrollArea className="max-h-80">
            <div ref={resultsRef} className="p-1">
              {isLoading ? (
                <div className="p-4 text-center text-muted-foreground">
                  Searching...
                </div>
              ) : results.length === 0 ? (
                <div className="p-4 text-center text-muted-foreground">
                  No locations found
                </div>
              ) : (
                <>
                  {results.map((result, index) => (
                    <div
                      key={result.id}
                      className={cn(
                        "flex items-center justify-between px-3 py-2 rounded-md cursor-pointer transition-colors",
                        index === selectedIndex 
                          ? "bg-white text-accent-foreground" 
                          : "hover:bg-white/10 hover:text-accent-foreground"
                      )}
                      onClick={() => handleLocationSelect(result)}
                    >
                      <div className="flex items-center space-x-3">
                        <div className="text-muted-foreground">
                          {getLocationIcon(result.type)}
                        </div>
                        <div className="flex-1">
                          <div className="font-medium text-sm">
                            {result.name}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {result.type === 'country' 
                              ? result.country
                              : result.type === 'state'
                              ? result.country
                              : `${result.state ? `${result.state}, ` : ''}${result.country}`
                            }
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Badge variant="secondary" className="text-xs">
                          {result.type}
                        </Badge>
                        {showPopulation && result.population && (
                          <Badge variant="outline" className="text-xs">
                            {formatPopulation(result.population)}
                          </Badge>
                        )}
                      </div>
                    </div>
                  ))}
                </>
              )}
            </div>
          </ScrollArea>
        </div>
      )}

      {/* Click outside to close */}
      {isOpen && (
        <div 
          className="fixed inset-0 z-40" 
          onClick={() => setIsOpen(false)}
        />
      )}
    </div>
  );
};

export default LocationSearch;
