import "bootstrap/dist/css/bootstrap.min.css";
import "leaflet/dist/leaflet.css";
import { useNavigate } from "react-router-dom";
import { useState, useEffect, useRef } from "react";
import AutoNavigateIndicator from "../components/AutoNavigateIndicator";
import { MapContainer, TileLayer, Marker, useMap } from "react-leaflet";
import L from "leaflet";
import { FiArrowLeft, FiArrowRight } from "react-icons/fi";
import { HiOutlineLocationMarker } from "react-icons/hi";
import "../styles/VenueLocationPage.scss";
import { useOnboarding } from "../../../context/OnboardingContext";

// Fix default marker icon broken by vite
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl:
    "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl:
    "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

function FlyTo({ coords }: { coords: [number, number] | null }) {
  const map = useMap();
  useEffect(() => {
    if (coords) map.flyTo(coords, 15, { duration: 1.2 });
  }, [coords, map]);
  return null;
}

export default function VenueLocationPage() {
  const navigate = useNavigate();
  const { update } = useOnboarding();

  const [address, setAddress] = useState("");
  const [loading, setLoading] = useState(false);
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [noResults, setNoResults] = useState(false);
  const [coords, setCoords] = useState<[number, number] | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);

    if (address.length > 2) {
      setNoResults(false);
      debounceRef.current = setTimeout(async () => {
        try {
          // Photon API — great POI/business autocomplete, India-biased
          const res = await fetch(
            `https://photon.komoot.io/api/?q=${encodeURIComponent(address)}&limit=7&lang=en&lat=20.5937&lon=78.9629`,
          );
          const data = await res.json();

          const mapped = (data.features ?? []).map((f: any) => {
            const p = f.properties;
            const parts = [
              p.name,
              p.street,
              p.housenumber,
              p.city,
              p.state,
              p.country,
            ].filter(Boolean);
            return {
              display_name: parts.join(", "),
              lat: f.geometry.coordinates[1],
              lon: f.geometry.coordinates[0],
            };
          });

          setSuggestions(mapped);
          setNoResults(mapped.length === 0);
        } catch {
          setSuggestions([]);
        }
      }, 400);
    } else {
      setSuggestions([]);
      setNoResults(false);
    }

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [address]);

  const [navigating, setNavigating] = useState(false);

  const doNavigate = (addr: string) => {
    update({ address: addr.trim() });
    setNavigating(true);
    setTimeout(() => navigate("/previous-software"), 600);
  };

  const selectSuggestion = (item: {
    display_name: string;
    lat: number;
    lon: number;
  }) => {
    setAddress(item.display_name);
    setCoords([item.lat, item.lon]);
    setSuggestions([]);
    setNoResults(false);

    doNavigate(item.display_name);
  };

  const handleGetLocation = () => {
    if (!navigator.geolocation) {
      alert("Geolocation not supported");
      return;
    }
    setLoading(true);
    navigator.geolocation.getCurrentPosition(
      async ({ coords: c }) => {
        try {
          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${c.latitude}&lon=${c.longitude}`,
            { headers: { "Accept-Language": "en" } },
          );
          const data = await res.json();
          if (data.display_name) {
            setAddress(data.display_name);
            setCoords([c.latitude, c.longitude]);
            setSuggestions([]);
        
            doNavigate(data.display_name);
          }
        } catch {
          alert("Could not fetch address. Please type your location manually.");
        }
        setLoading(false);
      },
      () => {
        alert("Please allow location permission");
        setLoading(false);
      },
    );
  };

  const defaultCenter: [number, number] = [20.5937, 78.9629];

  return (
    <div className="container-fluid p-0 venue-page position-relative h-100">
      <div className="row g-0" style={{ minHeight: "calc(100vh - 64px)" }}>
        {/* LEFT PANEL */}
        <div className="col-lg-5 col-12 bg-white p-5 position-relative d-flex flex-column">
          <button
            className="btn btn-light border rounded-circle position-absolute d-flex align-items-center justify-content-center"
            style={{ top: "30px", left: "50px", width: "42px", height: "42px", zIndex: 10 }}
            onClick={() => navigate(-1)}
          >
            <FiArrowLeft />
          </button>



          <div className="mt-5 pt-3" style={{ maxWidth: "420px" }}>
            <h3 className="fw-bold mb-3">Set your venue's physical location</h3>
            <p className="text-muted mb-4">
              Add your primary business location so your clients can easily find
              you.
            </p>

            <div className="d-flex gap-2 align-items-center">
              <div className="position-relative flex-grow-1">
                <HiOutlineLocationMarker
                  className="position-absolute top-50 start-0 translate-middle-y ms-3 text-muted"
                  style={{ cursor: "pointer", zIndex: 2 }}
                  onClick={handleGetLocation}
                />
                <input
                  type="text"
                  className="form-control ps-5 pe-3"
                  placeholder="Search location (e.g., Lakme Academy Baramati)"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  disabled={navigating}
                />
              </div>
              <button
                className="btn btn-dark d-flex align-items-center justify-content-center rounded-circle shadow-sm"
                style={{ width: "40px", height: "40px", flexShrink: 0 }}
                disabled={!address.trim() || navigating}
                onClick={() => doNavigate(address)}
              >
                <FiArrowRight size={18} />
              </button>
            </div>

            <AutoNavigateIndicator visible={navigating} className="mt-2" />
            <div className="position-relative">
              {suggestions.length > 0 && (
                <ul
                  className="list-group position-absolute w-100 mt-1 suggestion-box"
                  style={{ zIndex: 1050 }}
                >
                  {suggestions.map((item, i) => (
                    <li
                      key={i}
                      className="list-group-item list-group-item-action small py-2"
                      style={{ cursor: "pointer" }}
                      onClick={() => selectSuggestion(item)}
                    >
                      {item.display_name}
                    </li>
                  ))}
                </ul>
              )}

              {noResults && (
                <div className="mt-2">
                  <small className="text-muted">
                    No results found. Try a nearby area or type your address
                    manually.
                  </small>
                </div>
              )}
            </div>

            {loading && (
              <small className="text-muted d-block mt-2">
                Fetching live location...
              </small>
            )}
          </div>
        </div>

        {/* RIGHT PANEL — full interactive map */}
        <div
          className="col-lg-7 d-none d-lg-block position-relative p-0"
          style={{ minHeight: "100vh" }}
        >
          <MapContainer
            center={coords ?? defaultCenter}
            zoom={coords ? 15 : 5}
            style={{ height: "100vh", width: "100%" }}
            zoomControl={true}
            scrollWheelZoom={true}
          >
            <TileLayer
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            />
            {coords && <Marker position={coords} />}
            <FlyTo coords={coords} />
          </MapContainer>


        </div>
      </div>
    </div>
  );
}
