import { useState, useEffect } from "react"
import { Home, Briefcase, MoreHorizontal, Check, MapPin } from "lucide-react"
import "../styles/NewAddressModal.scss"

interface Props {
  open: boolean
  onClose: () => void
}

export default function NewAddressModal({ open, onClose }: Props) {

  const [type, setType] = useState("home")
  const [addressValue, setAddressValue] = useState("")
  const [attemptedSubmit, setAttemptedSubmit] = useState(false)

  // Reset state when modal opens/closes
  useEffect(() => {
    if (open) {
      setAddressValue("")
      setAttemptedSubmit(false)
      setType("home")
    }
  }, [open])

  const isAddressInvalid = attemptedSubmit && addressValue.trim() === ""

  const handleContinue = () => {
    setAttemptedSubmit(true)
    if (addressValue.trim() === "") {
      return
    }
    // Proceed
    console.log("Saving new address:", addressValue)
    onClose()
  }

  if (!open) return null

  return (

    <div className="address-overlay">

      <div className="address-modal">

        {/* HEADER */}
        <div className="modal-header">

          <h3>New address</h3>

          <button
            className="close-btn"
            onClick={onClose}
          >
            ✕
          </button>

        </div>


        {/* BODY */}
        <div className="modal-body">

          {/* ADDRESS TYPE */}
          <div className="address-types">

            <button
              className={type === "home" ? "active" : ""}
              onClick={() => setType("home")}
            >
              <Home size={20} />
              <span>Home</span>
              {type === "home" && <Check className="check-icon" size={16} />}
            </button>


            <button
              className={type === "work" ? "active" : ""}
              onClick={() => setType("work")}
            >
              <Briefcase size={20} />
              <span>Work</span>
              {type === "work" && <Check className="check-icon" size={16} />}
            </button>


            <button
              className={type === "other" ? "active" : ""}
              onClick={() => setType("other")}
            >
              <MoreHorizontal size={20} />
              <span>Other</span>
              {type === "other" && <Check className="check-icon" size={16} />}
            </button>

          </div>


          {/* FORM */}

          <div className="form-group">
            <label>Address name</label>
            <input placeholder="Home" />
          </div>


          <div className="form-group">
            <label>Address</label>
            <div className="input-with-icon">
              <MapPin size={16} className="input-icon" />
              <input
                placeholder="Enter address"
                value={addressValue}
                onChange={(e) => setAddressValue(e.target.value)}
                className={isAddressInvalid ? "is-invalid" : ""}
              />
            </div>
            {isAddressInvalid && (
              <span className="invalid-feedback-modal">Please add a valid address</span>
            )}
          </div>


          <div className="form-group">
            <label>Apt / Suite</label>
            <input placeholder="Apartment / Suite" />
          </div>


          <div className="form-group">
            <label>District</label>
            <input placeholder="District" />
          </div>


          <div className="form-group">
            <label>City</label>
            <input placeholder="City" />
          </div>


          <div className="form-group">
            <label>Postal code</label>
            <input placeholder="Postal code" />
          </div>

        </div>


        {/* FOOTER */}
        <div className="modal-footer">

          <button
            className="cancel-btn"
            onClick={onClose}
          >
            Cancel
          </button>

          <button className="continue-btn" onClick={handleContinue}>
            Continue
          </button>

        </div>

      </div>

    </div>

  )
}