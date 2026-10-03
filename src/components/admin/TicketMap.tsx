"use client";

import "leaflet/dist/leaflet.css";
import { useEffect } from "react";
import { CircleMarker, MapContainer, TileLayer, Tooltip, useMap } from "react-leaflet";
import type { Ticket } from "@/lib/types";
import { markerRadius, severityColor } from "./severity";

const KRAKOW: [number, number] = [50.0614, 19.9372];

type Props = {
  tickets: Ticket[];
  selectedId: string | null;
  onSelect: (id: string) => void;
};

export default function TicketMap({ tickets, selectedId, onSelect }: Props) {
  return (
    <MapContainer center={KRAKOW} zoom={14} className="ticket-map size-full" scrollWheelZoom>
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      {/* Smaller tickets first so the most severe ones are drawn on top. */}
      {[...tickets].reverse().map((t) => {
        const selected = t.id === selectedId;
        return (
          <CircleMarker
            key={`${t.id}-${t.severity_score}-${selected}`}
            center={[t.gps_lat, t.gps_lng]}
            radius={markerRadius(t.severity_score)}
            pathOptions={{
              color: selected ? "#1e3a8a" : "#ffffff",
              weight: selected ? 4 : 2,
              fillColor: severityColor(t.severity_score),
              fillOpacity: 0.85,
            }}
            eventHandlers={{ click: () => onSelect(t.id) }}
          >
            <Tooltip direction="top" offset={[0, -markerRadius(t.severity_score)]}>
              <strong>{t.title}</strong>
              <br />
              Zgłoszeń: {t.severity_score}
            </Tooltip>
          </CircleMarker>
        );
      })}
      <Viewport tickets={tickets} selectedId={selectedId} />
    </MapContainer>
  );
}

function Viewport({ tickets, selectedId }: { tickets: Ticket[]; selectedId: string | null }) {
  const map = useMap();
  const ids = tickets.map((t) => t.id).join();

  // Fit all markers whenever the set of tickets changes (not on severity updates).
  useEffect(() => {
    if (!tickets.length) return;
    map.fitBounds(
      tickets.map((t) => [t.gps_lat, t.gps_lng] as [number, number]),
      { padding: [60, 60], maxZoom: 16 },
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ids, map]);

  useEffect(() => {
    const t = tickets.find((x) => x.id === selectedId);
    if (t) map.flyTo([t.gps_lat, t.gps_lng], Math.max(map.getZoom(), 16), { duration: 0.6 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedId, map]);

  return null;
}
