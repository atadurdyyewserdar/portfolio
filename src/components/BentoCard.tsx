import React, { useEffect } from "react";
import {
  MapContainer,
  TileLayer,
  Marker,
  useMapEvents,
  useMap,
} from "react-leaflet";
import L from "leaflet";
import "../leaflet-styles-import";
import { BlurFade } from "./ui/blur-fade";

// CSS for pulsing dot and flying plane
const mapStyles = `
  @keyframes pulse {
    0%, 100% { transform: translate(-50%, -50%) scale(1); opacity: 1; }
    50% { transform: translate(-50%, -50%) scale(1.5); opacity: 0.7; }
  }
  @keyframes pulseRing {
    0% { transform: translate(-50%, -50%) scale(1); opacity: 0.6; }
    100% { transform: translate(-50%, -50%) scale(2.5); opacity: 0; }
  }
  @keyframes flyPlane {
    0% { 
      transform: translate(-200px, -150px) rotate(135deg);
      opacity: 0;
    }
    5% {
      opacity: 1;
    }
    95% {
      opacity: 1;
    }
    100% { 
      transform: translate(200px, 150px) rotate(135deg);
      opacity: 0;
    }
  }
  .pulsing-dot {
    width: 14px;
    height: 14px;
    background: #007AFF;
    border-radius: 50%;
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    animation: pulse 2s ease-in-out infinite;
    box-shadow: 0 0 0 4px rgba(0, 122, 255, 0.3);
  }
  .pulse-ring {
    width: 14px;
    height: 14px;
    border: 2px solid #007AFF;
    border-radius: 50%;
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    animation: pulseRing 2s ease-out infinite;
  }
  .flying-plane {
    font-size: 24px;
    animation: flyPlane 12s ease-in-out infinite;
    filter: drop-shadow(2px 2px 3px rgba(0,0,0,0.4));
  }
`;

// Component to handle map events
const MapEventHandler = ({
  onMapReady,
}: {
  onMapReady: (map: L.Map) => void;
}) => {
  const map = useMapEvents({
    zoomend: () => {
      // Zoom event is now handled
    },
  });

  useEffect(() => {
    onMapReady(map);
  }, [map, onMapReady]);

  return null;
};

// Helper to calculate bearing between two lat/lng points
function getBearing(start: [number, number], end: [number, number]) {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const toDeg = (rad: number) => (rad * 180) / Math.PI;
  const [lat1, lon1] = start.map(toRad);
  const [lat2, lon2] = end.map(toRad);
  const dLon = lon2 - lon1;
  const y = Math.sin(dLon) * Math.cos(lat2);
  const x =
    Math.cos(lat1) * Math.sin(lat2) -
    Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLon);
  const brng = Math.atan2(y, x);
  return (toDeg(brng) + 360) % 360;
}

// Animated plane marker component — now computes START/END from map bounds so it matches current zoom/view
const AnimatedPlaneMarker: React.FC = () => {
  const map = useMap();
  const [start, setStart] = React.useState<[number, number] | null>(null);
  const [end, setEnd] = React.useState<[number, number] | null>(null);
  const DURATION = 10000; // ms
  const [progress, setProgress] = React.useState(0); // 0 to 1

  // Update start/end based on current map bounds
  React.useEffect(() => {
    if (!map) return;
    const updateBounds = () => {
      const b = map.getBounds();
      const sw = b.getSouthWest();
      const ne = b.getNorthEast();
      const latSpan = ne.lat - sw.lat;
      const lngSpan = ne.lng - sw.lng;
      // extend start earlier (outside SW) and end later (outside NE) so the plane enters and exits the viewport
      // Use moderate extension (12%) so plane starts just outside the visible area
      const extendLat = latSpan * 0.3; // 12% extension
      const extendLng = lngSpan * 0.3;
      setStart([sw.lat - extendLat, sw.lng - extendLng]);
      setEnd([ne.lat + extendLat, ne.lng + extendLng]);
    };
    updateBounds();
    map.on("moveend zoomend resize", updateBounds);
    return () => {
      map.off("moveend zoomend resize", updateBounds);
    };
  }, [map]);

  // Animation loop restarts whenever start/end change — use linear progress for constant speed
  React.useEffect(() => {
    if (!start || !end) return;
    const startTime = performance.now();
    let frame: number;
    const animate = (now: number) => {
      const t = ((now - startTime) % DURATION) / DURATION;
      // linear progress ensures constant speed across the entire path
      setProgress(t);
      frame = requestAnimationFrame(animate);
    };
    frame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(frame);
  }, [start, end]);

  if (!start || !end) return null;

  // Interpolate position using eased progress
  const lat = start[0] + (end[0] - start[0]) * progress;
  const lng = start[1] + (end[1] - start[1]) * progress;
  const bearing = getBearing(start, end);

  // Style for rotation
  const PLANE_ROTATION_OFFSET = -55; // tweak if needed
  const rotation = bearing + PLANE_ROTATION_OFFSET;
  const planeStyle = `transform: rotate(${rotation}deg); transform-origin: center center; display: inline-block; transition: transform 0.25s cubic-bezier(.2,.7,.2,1); font-size: 26px; filter: drop-shadow(0 2px 4px rgba(0,0,0,0.25));`;

  // subtle shadow ellipse under the plane — vary with progress for depth
  const shadowScale = (0.9 + 0.12 * Math.sin(progress * Math.PI)).toFixed(3);
  const shadowOpacityBase = 0.45 + 0.12 * Math.sin(progress * Math.PI);

  // make plane invisible until it actually enters the current map bounds,
  // then fade in over a small inner margin for a smooth entrance
  const bounds = map.getBounds();
  let visible = 0;
  if (bounds && bounds.isValid()) {
    const sw = bounds.getSouthWest();
    const ne = bounds.getNorthEast();
    // quick reject if outside outer bounds
    if (lat >= sw.lat && lat <= ne.lat && lng >= sw.lng && lng <= ne.lng) {
      const latSpan = ne.lat - sw.lat;
      const lngSpan = ne.lng - sw.lng;
      const latMargin = latSpan * 0.06;
      const lngMargin = lngSpan * 0.06;

      const latInnerLow = sw.lat + latMargin;
      const latInnerHigh = ne.lat - latMargin;
      const lngInnerLow = sw.lng + lngMargin;
      const lngInnerHigh = ne.lng - lngMargin;

      const latVis =
        lat < latInnerLow
          ? (lat - sw.lat) / latMargin
          : lat > latInnerHigh
          ? (ne.lat - lat) / latMargin
          : 1;
      const lngVis =
        lng < lngInnerLow
          ? (lng - sw.lng) / lngMargin
          : lng > lngInnerHigh
          ? (ne.lng - lng) / lngMargin
          : 1;

      visible = Math.max(0, Math.min(1, Math.min(latVis, lngVis)));
    }
  }
  const visibleStr = visible.toFixed(3);

  const shadowOpacityFinal = (shadowOpacityBase * visible).toFixed(3);
  const shadowStyle = `position:absolute; bottom:6px; left:50%; transform: translateX(-50%) scale(${shadowScale}); width:18px; height:6px; background:rgba(0,0,0,${shadowOpacityFinal}); border-radius:50%; filter: blur(4px); opacity:${visibleStr};`;

  const containerStyle = `position:relative; width:40px; height:40px; display:flex; align-items:center; justify-content:center; opacity:${visibleStr};`;
  const planeEmoji = `✈️`;

  const html = `<div style="${containerStyle}"><div style="${planeStyle}">${planeEmoji}</div><div style="${shadowStyle}"></div></div>`;

  return (
    <Marker
      position={[lat, lng]}
      icon={L.divIcon({
        className: "",
        html,
        iconSize: [40, 40],
        iconAnchor: [20, 20],
      })}
    />
  );
};

// Custom map component with zoom controls in bottom right
const MapWithCustomZoom: React.FC = () => {
  const mapRef = React.useRef<L.Map | null>(null);
  const [zoom, setZoom] = React.useState(12);
  const [isMobile, setIsMobile] = React.useState(window.innerWidth < 1024);

  // Inject styles for animations
  useEffect(() => {
    const styleEl = document.createElement("style");
    styleEl.textContent = mapStyles;
    document.head.appendChild(styleEl);
    return () => {
      document.head.removeChild(styleEl);
    };
  }, []);

  // Update mobile state on resize
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 1024);
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Update zoom state when map zoom changes
  const handleMapReady = (map: L.Map) => {
    mapRef.current = map;
    map.on("zoomend", () => setZoom(map.getZoom()));
  };

  const handleZoomIn = () => {
    if (mapRef.current) {
      mapRef.current.setZoom(mapRef.current.getZoom() + 1);
    }
  };

  const handleZoomOut = () => {
    if (mapRef.current) {
      mapRef.current.setZoom(mapRef.current.getZoom() - 1);
    }
  };

  return (
    <div className="w-full h-full relative">
      <MapContainer
        center={[47.4979, 19.0402]}
        zoom={zoom}
        scrollWheelZoom={false}
        style={{
          height: "100%",
          width: "100%",
          zIndex: 1,
          borderRadius: "inherit",
        }}
        dragging={!isMobile}
        zoomControl={false}
        attributionControl={false}
      >
        <MapEventHandler onMapReady={handleMapReady} />
        <TileLayer url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png" />
        {/* Pulsing blue dot marker */}
        <Marker
          position={[47.4979, 19.0402]}
          icon={L.divIcon({
            className: "",
            html: `<div style="position:relative;width:40px;height:40px;"><div class="pulse-ring"></div><div class="pulsing-dot"></div></div>`,
            iconSize: [40, 40],
            iconAnchor: [20, 20],
          })}
        />
        {/* Animated flying plane marker */}
        <AnimatedPlaneMarker />
      </MapContainer>
      {/* Custom zoom controls */}
      <div className="absolute bottom-3 right-3 bg-white rounded-lg shadow-md border border-gray-200 overflow-hidden z-1000">
        <button
          onClick={handleZoomIn}
          className="w-9 h-9 cursor-pointer flex items-center justify-center hover:bg-gray-100 text-xl font-semibold text-gray-700 transition border-b border-gray-200"
          aria-label="Zoom in"
        >
          +
        </button>
        <button
          onClick={handleZoomOut}
          className="w-9 h-9 flex cursor-pointer items-center justify-center hover:bg-gray-100 text-xl font-semibold text-gray-700 transition"
          aria-label="Zoom out"
        >
          –
        </button>
      </div>
    </div>
  );
};

const BentoCard: React.FC = () => {
  const [contributions, setContributions] = React.useState<
    { week: number; day: number; level: number }[]
  >([]);

  React.useEffect(() => {
    const contributionsArray: { week: number; day: number; level: number }[] =
      [];
    for (let week = 0; week < 12; week++) {
      for (let day = 0; day < 7; day++) {
        const level = Math.random() > 0.3 ? Math.floor(Math.random() * 4) : 0;
        contributionsArray.push({ week, day, level });
      }
    }
    setContributions(contributionsArray);
  }, []);

  const cardClass =
    "bg-white rounded-2xl border border-gray-200 transition-transform duration-300 transform-gpu hover:scale-[1.02]";
  const boxShadowStyle = {
    // lighter single shadow to avoid a heavy border-like outline
    boxShadow: "rgba(0, 0, 0, 0.04) 0px 6px 18px 0px",
  };

  return (
    <div className="min-h-screen bg-white p-4 sm:p-6 lg:p-8 overflow-x-hidden">
      <div className="max-w-7xl mx-auto grid grid-cols-12 gap-6 sm:gap-8 lg:gap-10 xl:gap-12">
        <div className="col-span-12 lg:col-span-3 lg:mt-0 static lg:sticky lg:top-8 lg:self-start">
          <div className="pt-2 sm:pt-4 lg:pt-0 lg:pl-0 lg:-ml-4">
            <img
              src="https://storage.googleapis.com/creatorspace-public/users%2Fcmj9czwp000z0tr01oggxkibz%2Fd3zmnQOL8CLnOXIx-CleanShot%25202025-12-17%2520at%252003.35.54%25402x.png"
              alt="Serdar"
              className="w-32 h-32 sm:w-40 sm:h-40 lg:w-48 lg:h-48 rounded-full object-cover mb-4 mx-auto lg:mx-0"
              style={{ boxShadow: "0 4px 24px 0 rgba(0,0,0,0.10)" }}
            />
            <div className="text-center lg:text-left">
              <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-gray-900 tracking-tight">
                Serdar
              </h1>
              <p className="text-gray-500 text-base sm:text-lg lg:text-2xl mt-2">
                Software Engineer
              </p>
              <p className="text-gray-600 mt-4 max-w-md text-xs sm:text-sm lg:text-base mx-auto lg:mx-0">
                Hey there! I'm an experienced Software Engineer with over 3
                years of professional experience in Java, Spring Boot, and REST
                APIs. I love designing scalable backend and
                skilled in deploying applications on AWS EC2 and integrating
                cloud services. Working in Agile/Scrum environments and leading
                development teams is my jam.
              </p>
            </div>
          </div>
        </div>

        <div
          className="col-span-12 lg:col-span-9 space-y-5 lg:pl-16 xl:pl-20 2xl:pl-28 lg:overflow-y-auto lg:max-h-[calc(100vh-4rem)] hide-scrollbar pr-2 sm:pr-4"
        >
          <div
            className="text-left w-full px-1 sticky top-0 z-20 bg-white pb-2 sm:pb-3 pt-2 sm:pt-4"
            style={{ marginLeft: -2 }}
          >
            <BlurFade delay={0.1} inView>
              <h2 className="text-xl sm:text-2xl font-bold text-gray-900 tracking-tight">
                Welcome 👋
              </h2>
            </BlurFade>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            <BlurFade delay={0.2} inView className="lg:col-span--2">
              <div
                className={`${cardClass} overflow-hidden h-[280px] sm:h-[320px] lg:h-[390px] relative`}
                style={boxShadowStyle}
              >
                {/* Location label box */}
                <div
                  className="absolute ml-3 bottom-3 bg-white rounded-xl px-4 py-1 flex items-center border border-gray-200 z-1000"
                  style={{
                    ...boxShadowStyle,
                    fontWeight: 500,
                    fontSize: "1.1rem",
                    letterSpacing: 0,
                  }}
                >
                  <span className="mr-2 text-lg">📍</span>
                  <span className="text-gray-900">Budapest, Hungary</span>
                </div>
                {/* Leaflet map of Budapest, zoom 10, Apple Maps-style customization to follow */}
                <MapWithCustomZoom />
              </div>
            </BlurFade>

            <div className="">
              <BlurFade
                delay={0.3}
                inView
                className="lg:col-start-2 mb-5 sm:mb-8 min-h-[160px] sm:h-[190px]"
              >
                <div
                  className={`${cardClass} p-4 flex flex-col gap-4 w-full pt-5 pb-10`}
                  style={boxShadowStyle}
                >
                  {/* GitHub top box */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-xl bg-black flex items-center justify-center">
                        <svg
                          className="w-6 h-6 text-white"
                          fill="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            fillRule="evenodd"
                            d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"
                            clipRule="evenodd"
                          />
                        </svg>
                      </div>
                      <div>
                        <span className="text-sm font-medium text-gray-900">
                          Serdar
                        </span>
                        <p className="text-xs text-gray-500">
                          GitHub · atadurdyyewserdar
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() =>
                        window.open(
                          "https://github.com/atadurdyyewserdar",
                          "_blank",
                          "noopener,noreferrer"
                        )
                      }
                      className="cursor-pointer px-4 py-2 border border-zinc-300 rounded-sm bg-gray-50 text-xs font-semibold text-gray-900"
                    >
                      Follow
                    </button>
                  </div>

                  <div className="flex-1 overflow-hidden">
                    <div className="hidden sm:grid grid-cols-25 grid-rows-2 gap-1">
                      {contributions.slice(0, 125).map((contrib, idx) => (
                        <div
                          key={idx}
                          className={`w-2 h-2 sm:w-3 sm:h-3 rounded ${
                            contrib.level === 0
                              ? "bg-gray-200"
                              : contrib.level === 1
                              ? "bg-emerald-200"
                              : contrib.level === 2
                              ? "bg-emerald-400"
                              : contrib.level === 3
                              ? "bg-emerald-500"
                              : "bg-emerald-600"
                          }`}
                        />
                      ))}
                    </div>
                    {/* Simplified mobile view */}
                    <div className="sm:hidden grid grid-cols-12 grid-rows-7 gap-1">
                      {contributions.slice(0, 84).map((contrib, idx) => (
                        <div
                          key={idx}
                          className={`w-2 h-2 rounded-sm ${
                            contrib.level === 0
                              ? "bg-gray-200"
                              : contrib.level === 1
                              ? "bg-emerald-200"
                              : contrib.level === 2
                              ? "bg-emerald-400"
                              : contrib.level === 3
                              ? "bg-emerald-500"
                              : "bg-emerald-600"
                          }`}
                        />
                      ))}
                    </div>
                  </div>
                </div>
              </BlurFade>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5">
                <div className="cursor-pointer">
                  <div
                    className={`${cardClass} p-4 w-full cursor-pointer`}
                    style={boxShadowStyle}
                    onClick={() =>
                      window.open(
                        "https://www.linkedin.com/in/atadurdyyevserdar",
                        "_blank",
                        "noopener,noreferrer"
                      )
                    }
                  >
                    <div className="flex flex-col gap-3">
                      <div className="w-12 h-12 bg-[#016699] rounded-lg flex items-center justify-center">
                        <svg
                          className="w-6 h-6 text-white"
                          fill="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
                        </svg>
                      </div>
                      <div className="">
                        <p className="text-xs sm:text-sm text-gray-900">
                          Let's connect on
                        </p>
                        <p className="text-sm sm:text-base font-semibold text-gray-900">LinkedIn</p>
                      </div>
                      <div>
                        <a
                          href="https://www.linkedin.com/in/atadurdyyevserdar"
                          className="text-xs text-gray-500 mt-1"
                        >
                          linkedin.com
                        </a>
                      </div>
                      {/* <button
                        onClick={(e) => { e.stopPropagation(); window.open("", "_blank", "noopener,noreferrer"); }}
                        className="cursor-pointer w-20 mt-2 px-4 py-2 rounded-md bg-[#016699] text-white text-xs font-semibold"
                      >
                        View
                      </button> */}
                    </div>
                  </div>
                </div>

                <div className="w-full">
                  <div
                    className={`${cardClass} p-4 w-full`}
                    style={boxShadowStyle}
                  >
                    <div
                      className="cursor-pointer flex flex-col gap-3"
                      onClick={() =>
                        window.open(
                          "https://www.instagram.com/atadurdyevserdar/",
                          "_blank",
                          "noopener,noreferrer"
                        )
                      }
                    >
                      <div className="w-12 h-12 bg-linear-to-br from-purple-600 via-pink-500 to-orange-500 rounded-lg flex items-center justify-center">
                        <svg
                          className="w-6 h-6 text-white"
                          fill="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
                        </svg>
                      </div>
                      <div>
                        <div>
                          <p className="text-xs sm:text-sm text-gray-900">Follow me on</p>
                          <p className="text-sm sm:text-base font-semibold text-gray-900">Instagram</p>
                        </div>
                      </div>
                      <div>
                        <a
                          href="https://www.instagram.com/atadurdyevserdar/"
                          className="text-xs text-gray-500 mt-1"
                        >
                          instagram.com
                        </a>
                      </div>

                      {/* <button
                        onClick={() =>
                          window.open(
                            "https://www.instagram.com/atadurdyevserdar/",
                            "_blank",
                            "noopener,noreferrer"
                          )
                        }
                        className="cursor-pointer w-20 mt-2 px-4 py-2 rounded-md bg-blue-500 text-white text-xs font-semibold"
                      >
                        Follow
                      </button> */}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <BlurFade delay={0.6} inView className="lg:col-span-2">
              <h2 className="text-2xl font-bold text-gray-900 tracking-tight mb-7 mt-3">
                Projects
              </h2>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {/* AI Summarizer Card */}
                <div className={`${cardClass} p-6`} style={boxShadowStyle}>
                  <div>
                    <p className="font-semibold text-gray-900 mb-2">
                      AI Summarizer
                    </p>
                    <p className="text-xs text-gray-500">
                      Summarization tool with AI-powered features.
                    </p>
                    <div className="mt-4 flex items-start gap-2">
                      <a
                        href="https://github.com/atadurdyyewserdar/ai-summarizer"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-block px-4 py-2 rounded-md bg-blue-500 text-xs font-semibold text-white"
                      >
                        View repo
                      </a>
                    </div>
                  </div>
                </div>

                {/* Corners Game Card */}
                <div className={`${cardClass} p-6`} style={boxShadowStyle}>
                  <div>
                    <p className="font-semibold text-gray-900 mb-2">
                      Corners Game
                    </p>
                    <p className="text-xs text-gray-500">
                      Interactive game built with modern web technologies.
                    </p>
                    <div className="mt-4 flex items-start gap-2">
                      <a
                        href="https://corners-game-liart.vercel.app/"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-block px-4 py-2 rounded-md bg-green-500 text-xs font-semibold text-white"
                      >
                        Live Demo
                      </a>
                    </div>
                  </div>
                </div>

                {/* Discord Bento Widget */}
                {/* Paste code here */}
              </div>
            </BlurFade>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BentoCard;
