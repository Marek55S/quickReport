"use client";

import "leaflet/dist/leaflet.css";
import { CircleMarker, MapContainer, TileLayer, useMapEvents } from "react-leaflet";
import type { Position } from "./media";

type Props = {
  value: Position;
  reference?: Position;
  onPick: (lat: number, lng: number) => void;
};

/** Tap-to-place map for choosing the report location manually. */
export default function PickerMap({ value, reference, onPick }: Props) {
  return (
    <MapContainer center={[value.lat, value.lng]} zoom={17} className="size-full" scrollWheelZoom={false}>
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      {reference && (
        <CircleMarker
          center={[reference.lat, reference.lng]}
          radius={6}
          pathOptions={{ color: "#fff", weight: 2, fillColor: "#5c5a54", fillOpacity: 0.9 }}
        />
      )}
      <CircleMarker
        center={[value.lat, value.lng]}
        radius={11}
        pathOptions={{ color: "#17181a", weight: 3, fillColor: "#ffcc00", fillOpacity: 1 }}
      />
      <ClickHandler onPick={onPick} />
    </MapContainer>
  );
}

function ClickHandler({ onPick }: { onPick: Props["onPick"] }) {
  useMapEvents({ click: (e) => onPick(e.latlng.lat, e.latlng.lng) });
  return null;
}
