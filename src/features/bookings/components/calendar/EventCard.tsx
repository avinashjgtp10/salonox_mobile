import type { EventContentArg } from "@fullcalendar/core"

interface Props {
  arg: EventContentArg
}

export default function EventCard({ arg }: Props) {

  const event = arg.event

  const start = event.start
  const end = event.end

  const timeRange =
    start && end
      ? `${start.toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        })} – ${end.toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        })}`
      : ""

  const clientName =
    event.extendedProps?.clientName || "Walk-in"

  const services =
    event.extendedProps?.services || []

  const serviceNames = services
    .map((s: any) => s.name)
    .join(", ")

  const isPaid = event.extendedProps?.paid

  return (

    <div className="event-card card">

      <div className="card-body p-2">

        {/* Time */}
        <div className="event-time">
          {timeRange}
        </div>

        {/* Client */}
        <div className="event-client">
          {clientName}
        </div>

        {/* Services */}
        <div className="event-services">
          {serviceNames}
        </div>

        {/* Paid Status */}
        {isPaid && (
          <div className="event-paid">
            ✓ Paid
          </div>
        )}

      </div>

    </div>

  )
}