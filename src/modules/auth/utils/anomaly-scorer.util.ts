import { Injectable } from '@nestjs/common';
import { GeolocationUtil } from './geolocation.util';

export interface AnomalyEvent {
  userId: string;
  ip: string;
  userAgent: string;
  timestamp: Date;
  // Historial del usuario (del DB)
  knownCountries: string[];
  knownUserAgents: string[];
  usualHourStart: number;  // 8 (8am)
  usualHourEnd: number;    // 20 (8pm)
  lastLoginIp?: string;
  lastLoginTime?: Date;
  lastLoginLat?: number;
  lastLoginLon?: number;
  failedAttemptsLast24h: number;
  concurrentSessionsCount: number;
}

export interface AnomalyScore {
  total: number;           // 0-100
  breakdown: Record<string, number>;
  flags: string[];
  action: 'allow' | 'require_2fa' | 'block';
}

@Injectable()
export class AnomalyScorerUtil {
  constructor(private readonly geo: GeolocationUtil) {}

  score(event: AnomalyEvent): AnomalyScore {
    const breakdown: Record<string, number> = {};
    const flags: string[] = [];
    let total = 0;

    // 1. País nuevo (+30 puntos)
    const geoData = this.geo.getLocation(event.ip);
    if (!geoData.isPrivateIP && this.geo.isNewCountry(event.ip, event.knownCountries)) {
      breakdown['new_country'] = 30;
      flags.push(`Login desde país nuevo: ${geoData.countryName}`);
      total += 30;
    }

    // 2. Viaje imposible (+40 puntos)
    if (
      event.lastLoginLat !== undefined &&
      event.lastLoginLon !== undefined &&
      event.lastLoginTime &&
      !geoData.isPrivateIP
    ) {
      const impossible = this.geo.isImpossibleTravel(
        event.lastLoginLat, event.lastLoginLon, event.lastLoginTime,
        geoData.latitude, geoData.longitude, event.timestamp
      );
      if (impossible) {
        breakdown['impossible_travel'] = 40;
        flags.push('Velocidad de desplazamiento imposible entre logins');
        total += 40;
      }
    }

    // 3. User-agent desconocido (+15 puntos)
    const uaKnown = event.knownUserAgents.some(ua =>
      this.normalizeUA(ua) === this.normalizeUA(event.userAgent)
    );
    if (!uaKnown && event.knownUserAgents.length > 0) {
      breakdown['unknown_device'] = 15;
      flags.push('User-agent no reconocido');
      total += 15;
    }

    // 4. Hora inusual (+10 puntos)
    const hour = event.timestamp.getHours();
    if (hour < event.usualHourStart || hour > event.usualHourEnd) {
      breakdown['unusual_hour'] = 10;
      flags.push(`Login fuera del horario habitual (hora: ${hour})`);
      total += 10;
    }

    // 5. Múltiples fallos recientes (+20 puntos)
    if (event.failedAttemptsLast24h >= 3) {
      const pts = Math.min(20, event.failedAttemptsLast24h * 4);
      breakdown['failed_attempts'] = pts;
      flags.push(`${event.failedAttemptsLast24h} intentos fallidos en las últimas 24h`);
      total += pts;
    }

    // 6. Muchas sesiones concurrentes (+5 puntos)
    if (event.concurrentSessionsCount >= 4) {
      breakdown['many_sessions'] = 5;
      flags.push(`${event.concurrentSessionsCount} sesiones activas simultáneas`);
      total += 5;
    }

    total = Math.min(100, total);

    let action: 'allow' | 'require_2fa' | 'block';
    if (total >= 90) action = 'block';
    else if (total >= 40) action = 'require_2fa';
    else action = 'allow';

    return { total, breakdown, flags, action };
  }

  private normalizeUA(ua: string): string {
    // Normalizar: ignorar versiones menores del navegador
    return ua.replace(/(\d+\.\d+)\.\d+(\.\d+)?/g, '$1').toLowerCase().trim();
  }
}
