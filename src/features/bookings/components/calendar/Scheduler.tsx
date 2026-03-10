import BookingDrawer from "../drawers/BookingDrawer"
import CheckoutDrawer from "../drawers/CheckoutDrawer"
import TipDrawer from "../drawers/TipDrawer"
import PaymentDrawer from "../drawers/PaymentDrawer"
import ReceiptDrawer from "../drawers/ReceiptDrawer"

import EventCard from "./EventCard"
import TopToolbar from "../layout/TopToolbar"

import FullCalendar from "@fullcalendar/react"
import resourceTimeGridPlugin from "@fullcalendar/resource-timegrid"
import interactionPlugin from "@fullcalendar/interaction"

import { useRef, useState } from "react"
import "../../styles/Scheduler.scss"

interface Staff {
  id: string
  name: string
  color: string
}

export default function Scheduler() {

  const calendarRef = useRef<any>(null)

  const [currentView, setCurrentView] = useState("resourceTimeGridDay")
  const [currentDate, setCurrentDate] = useState(new Date())

  const [drawerOpen, setDrawerOpen] = useState(false)
  const [checkoutOpen, setCheckoutOpen] = useState(false)
  const [tipOpen, setTipOpen] = useState(false)
  const [paymentOpen, setPaymentOpen] = useState(false)
  const [receiptOpen, setReceiptOpen] = useState(false)

  const [selectedTime, setSelectedTime] = useState<string | null>(null)
  const [selectedResource, setSelectedResource] = useState<string | null>(null)
  const [editingEvent, setEditingEvent] = useState<any>(null)

  const [events, setEvents] = useState<any[]>([])
  const [services, setServices] = useState<any[]>([])
  const [subtotal, setSubtotal] = useState(0)
  const [total, setTotal] = useState(0)
  const [paymentMethod, setPaymentMethod] = useState("")

  const [staffList, setStaffList] = useState<Staff[]>([
    { id: "1", name: "Daniel", color: "#3b82f6" }
  ])

  const [staffDrawerOpen, setStaffDrawerOpen] = useState(false)
  const [staffName, setStaffName] = useState("")
  const [staffColor, setStaffColor] = useState("#3b82f6")
  const [staffError, setStaffError] = useState("")

  const handleSaveStaff = () => {

    if (staffName.trim() === "") {
      setStaffError("Staff name is required")
      return
    }

    const isDuplicate = staffList.some(
      staff => staff.name.toLowerCase() === staffName.trim().toLowerCase()
    )

    if (isDuplicate) {
      setStaffError("Staff name already exists")
      return
    }

    const newStaff: Staff = {
      id: Date.now().toString(),
      name: staffName.trim(),
      color: staffColor
    }

    setStaffList(prev => [...prev, newStaff])

    setStaffName("")
    setStaffColor("#3b82f6")
    setStaffError("")
    setStaffDrawerOpen(false)
  }

  return (

    <div className="scheduler-page">

      {/* ================= TOOLBAR ================= */}

      <TopToolbar
        currentDate={currentDate}
        view={currentView}
        staffList={staffList}

        onToday={() => {
          const api = calendarRef.current?.getApi()
          api?.today()
          setCurrentDate(api?.getDate())
        }}

        onPrev={() => {
          const api = calendarRef.current?.getApi()
          api?.prev()
          setCurrentDate(api?.getDate())
        }}

        onNext={() => {
          const api = calendarRef.current?.getApi()
          api?.next()
          setCurrentDate(api?.getDate())
        }}

        onChangeView={(view: string) => {
          const api = calendarRef.current?.getApi()
          api?.changeView(view)
          setCurrentView(view)
        }}

        onAdd={() => setStaffDrawerOpen(true)}
      />

      {/* ================= CALENDAR ================= */}

      <div className="scheduler-calendar">

        <FullCalendar
          ref={calendarRef}
          plugins={[resourceTimeGridPlugin, interactionPlugin]}
          initialView="resourceTimeGridDay"
          headerToolbar={false}
          schedulerLicenseKey="CC-Attribution-NonCommercial-NoDerivatives"

          views={{
            resourceTimeGridThreeDay: {
              type: "resourceTimeGrid",
              duration: { days: 3 }
            },
            resourceTimeGridFiveDay: {
              type: "resourceTimeGrid",
              duration: { days: 5 }
            }
          }}

          resources={staffList.map(staff => ({
            id: staff.id,
            title: staff.name
          }))}


          selectable
          editable
          nowIndicator
          height="100%"
          slotMinTime="08:00:00"
          slotMaxTime="21:00:00"

          events={events}

          datesSet={(info) => {
            setCurrentDate(info.view.currentStart)
            setCurrentView(info.view.type)
          }}

          eventContent={(arg) => <EventCard arg={arg} />}

          eventClick={(info) => {

            const rawEvent = events.find(e => e.id === info.event.id)

            setEditingEvent(rawEvent)

            setSelectedTime(info.event.start?.toISOString() || null)
            setSelectedResource(info.event.getResources()[0]?.id || null)

            setDrawerOpen(true)

          }}

          select={(info) => {

            setEditingEvent(null)

            setSelectedTime(info.startStr)
            setSelectedResource(info.resource?.id || null)

            setDrawerOpen(true)

          }}
        />

      </div>

      {/* ================= BOOKING DRAWER ================= */}

      <BookingDrawer
        open={drawerOpen}
        selectedTime={selectedTime}
        selectedResource={selectedResource}
        editingEvent={editingEvent}

        onClose={() => {
          setDrawerOpen(false)
          setEditingEvent(null)
        }}

        onSave={(newEvent: any) => {

          if (editingEvent) {

            setEvents(prev =>
              prev.map(ev => ev.id === editingEvent.id ? newEvent : ev)
            )

          } else {

            setEvents(prev => [...prev, newEvent])

          }

          setDrawerOpen(false)

        }}

        onProceedToCheckout={(eventData: any) => {

          setServices(eventData.extendedProps?.services || [])

          setDrawerOpen(false)

          setCheckoutOpen(true)

        }}
      />

      {/* ================= CHECKOUT ================= */}

      <CheckoutDrawer
        open={checkoutOpen}
        services={services}

        onClose={() => setCheckoutOpen(false)}

        onCheckout={(value: number) => {

          setSubtotal(value)

          setCheckoutOpen(false)

          setTipOpen(true)

        }}
      />

      {/* ================= TIP ================= */}

      <TipDrawer
        open={tipOpen}
        subtotal={subtotal}

        onBack={() => {
          setTipOpen(false)
          setCheckoutOpen(true)
        }}

        onClose={() => setTipOpen(false)}

        onContinue={(value: number) => {

          setTotal(value)

          setTipOpen(false)

          setPaymentOpen(true)

        }}
      />

      {/* ================= PAYMENT ================= */}

      <PaymentDrawer
        open={paymentOpen}
        total={total}

        onClose={() => setPaymentOpen(false)}

        onSuccess={(method: string) => {

          setPaymentMethod(method)

          setPaymentOpen(false)

          setReceiptOpen(true)

        }}
      />

      {/* ================= RECEIPT ================= */}

      <ReceiptDrawer
        open={receiptOpen}
        services={services}
        total={total}
        clientName="Walk-in"
        clientMobile="N/A"
        paymentMethod={paymentMethod}

        onClose={() => setReceiptOpen(false)}
      />

      {/* ================= ADD STAFF DRAWER ================= */}

      {staffDrawerOpen && (

        <>

          <div
            className="drawer-overlay"
            onClick={() => setStaffDrawerOpen(false)}
          />

          <div className="staff-drawer">

            <div className="staff-drawer-header">
              <h4>Add Staff</h4>
            </div>

            <div className="staff-drawer-body">

              <label className="staff-label">Staff name</label>

              <input
                type="text"
                placeholder="Enter staff name"
                value={staffName}
                onChange={(e) => setStaffName(e.target.value)}
              />

              <br />

              <label className="staff-label">Color</label>

              <input
                type="color"
                value={staffColor}
                onChange={(e) => setStaffColor(e.target.value)}
              />

              {staffError && (
                <p className="text-danger">{staffError}</p>
              )}

            </div>

            <div className="staff-drawer-footer">

              <button
                className="btn btn-light"
                onClick={() => setStaffDrawerOpen(false)}
              >
                Cancel
              </button>

              <button
                className="btn btn-dark"
                onClick={handleSaveStaff}
              >
                Save Staff
              </button>

            </div>

          </div>

        </>

      )}

    </div>

  )
}