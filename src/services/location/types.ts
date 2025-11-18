// Location service types and interfaces

export interface Country {
  id: string;
  name: string;
  code: string; // ISO 2-letter code
  code3: string; // ISO 3-letter code
  capital?: string;
  region: string;
  subregion?: string;
  currency?: string;
  languages?: string[];
  callingCode?: string;
  flag?: string;
  population?: number;
  timezone?: string;
}

export interface State {
  id: string;
  name: string;
  code?: string;
  countryCode: string;
  countryName: string;
  type?: string; // state, province, region, etc.
  latitude?: number;
  longitude?: number;
}

export interface City {
  id: string;
  name: string;
  stateCode?: string;
  stateName?: string;
  countryCode: string;
  countryName: string;
  latitude?: number;
  longitude?: number;
  population?: number;
  timezone?: string;
}

export interface LocationSearchResult {
  type: 'country' | 'state' | 'city';
  id: string;
  name: string;
  displayName: string;
  country?: string;
  state?: string;
  population?: number;
  coordinates?: {
    latitude: number;
    longitude: number;
  };
}

export interface GeolocationResult {
  country: string;
  countryCode: string;
  state?: string;
  stateCode?: string;
  city?: string;
  latitude: number;
  longitude: number;
  accuracy?: number;
}

export interface LocationCache {
  key: string;
  data: any;
  timestamp: number;
  ttl: number; // time to live in milliseconds
}

export interface LocationServiceConfig {
  enableGeolocation: boolean;
  enableCache: boolean;
  cacheTimeout: number; // in milliseconds
  enableSearch: boolean;
  searchMinLength: number;
  enableAPI: boolean;
  apiEndpoints: {
    countries?: string;
    states?: string;
    cities?: string;
    geocoding?: string;
  };
}

