import React, { useState, useEffect } from 'react';
import { ChevronDown, MapPin, Globe, Building, Navigation, X } from 'lucide-react';
import { Button } from './button';
import { Label } from './label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './select';
import { Badge } from './badge';
import LocationSearch from './location-search';
import { locationService } from '@/services/location/LocationService';
import { Country, State, City, LocationSearchResult, GeolocationResult } from '@/services/location/types';
import { cn } from '@/lib/utils';

interface LocationSelectorProps {
  value?: {
    country?: string;
    countryCode?: string;
    state?: string;
    stateCode?: string;
    city?: string;
  };
  onChange?: (location: {
    country?: string;
    countryCode?: string;
    state?: string;
    stateCode?: string;
    city?: string;
  }) => void;
  enableGeolocation?: boolean;
  enableSearch?: boolean;
  showLabels?: boolean;
  className?: string;
  required?: boolean;
  layout?: 'vertical' | 'horizontal' | 'grid';
  showPopulation?: boolean;
}

const LocationSelector: React.FC<LocationSelectorProps> = ({
  value = {},
  onChange,
  enableGeolocation = true,
  enableSearch = true,
  showLabels = true,
  className,
  required = false,
  layout = 'vertical',
  showPopulation = false
}) => {
  console.log('LocationSelector received value:', value);
  const [countries, setCountries] = useState<Country[]>([]);
  const [states, setStates] = useState<State[]>([]);
  const [cities, setCities] = useState<City[]>([]);
  const [isDetectingLocation, setIsDetectingLocation] = useState(false);
  const [showSearch, setShowSearch] = useState(false);

  // Load countries on mount
  useEffect(() => {
    const loadCountries = () => {
      console.log('Loading countries...');
      const allCountries = locationService.getAllCountries();
      console.log('Loaded countries:', allCountries.length);
      setCountries(allCountries.sort((a, b) => a.name.localeCompare(b.name)));
    };
    loadCountries();
  }, []);

  // Load states when country changes
  useEffect(() => {
    if (value.countryCode) {
      try {
        const countryStates = locationService.getStatesOfCountry(value.countryCode);
        console.log(`Loading states for ${value.countryCode}:`, countryStates.length, 'states');
        setStates(countryStates.sort((a, b) => a.name.localeCompare(b.name)));
      } catch (error) {
        console.error('Error loading states:', error);
        setStates([]);
      }
    } else {
      setStates([]);
    }
  }, [value.countryCode]);

  // Load cities when state changes
  useEffect(() => {
    if (value.countryCode && value.stateCode) {
      try {
        const stateCities = locationService.getCitiesOfState(value.countryCode, value.stateCode);
        console.log(`Loading cities for ${value.countryCode}-${value.stateCode}:`, stateCities.length, 'cities');
        setCities(stateCities.sort((a, b) => a.name.localeCompare(b.name)));
      } catch (error) {
        console.error('Error loading cities:', error);
        setCities([]);
      }
    } else {
      setCities([]);
    }
  }, [value.countryCode, value.stateCode]);

  // Handle country change
  const handleCountryChange = (countryCode: string) => {
    console.log('Country change requested:', countryCode);
    console.log('Available countries:', countries.length);
    const country = countries.find(c => c.code === countryCode);
    if (country) {
      console.log('Found country:', country.name);
      const newValue = {
        country: country.name,
        countryCode: country.code,
        state: '',
        stateCode: '',
        city: ''
      };
      console.log('Calling onChange with:', newValue);
      onChange?.(newValue);
    } else {
      console.warn('Country not found for code:', countryCode);
      console.log('Available country codes:', countries.map(c => c.code));
    }
  };

  // Handle state change
  const handleStateChange = (stateCode: string) => {
    const state = states.find(s => s.code === stateCode || s.name === stateCode);
    if (state) {
      onChange?.({
        ...value,
        state: state.name,
        stateCode: state.code || state.name,
        city: ''
      });
    }
  };

  // Handle city change
  const handleCityChange = (cityName: string) => {
    onChange?.({
      ...value,
      city: cityName
    });
  };

  // Handle geolocation
  const handleGeolocation = async () => {
    setIsDetectingLocation(true);
    try {
      console.log('Starting geolocation...');
      const location = await locationService.getCurrentLocation();
      console.log('Geolocation result:', location);
      
      if (location) {
        // Find country by code
        const country = countries.find(c => c.code === location.countryCode);
        console.log('Found country:', country);
        
        if (country) {
          const newLocation = {
            country: country.name,
            countryCode: country.code,
            state: location.state || '',
            stateCode: location.stateCode || '',
            city: location.city || ''
          };
          console.log('Setting location:', newLocation);
          onChange?.(newLocation);
        } else {
          console.warn('Country not found for code:', location.countryCode);
        }
      } else {
        console.warn('No location data received');
      }
    } catch (error) {
      console.error('Geolocation failed:', error);
      // Show user-friendly error message
      alert('Unable to detect your location. Please ensure location permissions are enabled and try again.');
    } finally {
      setIsDetectingLocation(false);
    }
  };

  // Handle search location selection
  const handleSearchLocationSelect = (location: LocationSearchResult) => {
    if (location.type === 'country') {
      const country = countries.find(c => c.name === location.name);
      if (country) {
        handleCountryChange(country.code);
      }
    } else if (location.type === 'state') {
      // Find the country first
      const country = countries.find(c => c.name === location.country);
      if (country) {
        const countryStates = locationService.getStatesOfCountry(country.code);
        const state = countryStates.find(s => s.name === location.name);
        if (state) {
          onChange?.({
            country: country.name,
            countryCode: country.code,
            state: state.name,
            stateCode: state.code || '',
            city: ''
          });
        }
      }
    } else if (location.type === 'city') {
      // Find country and state
      const country = countries.find(c => c.name === location.country);
      if (country) {
        const countryStates = locationService.getStatesOfCountry(country.code);
        const state = countryStates.find(s => s.name === location.state);
        
        onChange?.({
          country: country.name,
          countryCode: country.code,
          state: state?.name || location.state || '',
          stateCode: state?.code || '',
          city: location.name
        });
      }
    }
    setShowSearch(false);
  };

  // Clear selection
  const clearSelection = () => {
    onChange?.({
      country: '',
      countryCode: '',
      state: '',
      stateCode: '',
      city: ''
    });
  };

  // Layout classes
  const getLayoutClasses = () => {
    switch (layout) {
      case 'horizontal':
        return 'flex flex-wrap gap-4';
      case 'grid':
        return 'grid grid-cols-1 md:grid-cols-3 gap-4';
      default:
        return 'space-y-4';
    }
  };

  return (
    <div className={cn("space-y-4", className)}>
      {/* Action Buttons */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          {enableGeolocation && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleGeolocation}
              disabled={isDetectingLocation}
              className="text-xs"
            >
              <Navigation className={cn(
                "h-3 w-3 mr-1",
                isDetectingLocation && "animate-spin"
              )} />
              {isDetectingLocation ? 'Detecting...' : 'Auto-detect'}
            </Button>
          )}
          
          {enableSearch && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setShowSearch(!showSearch)}
              className="text-xs"
            >
              <MapPin className="h-3 w-3 mr-1" />
              Search
            </Button>
          )}
        </div>

        {(value.country || value.state || value.city) && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={clearSelection}
            className="text-xs text-muted-foreground hover:text-foreground"
          >
            <X className="h-3 w-3 mr-1" />
            Clear
          </Button>
        )}
      </div>

      {/* Search Component */}
      {showSearch && (
        <div className="border rounded-md p-3 bg-muted/20">
          <LocationSearch
            placeholder="Search for any location worldwide..."
            onLocationSelect={handleSearchLocationSelect}
            enableGeolocation={false}
            showPopulation={showPopulation}
          />
        </div>
      )}

      {/* Location Selectors */}
      <div className={getLayoutClasses()}>
        {/* Country Selector */}
        <div className="space-y-2">
          {showLabels && (
            <Label htmlFor="country" className="flex items-center space-x-1">
              <Globe className="h-3 w-3" />
              <span>Country {required && <span className="text-red-500">*</span>}</span>
            </Label>
          )}
          <Select value={value.countryCode || ''} onValueChange={handleCountryChange}>
            <SelectTrigger id="country">
              <SelectValue placeholder="Select country">
                {value.countryCode && countries.find(c => c.code === value.countryCode)?.name}
              </SelectValue>
            </SelectTrigger>
            <SelectContent className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700">
              {countries.map((country) => (
                <SelectItem key={country.code} value={country.code}>
                  <div className="flex items-center space-x-2">
                    <span>{country.flag}</span>
                    <span>{country.name}</span>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* State Selector */}
        <div className="space-y-2">
          {showLabels && (
            <Label htmlFor="state" className="flex items-center space-x-1">
              <Building className="h-3 w-3" />
              <span>State/Province {required && <span className="text-red-500">*</span>}</span>
            </Label>
          )}
          <Select 
            value={value.stateCode || ''} 
            onValueChange={handleStateChange}
            disabled={!value.countryCode || states.length === 0}
          >
            <SelectTrigger id="state">
              <SelectValue placeholder={
                !value.countryCode 
                  ? "Select country first" 
                  : states.length === 0 
                    ? "No states available"
                    : "Select state"
              }>
                {value.stateCode && states.find(s => (s.code || s.name) === value.stateCode)?.name}
              </SelectValue>
            </SelectTrigger>
            <SelectContent className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700">
              {states.map((state) => (
                <SelectItem key={state.id} value={state.code || state.name}>
                  {state.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* City Selector */}
        <div className="space-y-2">
          {showLabels && (
            <Label htmlFor="city" className="flex items-center space-x-1">
              <MapPin className="h-3 w-3" />
              <span>City {required && <span className="text-red-500">*</span>}</span>
            </Label>
          )}
          <Select 
            value={value.city || ''} 
            onValueChange={handleCityChange}
            disabled={!value.countryCode || (!value.stateCode && states.length > 0) || cities.length === 0}
          >
            <SelectTrigger id="city">
              <SelectValue placeholder={
                !value.countryCode 
                  ? "Select country first"
                  : states.length > 0 && !value.stateCode
                    ? "Select state first"
                    : cities.length === 0
                      ? "No cities available"
                      : "Select city"
              }>
                {value.city}
              </SelectValue>
            </SelectTrigger>
            <SelectContent className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700">
              {cities.map((city) => (
                <SelectItem key={city.id} value={city.name}>
                  <div className="flex items-center justify-between w-full">
                    <span>{city.name}</span>
                    {showPopulation && city.population && (
                      <Badge variant="outline" className="ml-2 text-xs">
                        {city.population >= 1000000 
                          ? `${(city.population / 1000000).toFixed(1)}M`
                          : city.population >= 1000
                            ? `${Math.round(city.population / 1000)}K`
                            : city.population.toLocaleString()
                        }
                      </Badge>
                    )}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Selected Location Display */}
      {(value.country || value.state || value.city) && (
        <div className="p-3 bg-muted/20 rounded-md">
          <div className="text-sm font-medium text-muted-foreground mb-1">Selected Location:</div>
          <div className="text-sm">
            {[value.city, value.state, value.country].filter(Boolean).join(', ')}
          </div>
        </div>
      )}
    </div>
  );
};

export default LocationSelector;
