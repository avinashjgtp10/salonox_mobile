import Drawer from "../ui/Drawer"
import "../../styles/AppointmentDrawer.scss"

interface Props {
  open: boolean
  onClose: () => void
  startTime: string | null
}

export default function AppointmentDrawer({
  open,
  onClose,
  startTime,
}: Props) {

  return (

    <Drawer open={open} onClose={onClose}>

      <div className="appointment-drawer-body">

        <h5 className="fw-semibold mb-4">
          New Booking
        </h5>

        <div className="mb-4">

          <label className="form-label small text-muted">
            Start Time
          </label>

          <div className="start-time-box">

            {startTime || "Not selected"}

          </div>

        </div>

        <button className="btn btn-dark w-100">

          Save Booking

        </button>

      </div>

    </Drawer>

  )
}