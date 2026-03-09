import { useState } from "react"
import "bootstrap/dist/css/bootstrap.min.css"
import {
  Calendar3,
  ChevronDown,
  Search,
  Sliders
} from "react-bootstrap-icons"
import { DateRange } from "react-date-range"
import { subDays, format } from "date-fns"
import "react-date-range/dist/styles.css"
import "react-date-range/dist/theme/default.css"
import "../styles/AppointmentsPage.scss"

type Appointment = {
  id: string
  service: string
  client: string
  date: string
  duration: string
  price: number
  status: "Booked" | "Completed" | "Cancelled"
}

export default function AppointmentsPage() {

const [appointments] = useState<Appointment[]>([])
  const [showPicker, setShowPicker] = useState(false)
  const [showList, setShowList] = useState(false)
  const [selectedLabel, setSelectedLabel] = useState("Month to date")

  const today = new Date()

  const [range, setRange] = useState([
    {
      startDate: new Date(today.getFullYear(), today.getMonth(), 1),
      endDate: today,
      key: "selection"
    }
  ])

  const handlePreset = (label: string) => {
    setSelectedLabel(label)
    setShowList(false)

    switch (label) {
      case "Today":
        setRange([{ startDate: today, endDate: today, key: "selection" }])
        break

      case "Yesterday":
        const yesterday = subDays(today, 1)
        setRange([{ startDate: yesterday, endDate: yesterday, key: "selection" }])
        break

      case "Last 7 days":
        setRange([{ startDate: subDays(today, 6), endDate: today, key: "selection" }])
        break

      case "Last 30 days":
        setRange([{ startDate: subDays(today, 29), endDate: today, key: "selection" }])
        break

      case "Month to date":
        setRange([
          {
            startDate: new Date(today.getFullYear(), today.getMonth(), 1),
            endDate: today,
            key: "selection"
          }
        ])
        break

      default:
        break
    }
  }

  const handleApply = () => {
    const formatted = `${format(range[0].startDate, "dd MMM")} – ${format(
      range[0].endDate,
      "dd MMM"
    )}`
    setSelectedLabel(formatted)
    setShowPicker(false)
  }

  return (
    <div className="appointments-page container-fluid py-4 position-relative">

      {/* ================= HEADER ================= */}
      <div className="appointments-header d-flex justify-content-between align-items-center mb-4">
        <div>
          <h2>Appointments</h2>
          <p>View, filter and export appointments booked by your clients.</p>
        </div>

        <button className="btn btn-outline-secondary d-flex align-items-center gap-2">
          Export <ChevronDown size={14} />
        </button>
      </div>

      {/* ================= TOOLBAR ================= */}
      <div className="appointments-toolbar d-flex justify-content-between align-items-center flex-wrap gap-2 mb-3">

        <div className="d-flex gap-2 flex-wrap position-relative">

          {/* Search */}
          <div className="input-group" style={{ width: "280px" }}>
            <span className="input-group-text bg-white">
              <Search size={16} />
            </span>
            <input
              type="text"
              className="form-control"
              placeholder="Search by Reference or Client"
            />
          </div>

          {/* Date Button */}
          <button
            className="btn btn-outline-secondary d-flex align-items-center gap-2"
            onClick={() => setShowPicker(!showPicker)}
          >
            <Calendar3 size={16} />
            {selectedLabel}
            <ChevronDown size={14} />
          </button>

          {/* Date Popup */}
          {showPicker && (
            <div className="fresha-calendar-popup shadow">

              {/* Presets */}
              <div className="p-3 border-bottom position-relative">
                <div
                  className="custom-select-box"
                  onClick={() => setShowList(!showList)}
                >
                  {selectedLabel}
                </div>

                {showList && (
                  <div className="custom-dropdown">
                    {[
                      "Today",
                      "Yesterday",
                      "Last 7 days",
                      "Last 30 days",
                      "Month to date"
                    ].map((item) => (
                      <div
                        key={item}
                        className="dropdown-item-custom"
                        onClick={() => handlePreset(item)}
                      >
                        {item}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Calendar */}
              <div className="p-3">

                <div className="d-flex gap-3 mb-3">
                  <input
                    className="form-control"
                    value={format(range[0].startDate, "yyyy-MM-dd")}
                    readOnly
                  />
                  <input
                    className="form-control"
                    value={format(range[0].endDate, "yyyy-MM-dd")}
                    readOnly
                  />
                </div>

                <DateRange
                  ranges={range}
                  onChange={(item: any) => setRange([item.selection])}
                  months={2}
                  direction="horizontal"
                  moveRangeOnFirstSelection={false}
                />
              </div>

              {/* Footer */}
              <div className="d-flex justify-content-end gap-3 p-3 border-top">
                <button
                  className="btn btn-light"
                  onClick={() => setShowPicker(false)}
                >
                  Cancel
                </button>

                <button
                  className="btn btn-dark px-4"
                  onClick={handleApply}
                >
                  Apply
                </button>
              </div>

            </div>
          )}

          {/* Filters */}
          <button className="btn btn-outline-secondary d-flex align-items-center gap-2">
            <Sliders size={16} />
            Filters
          </button>

        </div>

      </div>

      {/* ================= TABLE ================= */}
      <div className="card appointments-card shadow-sm">
        <div className="card-body p-0">

          <div className="table-responsive">
            <table className="table table-hover mb-0 appointments-table">
              <thead className="table-light">
                <tr>
                  <th>Ref #</th>
                  <th>Service</th>
                  <th>Client</th>
                  <th>Scheduled Date</th>
                  <th>Duration</th>
                  <th>Price</th>
                  <th>Status</th>
                </tr>
              </thead>

              <tbody>
                {appointments.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="text-center no-appointments">
                      No appointments found
                    </td>
                  </tr>
                ) : (
                  appointments.map((item) => (
                    <tr key={item.id}>
                      <td>{item.id}</td>
                      <td>{item.service}</td>
                      <td>{item.client}</td>
                      <td>{item.date}</td>
                      <td>{item.duration}</td>
                      <td>₹{item.price}</td>
                      <td>{item.status}</td>
                    </tr>
                  ))
                )}
              </tbody>

            </table>
          </div>

        </div>
      </div>

    </div>
  )
}