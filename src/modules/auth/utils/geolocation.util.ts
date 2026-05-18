import { Injectable } from '@nestjs/common';
import * as geoip from 'geoip-lite';

export interface GeoLocation {
  country: string;       // "Ecuador"
  countryCode: string;   // "EC"
  city: string;
  region: string;
  lat: number;
  lng: number;
  latitude: number;      // Keep for backward compatibility if needed within the file
  longitude: number;     // Keep for backward compatibility if needed within the file
  timezone: string;
  isPrivateIP: boolean;
}

@Injectable()
export class GeolocationUtil {
  getLocation(ip: string): GeoLocation {
    // Manejar IPs privadas/localhost
    const privateRanges = ['127.0.0.1', '::1', 'localhost'];
    if (privateRanges.includes(ip) || ip.startsWith('192.168.') || ip.startsWith('10.') || ip.startsWith('172.')) {
      return {
        country: 'Local Network', countryCode: 'LOCAL', city: 'Local',
        region: '', lat: 0, lng: 0, latitude: 0, longitude: 0,
        timezone: 'UTC', isPrivateIP: true
      };
    }

    const geo = geoip.lookup(ip);
    if (!geo) {
      return {
        country: 'Unknown', countryCode: 'UNKNOWN', city: 'Unknown',
        region: '', lat: 0, lng: 0, latitude: 0, longitude: 0,
        timezone: 'UTC', isPrivateIP: false
      };
    }

    const latitude = geo.ll?.[0] ?? 0;
    const longitude = geo.ll?.[1] ?? 0;

    return {
      country: geo.country, 
      countryCode: geo.country,
      city: geo.city || 'Unknown',
      region: geo.region || '',
      lat: latitude,
      lng: longitude,
      latitude,
      longitude,
      timezone: geo.timezone || 'UTC',
      isPrivateIP: false
    };
  }

  isNewCountry(currentIp: string, knownCountries: string[]): boolean {
    const geo = this.getLocation(currentIp);
    if (geo.isPrivateIP) return false;
    return !knownCountries.includes(geo.country);
  }

  calculateDistanceKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
    // Haversine formula
    const R = 6371;
    const dLat = this.toRad(lat2 - lat1);
    const dLon = this.toRad(lon2 - lon1);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.toRad(lat1)) * Math.cos(this.toRad(lat2)) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  }

  isImpossibleTravel(
    prevLat: number, prevLon: number, prevTime: Date,
    currLat: number, currLon: number, currTime: Date
  ): boolean {
    const distKm = this.calculateDistanceKm(prevLat, prevLon, currLat, currLon);
    const elapsedHours = (currTime.getTime() - prevTime.getTime()) / 3_600_000;
    if (elapsedHours <= 0) return distKm > 0;
    const speedKmh = distKm / elapsedHours;
    return speedKmh > 900; // Velocidad máxima de avión comercial
  }

  private toRad(deg: number): number {
    return deg * (Math.PI / 180);
  }
}
