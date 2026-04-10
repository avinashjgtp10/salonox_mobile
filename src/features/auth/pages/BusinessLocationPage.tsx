import { useNavigate } from "react-router-dom";
import { useState } from "react";
import { FiArrowLeft, FiArrowRight, FiCheck } from "react-icons/fi";
import "../styles/BusinessLocationPage.scss";
import { useOnboarding } from "../../../context/OnboardingContext";
import salonImg from "../../../assets/images/salon.jpg";

type LocationType = "physical" | "mobile" | "virtual";

const options: { id: LocationType; label: string }[] = [
  { id: "physical", label: "Clients come to me at a physical location" },
  { id: "mobile", label: "I visit my clients as a mobile operator" },
  { id: "virtual", label: "I provide virtual services online" },
];

export default function BusinessLocationPage() {
  const navigate = useNavigate();
  const { update } = useOnboarding();
  const [selected, setSelected] = useState<LocationType | null>(null);

  const handleContinue = () => {
    if (!selected) return;
    update({ location_type: selected });

    if (selected === "physical") navigate("/venue-location");
    else navigate("/previous-software");
  };

  return (
    <div className="container-fluid p-0">
      <div className="progress" style={{ height: "5px" }}>
        <div className="progress-bar bg-dark" style={{ width: "80%" }} />
      </div>

      <div className="row g-0 min-vh-100">
        <div className="col-lg-5 col-md-6 bg-light p-5 position-relative">
          <button
            className="btn btn-light border rounded-circle position-absolute d-md-flex align-items-center justify-content-center"
            style={{ top: "30px", left: "50px", width: "40px", height: "40px", padding: 0, zIndex: 10 }}
            onClick={() => navigate(-1)}
          >
            <FiArrowLeft />
          </button>
          <div style={{ maxWidth: "480px" }} className="mt-5">
            <p className="text-muted small">Account setup</p>
            <h4 className="fw-bold mb-4">
              Where do you provide your services?
            </h4>

            <div className="d-grid gap-3">
              {options.map((item) => (
                <div
                  key={item.id}
                  className={`card p-3 position-relative ${
                    selected === item.id ? "border-primary shadow-sm" : ""
                  }`}
                  style={{ cursor: "pointer" }}
                  onClick={() => setSelected(item.id)}
                >
                  <p className="mb-0 fw-medium">{item.label}</p>
                  {selected === item.id && (
                    <FiCheck
                      className="position-absolute text-primary"
                      style={{
                        right: "20px",
                        top: "50%",
                        transform: "translateY(-50%)",
                      }}
                    />
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

        <div
          className="col-lg-7 d-none d-md-block position-relative p-0"
          style={{ minHeight: "100vh" }}
        >
          <img
            src={salonImg}
            alt="salon"
            className="w-100 h-100 object-fit-cover position-absolute top-0 start-0"
            style={{ zIndex: 0 }}
          />

          {/* Desktop Continue Button on Image */}
          <div className="position-absolute top-0 end-0 p-4 z-3 d-none d-lg-block">
            <button
              className="btn btn-dark rounded-pill px-4"
              disabled={!selected}
              onClick={handleContinue}
            >
              Continue <FiArrowRight size={16} className="ms-1" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
