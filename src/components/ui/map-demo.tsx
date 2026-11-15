"use client";

import React from "react";
import { WorldMap } from "@/components/ui/map";

export default function MapDemo() {
  return (
    <div className="py-20 dark:bg-black bg-white w-full">
      <div className="max-w-7xl mx-auto text-center px-4">
        <p className="font-bold text-xl md:text-4xl dark:text-white text-black">
          Global Disaster Intelligence Network
        </p>
        <p className="text-sm md:text-lg text-neutral-500 max-w-2xl mx-auto py-4">
          Connect incident reporting, seismic telemetry, and civil defense units worldwide.
          Autonomous correlation across continents with real-time BiLSTM neural dispatch.
        </p>
      </div>
      <WorldMap
        lineColor="#326B54"
        dots={[
          {
            start: { lat: 64.2008, lng: -149.4937, label: "Fairbanks" },
            end: { lat: 34.0522, lng: -118.2437, label: "Los Angeles" },
          },
          {
            start: { lat: 64.2008, lng: -149.4937, label: "Fairbanks" },
            end: { lat: -15.7975, lng: -47.8919, label: "Brasília" },
          },
          {
            start: { lat: -15.7975, lng: -47.8919, label: "Brasília" },
            end: { lat: 38.7223, lng: -9.1393, label: "Lisbon" },
          },
          {
            start: { lat: 51.5074, lng: -0.1278, label: "London" },
            end: { lat: 28.6139, lng: 77.209, label: "New Delhi" },
          },
          {
            start: { lat: 28.6139, lng: 77.209, label: "New Delhi" },
            end: { lat: 43.1332, lng: 131.9113, label: "Vladivostok" },
          },
          {
            start: { lat: 28.6139, lng: 77.209, label: "New Delhi" },
            end: { lat: -1.2921, lng: 36.8219, label: "Nairobi" },
          },
        ]}
      />
    </div>
  );
}

