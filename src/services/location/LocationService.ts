import { Country as CSCCountry, State as CSCState, City as CSCCity } from 'country-state-city';
import Fuse from 'fuse.js';
import debounce from 'lodash.debounce';
import { 
  Country, 
  State, 
  City, 
  LocationSearchResult, 
  GeolocationResult, 
  LocationCache, 
  LocationServiceConfig 
} from './types';

class LocationService {
  private cache = new Map<string, LocationCache>();
  private searchCache = new Map<string, LocationSearchResult[]>();
  private fuseCountries: Fuse<Country>;
  private fuseStates: Fuse<State>;
  private fuseCities: Fuse<City>;
  
  private config: LocationServiceConfig = {
    enableGeolocation: true,
    enableCache: true,
    cacheTimeout: 24 * 60 * 60 * 1000, // 24 hours
    enableSearch: true,
    searchMinLength: 2,
    enableAPI: true,
    apiEndpoints: {
      geocoding: 'https://api.bigdatacloud.net/data/reverse-geocode-client'
    }
  };

  constructor(config?: Partial<LocationServiceConfig>) {
    if (config) {
      this.config = { ...this.config, ...config };
    }
    
    // Initialize search indices
    this.initializeSearchIndices();
  }

  private initializeSearchIndices() {
    try {
      const countries = this.getAllCountries();
      
      this.fuseCountries = new Fuse(countries, {
        keys: ['name', 'code', 'code3'],
        threshold: 0.3,
        includeScore: true
      });

      // Initialize states and cities lazily to avoid blocking
      setTimeout(() => {
        try {
          const states = this.getAllStates();
          this.fuseStates = new Fuse(states, {
            keys: ['name', 'countryName'],
            threshold: 0.3,
            includeScore: true
          });

          const cities = this.getAllCities();
          this.fuseCities = new Fuse(cities, {
            keys: ['name', 'stateName', 'countryName'],
            threshold: 0.3,
            includeScore: true
          });
        } catch (error) {
          console.error('Error initializing states/cities search indices:', error);
        }
      }, 100);
    } catch (error) {
      console.error('Error initializing search indices:', error);
    }
  }

  // Cache management
  private getCached<T>(key: string): T | null {
    if (!this.config.enableCache) return null;
    
    const cached = this.cache.get(key);
    if (!cached) return null;
    
    if (Date.now() - cached.timestamp > cached.ttl) {
      this.cache.delete(key);
      return null;
    }
    
    return cached.data as T;
  }

  private setCache<T>(key: string, data: T, ttl?: number): void {
    if (!this.config.enableCache) return;
    
    this.cache.set(key, {
      key,
      data,
      timestamp: Date.now(),
      ttl: ttl || this.config.cacheTimeout
    });
  }

  // Data transformation helpers
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private transformCountry(country: any): Country {
    return {
      id: country.isoCode,
      name: country.name,
      code: country.isoCode,
      code3: country.isoCode, // CSC doesn't provide ISO3, using ISO2
      capital: country.capital || undefined,
      region: country.region || '',
      subregion: country.subregion || undefined,
      currency: country.currency || undefined,
      callingCode: country.phonecode || undefined,
      flag: country.flag || undefined,
      timezone: country.timezones?.[0]?.zoneName || undefined
    };
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private transformState(state: any, countryName: string): State {
    return {
      id: `${state.countryCode}-${state.isoCode}`,
      name: state.name,
      code: state.isoCode,
      countryCode: state.countryCode,
      countryName,
      type: 'state',
      latitude: state.latitude ? parseFloat(state.latitude) : undefined,
      longitude: state.longitude ? parseFloat(state.longitude) : undefined
    };
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private transformCity(city: any, stateName?: string, countryName?: string): City {
    return {
      id: `${city.countryCode}-${city.stateCode}-${city.name}`,
      name: city.name,
      stateCode: city.stateCode,
      stateName: stateName || city.stateCode,
      countryCode: city.countryCode,
      countryName: countryName || city.countryCode,
      latitude: city.latitude ? parseFloat(city.latitude) : undefined,
      longitude: city.longitude ? parseFloat(city.longitude) : undefined
    };
  }

  // Core data retrieval methods
  public getAllCountries(): Country[] {
    const cacheKey = 'all-countries';
    const cached = this.getCached<Country[]>(cacheKey);
    if (cached) return cached;

    const countries = CSCCountry.getAllCountries().map(this.transformCountry);
    this.setCache(cacheKey, countries);
    return countries;
  }

  public getStatesOfCountry(countryCode: string): State[] {
    const cacheKey = `states-${countryCode}`;
    const cached = this.getCached<State[]>(cacheKey);
    if (cached) return cached;

    const country = CSCCountry.getCountryByCode(countryCode);
    if (!country) return [];

    const states = CSCState.getStatesOfCountry(countryCode).map(state => 
      this.transformState(state, country.name)
    );
    
    this.setCache(cacheKey, states);
    return states;
  }

  public getCitiesOfState(countryCode: string, stateCode: string): City[] {
    const cacheKey = `cities-${countryCode}-${stateCode}`;
    const cached = this.getCached<City[]>(cacheKey);
    if (cached) return cached;

    const country = CSCCountry.getCountryByCode(countryCode);
    let state = CSCState.getStateByCodeAndCountry(stateCode, countryCode);
    
    // If state not found by code, try finding by name
    if (!state) {
      const allStates = CSCState.getStatesOfCountry(countryCode);
      state = allStates.find(s => s.name === stateCode);
    }
    
    if (!country || !state) {
      console.warn(`State not found: ${stateCode} in ${countryCode}`);
      return [];
    }

    const cities = CSCCity.getCitiesOfState(countryCode, state.isoCode).map(city =>
      this.transformCity(city, state.name, country.name)
    );

    this.setCache(cacheKey, cities);
    return cities;
  }

  public getCitiesOfCountry(countryCode: string): City[] {
    const cacheKey = `cities-country-${countryCode}`;
    const cached = this.getCached<City[]>(cacheKey);
    if (cached) return cached;

    const country = CSCCountry.getCountryByCode(countryCode);
    if (!country) return [];

    const cities = CSCCity.getCitiesOfCountry(countryCode).map(city =>
      this.transformCity(city, undefined, country.name)
    );

    this.setCache(cacheKey, cities);
    return cities;
  }

  private getAllStates(): State[] {
    const cacheKey = 'all-states';
    const cached = this.getCached<State[]>(cacheKey);
    if (cached) return cached;

    const allStates: State[] = [];
    const countries = this.getAllCountries();

    countries.forEach(country => {
      const states = this.getStatesOfCountry(country.code);
      allStates.push(...states);
    });

    this.setCache(cacheKey, allStates);
    return allStates;
  }

  private getAllCities(): City[] {
    const cacheKey = 'all-cities';
    const cached = this.getCached<City[]>(cacheKey);
    if (cached) return cached;

    // For performance, we'll only load cities for major countries initially
    const majorCountries = ['US', 'CA', 'GB', 'DE', 'FR', 'AU', 'IN', 'CN', 'JP', 'BR'];
    const allCities: City[] = [];

    majorCountries.forEach(countryCode => {
      const cities = this.getCitiesOfCountry(countryCode);
      allCities.push(...cities.slice(0, 100)); // Limit to top 100 cities per country
    });

    this.setCache(cacheKey, allCities);
    return allCities;
  }

  // Search functionality (non-debounced)
  private performSearch(query: string): LocationSearchResult[] {
    if (!this.config.enableSearch || query.length < this.config.searchMinLength) {
      return [];
    }

    // Ensure at least countries search index is initialized
    if (!this.fuseCountries) {
      console.warn('Search indices not initialized yet');
      return [];
    }

    const cacheKey = `search-${query.toLowerCase()}`;
    const cached = this.searchCache.get(cacheKey);
    if (cached) return cached;

    const results: LocationSearchResult[] = [];

    // Search countries (always available)
    if (this.fuseCountries) {
      const countryResults = this.fuseCountries.search(query).slice(0, 5);
      countryResults.forEach(result => {
        const country = result.item;
        results.push({
          type: 'country',
          id: country.id,
          name: country.name,
          displayName: `${country.name} ${country.flag || ''}`,
          country: country.name
        });
      });
    }

    // Search states (if available)
    if (this.fuseStates) {
      const stateResults = this.fuseStates.search(query).slice(0, 10);
      stateResults.forEach(result => {
        const state = result.item;
        results.push({
          type: 'state',
          id: state.id,
          name: state.name,
          displayName: `${state.name}, ${state.countryName}`,
          country: state.countryName,
          state: state.name,
          coordinates: state.latitude && state.longitude ? {
            latitude: state.latitude,
            longitude: state.longitude
          } : undefined
        });
      });
    }

    // Search cities (if available)
    if (this.fuseCities) {
      const cityResults = this.fuseCities.search(query).slice(0, 15);
      cityResults.forEach(result => {
        const city = result.item;
        results.push({
          type: 'city',
          id: city.id,
          name: city.name,
          displayName: `${city.name}${city.stateName ? `, ${city.stateName}` : ''}, ${city.countryName}`,
          country: city.countryName,
          state: city.stateName,
          population: city.population,
          coordinates: city.latitude && city.longitude ? {
            latitude: city.latitude,
            longitude: city.longitude
          } : undefined
        });
      });
    }

    // Sort by relevance (countries first, then states, then cities)
    const sortedResults = results.sort((a, b) => {
      const typeOrder = { country: 0, state: 1, city: 2 };
      return typeOrder[a.type] - typeOrder[b.type];
    });

    this.searchCache.set(cacheKey, sortedResults);
    return sortedResults;
  }

  // Public search methods
  public searchLocations(query: string): LocationSearchResult[] {
    return this.performSearch(query);
  }

  public searchLocationsDebounced = debounce((query: string, callback: (results: LocationSearchResult[]) => void) => {
    const results = this.performSearch(query);
    callback(results);
  }, 300);

  // Geolocation functionality
  public async getCurrentLocation(): Promise<GeolocationResult | null> {
    if (!this.config.enableGeolocation) return null;

    try {
      // Get user's coordinates
      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 300000 // 5 minutes
        });
      });

      const { latitude, longitude, accuracy } = position.coords;

      // Try multiple reverse geocoding APIs for better reliability
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let data: Record<string, any> | null = null;
      
      try {
        // Try BigDataCloud first
        const response = await fetch(
          `${this.config.apiEndpoints.geocoding}?latitude=${latitude}&longitude=${longitude}&localityLanguage=en`
        );
        
        if (response.ok) {
          data = await response.json();
        }
      } catch (error) {
        console.warn('BigDataCloud geocoding failed:', error);
      }

      // Fallback to a simpler API if the first fails
      if (!data) {
        try {
          const response = await fetch(
            `https://api.bigdatacloud.net/data/reverse-geocode?latitude=${latitude}&longitude=${longitude}&localityLanguage=en`
          );
          
          if (response.ok) {
            data = await response.json();
          }
        } catch (error) {
          console.warn('Fallback geocoding failed:', error);
          throw new Error('All geocoding services failed');
        }
      }

      if (!data) {
        throw new Error('No geocoding data received');
      }

      return {
        country: data.countryName || data.country,
        countryCode: data.countryCode || data.country_code,
        state: data.principalSubdivision || data.state || data.region,
        stateCode: data.principalSubdivisionCode || data.state_code,
        city: data.city || data.locality || data.town,
        latitude,
        longitude,
        accuracy
      };
    } catch (error) {
      console.warn('Geolocation failed:', error);
      return null;
    }
  }

  // Utility methods
  public getCountryByCode(code: string): Country | null {
    const countries = this.getAllCountries();
    return countries.find(c => c.code === code || c.code3 === code) || null;
  }

  public clearCache(): void {
    this.cache.clear();
    this.searchCache.clear();
  }

  public getCacheStats() {
    return {
      cacheSize: this.cache.size,
      searchCacheSize: this.searchCache.size,
      memoryUsage: JSON.stringify([...this.cache.values()]).length
    };
  }
}

// Export singleton instance
export const locationService = new LocationService();
export default LocationService;
