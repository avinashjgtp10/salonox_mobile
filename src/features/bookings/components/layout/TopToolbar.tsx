import { format } from "date-fns";
import "../../styles/TopToolbar.scss";

interface Staff {
  id: string;
  name: string;
  color?: string;
}

interface Props {
  currentDate?: Date;
  view: string;
  staffList: Staff[];
  onToday: () => void;
  onPrev: () => void;
  onNext: () => void;
  onChangeView: (view: string) => void;
  onAdd: () => void;
}

export default function TopToolbar({
  currentDate,
  view,
  staffList,
  onToday,
  onPrev,
  onNext,
  onChangeView,
  onAdd,
}: Props) {
  const safeDate = currentDate ? new Date(currentDate) : new Date();

  return (
    <div className="scheduler-toolbar d-flex align-items-center justify-content-between px-4">
      <div className="d-flex align-items-center gap-3">
        <button onClick={onToday} className="btn btn-outline-secondary btn-sm">
          Today
        </button>

        <div className="date-navigation d-flex align-items-center">
          <button
            onClick={onPrev}
            className="toolbar-nav-btn btn btn-outline-secondary btn-sm p-0"
          >
            ←
          </button>

          <span className="date-label">{format(safeDate, "EEE dd MMM")}</span>

          <button
            onClick={onNext}
            className="toolbar-nav-btn btn btn-outline-secondary btn-sm p-0"
          >
            →
          </button>
        </div>
      </div>

      <div className="d-flex align-items-center gap-3">
        {staffList.map((staff) => (
          <div
            key={staff.id}
            className="toolbar-staff-pill d-flex align-items-center gap-2"
          >
            <div
              className="toolbar-staff-avatar"
              style={{
                backgroundColor: staff.color || "#3b82f6",
                color: "#fff",
              }}
            >
              {staff.name.charAt(0).toUpperCase()}
            </div>

            <span className="toolbar-staff-name">{staff.name}</span>
          </div>
        ))}

        <button
          onClick={onAdd}
          className="btn btn-outline-secondary btn-sm d-flex align-items-center gap-1"
        >
          Add 👤
        </button>

        <select
          value={view}
          onChange={(e) => onChangeView(e.target.value)}
          className="form-select form-select-sm"
        >
          <option value="resourceTimeGridDay">Day</option>
          <option value="resourceTimeGridThreeDay">3 Days</option>
          <option value="resourceTimeGridFiveDay">5 Days</option>
          <option value="resourceTimeGridWeek">Week</option>
        </select>
      </div>
    </div>
  );
}
