import { useCallback, useEffect, useState } from "react";

export type Coords = { latitude: number; longitude: number };

const STORAGE_KEY = "skillora:coords";

export function getStoredCoords(): Coords | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as Coords) : null;
  } catch {
    return null;
  }
}

export function useGeolocation() {
  const [coords, setCoords] = useState<Coords | null>(null);
  const [status, setStatus] = useState<"idle" | "loading" | "granted" | "denied" | "error">("idle");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const stored = getStoredCoords();
    if (stored) {
      setCoords(stored);
      setStatus("granted");
    }
  }, []);

  const request = useCallback(() => {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      setStatus("error");
      setError("Geolocation is not supported by your browser.");
      return;
    }
    setStatus("loading");
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const c: Coords = { latitude: pos.coords.latitude, longitude: pos.coords.longitude };
        setCoords(c);
        setStatus("granted");
        try {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(c));
        } catch {}
      },
      (err) => {
        setStatus(err.code === err.PERMISSION_DENIED ? "denied" : "error");
        setError(err.message);
      },
      { enableHighAccuracy: true, timeout: 10_000, maximumAge: 60_000 },
    );
  }, []);

  return { coords, status, error, request };
}

// Haversine distance in km
export function distanceKm(a: Coords, b: Coords): number {
  const R = 6371;
  const dLat = ((b.latitude - a.latitude) * Math.PI) / 180;
  const dLng = ((b.longitude - a.longitude) * Math.PI) / 180;
  const lat1 = (a.latitude * Math.PI) / 180;
  const lat2 = (b.latitude * Math.PI) / 180;
  const x = Math.sin(dLat / 2) ** 2 + Math.sin(dLng / 2) ** 2 * Math.cos(lat1) * Math.cos(lat2);
  return 2 * R * Math.asin(Math.sqrt(x));
}