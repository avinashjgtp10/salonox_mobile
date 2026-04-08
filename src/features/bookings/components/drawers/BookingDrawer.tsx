import { useState, useEffect } from "react";
import "../../styles/BookingDrawer.scss";

interface Props {
  open: boolean;
  onClose: () => void;
  selectedTime: string | null;
  selectedResource?: string | null;
  onSave: (event: any) => void;
  editingEvent?: any;
  onProceedToCheckout?: (event: any) => void;
}

const servicesData = [
  { name: "Classic Fill", duration: 60, price: 60 },
  { name: "Volume Fill", duration: 75, price: 85 },
  { name: "Brow Tint", duration: 15, price: 20 },
  { name: "Hybrid Fill", duration: 75, price: 95 },
  { name: "Haircut", duration: 45, price: 40 },
];

export default function BookingDrawer({
  open,
  onClose,
  selectedTime,
  selectedResource,
  onSave,
  editingEvent,
  onProceedToCheckout,
}: Props) {
  const [search, setSearch] = useState("");
  const [selectedServices, setSelectedServices] = useState<any[]>([]);
  const [showServiceList, setShowServiceList] = useState(true);

  const [clientName, setClientName] = useState("");
  const [clientMobile, setClientMobile] = useState("");
  const [errors, setErrors] = useState<any>({});

  useEffect(() => {
    if (open && !editingEvent?.id) {
      setSelectedServices([]);
      setShowServiceList(true);
      setClientName("");
      setClientMobile("");
      setSearch("");
      setErrors({});
    }
  }, [open, editingEvent]);

  useEffect(() => {
    if (editingEvent?.id) {
      setSelectedServices(editingEvent.extendedProps?.services || []);
      setClientName(editingEvent.extendedProps?.clientName || "");
      setClientMobile(editingEvent.extendedProps?.clientMobile || "");
      setShowServiceList(false);
    }
  }, [editingEvent]);

  const filtered = servicesData.filter((s) =>
    s.name.toLowerCase().includes(search.toLowerCase()),
  );

  const addService = (service: any) => {
    setSelectedServices((prev) => [...prev, service]);
    setShowServiceList(false);
  };

  const totalPrice = selectedServices.reduce((sum, s) => sum + s.price, 0);

  const totalDuration = selectedServices.reduce(
    (sum, s) => sum + s.duration,
    0,
  );

  const validate = () => {
    const newErrors: any = {};

    const nameRegex = /^[A-Za-z\s]+$/;
    const mobileRegex = /^[0-9]{10}$/;

    if (!clientName.trim()) {
      newErrors.clientName = "Client name is required";
    } else if (!nameRegex.test(clientName.trim())) {
      newErrors.clientName = "Only letters allowed";
    }

    if (!clientMobile.trim()) {
      newErrors.clientMobile = "Mobile number required";
    } else if (!mobileRegex.test(clientMobile.trim())) {
      newErrors.clientMobile = "Mobile must be 10 digits";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const buildEventData = () => {
    if (!selectedTime || selectedServices.length === 0) return null;

    const start = new Date(selectedTime);
    const end = new Date(start.getTime() + totalDuration * 60000);

    return {
      id: editingEvent?.id || Date.now().toString(),
      title: selectedServices[0]?.name || "Service",
      start: start.toISOString(),
      end: end.toISOString(),
      resourceId: editingEvent?.resourceId || selectedResource || "1",
      className: editingEvent?.className || "",
      extendedProps: {
        services: selectedServices,
        title: selectedServices[0]?.name || "Service",
        clientName: clientName,
        clientMobile: clientMobile,
        total: totalPrice,
        cancelled: editingEvent?.extendedProps?.cancelled || false,
      },
    };
  };

  const handleSave = () => {
    if (!validate()) return;
    if (!selectedTime || selectedServices.length === 0) return;

    const newEvent = buildEventData();
    if (!newEvent) return;

    onSave(newEvent);
    onClose();
  };

  const handleCancelBooking = () => {
    if (!editingEvent?.id) return;

    const cancelledEvent = {
      ...editingEvent,
      className: "cancelled-booking",
      resourceId: editingEvent.resourceId || "1",
      extendedProps: {
        ...editingEvent.extendedProps,
        cancelled: true,
      },
    };

    onSave(cancelledEvent);
    onClose();
  };

  const handleProceedToCheckout = () => {
    if (!validate()) return;
    if (!selectedTime || selectedServices.length === 0) return;

    const eventData = buildEventData();
    if (!eventData) return;

    onSave(eventData);
    onProceedToCheckout?.(eventData);
  };

  if (!open) return null;

  return (
    <>
      <div className="drawer-overlay" onClick={onClose} />

      <div className="booking-drawer">
        <div className="drawer-header">
          <h5 className="fw-semibold">
            {editingEvent?.id ? "Edit Booking" : "New Booking"}
          </h5>

          {selectedTime && (
            <small className="text-muted">
              {new Date(selectedTime).toLocaleString()}
            </small>
          )}
        </div>

        <div className="drawer-body">
          <input
            type="text"
            className="form-control mb-1"
            placeholder="Client name"
            value={clientName}
            onChange={(e) => setClientName(e.target.value)}
          />

          {errors.clientName && (
            <small className="text-danger mb-2 d-block">
              {errors.clientName}
            </small>
          )}

          <input
            type="tel"
            className="form-control mb-1"
            placeholder="Mobile number"
            value={clientMobile}
            onChange={(e) => setClientMobile(e.target.value.replace(/\D/g, ""))}
            maxLength={10}
          />

          {errors.clientMobile && (
            <small className="text-danger mb-3 d-block">
              {errors.clientMobile}
            </small>
          )}

          {showServiceList && (
            <>
              <input
                type="text"
                className="form-control mb-3"
                placeholder="Search service"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />

              {filtered.map((service, i) => (
                <div
                  key={i}
                  className="service-item"
                  onClick={() => addService(service)}
                >
                  <div>
                    <div className="fw-medium">{service.name}</div>
                    <small className="text-muted">{service.duration} min</small>
                  </div>

                  <div className="fw-semibold">₹{service.price}</div>
                </div>
              ))}
            </>
          )}

          {!showServiceList && (
            <>
              <h6 className="mb-3">Services</h6>

              {selectedServices.map((s, i) => (
                <div key={i} className="selected-service">
                  <div>
                    <div className="fw-medium">{s.name}</div>
                    <small className="text-muted">{s.duration} min</small>
                  </div>

                  <div className="fw-semibold">₹{s.price}</div>
                </div>
              ))}

              <button
                type="button"
                className="btn btn-outline-secondary btn-sm"
                onClick={() => setShowServiceList(true)}
              >
                + Add service
              </button>
            </>
          )}
        </div>

        {selectedServices.length > 0 && (
          <div className="drawer-footer">
            <div className="d-flex justify-content-between mb-3 fw-semibold">
              <span>Total</span>
              <span>₹{totalPrice}</span>
            </div>

            <button className="btn btn-dark w-100 mb-2" onClick={handleSave}>
              {editingEvent?.id ? "Update Booking" : "Save Booking"}
            </button>

            {editingEvent?.id && (
              <button
                className="btn btn-outline-danger w-100 mb-2"
                onClick={handleCancelBooking}
              >
                Cancel Booking
              </button>
            )}

            {editingEvent?.id && (
              <button
                className="btn btn-outline-dark w-100"
                onClick={handleProceedToCheckout}
              >
                Proceed to Checkout
              </button>
            )}
          </div>
        )}
      </div>
    </>
  );
}
