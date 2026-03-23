import "bootstrap/dist/css/bootstrap.min.css"
import { useNavigate } from "react-router-dom"
import { useState } from "react"
import { FiArrowLeft } from "react-icons/fi"
import { useOnboarding } from "../../../context/OnboardingContext"
import { salonApi } from "../../../services/api/salon.api"
import salonImg from "../../../assets/images/salon.jpg"

const options = [
  "Recommended by a friend",
  "Search engine (e.g. Google, Bing)",
  "Social media",
  "Advert in the mail",
  "Magazine ad",
  "Ratings website (e.g. Capterra, Trustpilot)",
  "AI Chatbot (e.g. ChatGPT, Gemini)",
  "Other",
]

export default function RecommendationSourcePage() {

  const navigate = useNavigate()
  const { data, reset } = useOnboarding()

  const [selected, setSelected] = useState("")
  const [otherText, setOtherText] = useState("")
  const [submitted, setSubmitted] = useState(false)
  const [loading, setLoading] = useState(false)
  const [apiError, setApiError] = useState("")

  const handleDone = async () => {
    setSubmitted(true)
    if (!selected) return
    if (selected === "Other" && otherText.trim() === "") return

    setLoading(true)
    setApiError("")

    try {
      // 🔍 DEBUG: Log decoded JWT to inspect user role
      const rawToken = localStorage.getItem("accessToken")
      if (rawToken) {
        try {
          const decoded = JSON.parse(atob(rawToken.split(".")[1]))
          console.log("🔍 Current JWT Payload (role check):", decoded)
        } catch (e) {
          console.warn("Could not decode JWT", e)
        }
      }

      // 1. Check if user already has a salon (created during registration)
      let salonId = ""
      try {
        const existing = await salonApi.getMySalon()
        if (existing?.data?.id) {
          salonId = existing.data.id
        }
      } catch (e) {
        // 404 or other error means no salon yet
      }

      const payload: any = {
        business_name: data.business_name,
        website_url: data.website_url || undefined,
        business_type: data.business_type || undefined,
        address: data.address || undefined,
        location_type: data.location_type || undefined,
        team_type: data.team_type || undefined,
        team_size: data.team_size || undefined,
        onboarding_completed: true,
      }

      if (salonId) {
        // Update existing salon
        await salonApi.update(salonId, payload)
      } else {
        // Create new salon
        await salonApi.create(payload)
      }

      reset()
      navigate("/setup-complete")

    } catch (err: any) {
      console.error("DEBUG: Onboarding completion failed", {
        status: err.response?.status,
        data: err.response?.data,
        message: err.message
      })
      // data.error can be an object {code, message} or a string
      const rawError = err.response?.data?.error
      const backendMessage =
        err.response?.data?.message ||
        (typeof rawError === "string" ? rawError : rawError?.message) ||
        err.message ||
        "Something went wrong. Please try again."
      setApiError(String(backendMessage))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="container-fluid p-0 position-relative">

      <div className="progress rounded-0" style={{ height: "4px" }}>
        <div className="progress-bar bg-dark" style={{ width: "100%" }} />
      </div>

      <div className="position-absolute top-0 end-0 p-4 d-flex gap-3 z-3">
        <button
          className="btn btn-outline-secondary rounded-pill"
          onClick={() => navigate(-1)}
        >
          Back
        </button>
        <button
          className="btn btn-dark rounded-pill"
          disabled={
            loading ||
            !selected ||
            (selected === "Other" && otherText.trim() === "")
          }
          onClick={handleDone}
        >
          {loading ? (
            <>
              <span className="spinner-border spinner-border-sm me-2" />
              Saving...
            </>
          ) : "Done"}
        </button>
      </div>

      <div className="row g-0 min-vh-100">
        <div className="col-lg-5 col-12 bg-white p-5">

          <button
            className="btn btn-light border rounded-circle mb-4"
            onClick={() => navigate(-1)}
          >
            <FiArrowLeft />
          </button>

          <div style={{ maxWidth: "420px" }}>
            <p className="text-muted small">Account setup</p>
            <h4 className="fw-bold mb-4">How did you hear about us?</h4>

            {apiError && (
              <div className="alert alert-danger">{apiError}</div>
            )}

            {options.map((item, index) => (
              <button
                key={index}
                className={`btn w-100 text-start rounded-pill mb-3 ${selected === item
                  ? "border-2 border-primary bg-white"
                  : "border bg-light"
                  }`}
                onClick={() => { setSelected(item); setSubmitted(false) }}
              >
                {item}
              </button>
            ))}

            {selected === "Other" && (
              <div className="mt-3">
                <div className="d-flex justify-content-between mb-1">
                  <label className="form-label">Please specify</label>
                  <small>{otherText.length}/255</small>
                </div>
                <input
                  type="text"
                  maxLength={255}
                  value={otherText}
                  onChange={(e) => setOtherText(e.target.value)}
                  className={`form-control ${submitted && otherText.trim() === "" ? "is-invalid" : ""
                    }`}
                />
                {submitted && otherText.trim() === "" && (
                  <div className="invalid-feedback d-block">This field is required</div>
                )}
              </div>
            )}

          </div>
        </div>

        <div className="col-lg-7 d-none d-lg-block p-0" style={{ minHeight: "100vh" }} >
          <img
            src={salonImg}
            alt="salon"
            className="w-100 h-100 object-fit-cover position-absolute top-0 start-0"
            style={{ zIndex: 0 }}
          />
        </div>
      </div>
    </div>
  )
}