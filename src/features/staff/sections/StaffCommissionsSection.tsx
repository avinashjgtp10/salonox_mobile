import React, { useState } from "react";
import { Clipboard, Tag } from "react-bootstrap-icons";
import "../styles/StaffCommissionsSection.scss";

const StaffCommissionsSection: React.FC = () => {
  const [servicesEnabled, setServicesEnabled] = useState(true);
  const [productsEnabled, setProductsEnabled] = useState(false);
  const [membershipsEnabled, setMembershipsEnabled] = useState(false);
  const [giftCardsEnabled, setGiftCardsEnabled] = useState(true);
  const [cancellationEnabled, setCancellationEnabled] = useState(true);
  const [lateCancel, setLateCancel] = useState(false);
  const [noShow, setNoShow] = useState(false);

  const [calcType, setCalcType] = useState("default");
  const [giftCalcType, setGiftCalcType] = useState("default");

  return (
    <div className="section commissions-section mt-1">
      {/* Services Commission */}
      <div className="custom-switch-container">
        <div className="switch-info">
          <div className="switch-title">
            Services commission
            {servicesEnabled ? (
              <span className="badge-status on">On</span>
            ) : (
              <span className="badge-status off">Off</span>
            )}
          </div>
          <div className="switch-desc">
            Commission earned on services provided. <a href="#">Learn more</a>
          </div>
        </div>
        <div className="form-check form-switch custom-switch">
          <input
            className="form-check-input"
            type="checkbox"
            role="switch"
            checked={servicesEnabled}
            onChange={(e) => setServicesEnabled(e.target.checked)}
          />
        </div>
      </div>

      {servicesEnabled && (
        <div className="fade-in mb-4 pb-2">
          <div className="row g-3">
            <div className="col-12 col-md-6">
              <label className="control-label">Default commission type</label>
              <select className="form-select">
                <option>Fixed rate</option>
                <option>Percentage</option>
              </select>
            </div>
            <div className="col-12 col-md-6">
              <label className="control-label">Default rate</label>
              <div className="input-group">
                <span className="input-group-text px-3 bg-white border-end-0">
                  %
                </span>
                <input
                  type="number"
                  className="form-control border-start-0 ps-0"
                  placeholder="0"
                />
                <span className="input-group-text bg-white">
                  <Tag size={14} color="#6b7280" />
                </span>
              </div>
            </div>
          </div>

          <h6 className="sub-header mt-4 pt-1">
            Customize commissions by service
          </h6>
          <div className="customize-box">
            <div className="customize-info">
              <Clipboard />
              <span>2 services on default rate</span>
            </div>
            <a className="customize-btn">Edit</a>
          </div>

          <h6 className="sub-header mt-4 pt-1">Calculations</h6>
          <p className="calc-desc">
            Customize deductions for this team member.{" "}
            <a href="#">Learn more</a>
          </p>

          <div className="custom-radio" onClick={() => setCalcType("default")}>
            <div
              className={`radio-circle ${calcType === "default" ? "active" : ""}`}
            ></div>
            <div className="radio-content">
              <div className="radio-title">Default settings</div>
              <div className="radio-subtitle">
                Use your workspace commission settings
              </div>
            </div>
          </div>

          <div className="custom-radio" onClick={() => setCalcType("custom")}>
            <div
              className={`radio-circle ${calcType === "custom" ? "active" : ""}`}
            ></div>
            <div className="radio-content">
              <div className="radio-title" style={{ fontWeight: 400 }}>
                Custom settings
              </div>
              <div className="radio-subtitle">
                Choose custom settings for this team member
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="divider"></div>

      {/* Products Commission */}
      <div className="custom-switch-container mb-0">
        <div className="switch-info">
          <div className="switch-title">
            Products commission
            {productsEnabled ? (
              <span className="badge-status on">On</span>
            ) : (
              <span className="badge-status off">Off</span>
            )}
          </div>
          <div className="switch-desc">
            Commission earned on products sold. <a href="#">Learn more</a>
          </div>
        </div>
        <div className="form-check form-switch custom-switch">
          <input
            className="form-check-input"
            type="checkbox"
            role="switch"
            checked={productsEnabled}
            onChange={(e) => setProductsEnabled(e.target.checked)}
          />
        </div>
      </div>

      <div className="divider"></div>

      {/* Memberships Commission */}
      <div className="custom-switch-container mb-0">
        <div className="switch-info">
          <div className="switch-title">
            Memberships commission
            {membershipsEnabled ? (
              <span className="badge-status on">On</span>
            ) : (
              <span className="badge-status off">Off</span>
            )}
          </div>
          <div className="switch-desc">
            Commission earned on memberships sold. <a href="#">Learn more</a>
          </div>
        </div>
        <div className="form-check form-switch custom-switch">
          <input
            className="form-check-input"
            type="checkbox"
            role="switch"
            checked={membershipsEnabled}
            onChange={(e) => setMembershipsEnabled(e.target.checked)}
          />
        </div>
      </div>

      <div className="divider"></div>

      {/* Gift Cards Commission */}
      <div className="custom-switch-container mb-0">
        <div className="switch-info">
          <div className="switch-title">
            Gift cards commission
            {giftCardsEnabled ? (
              <span className="badge-status on">On</span>
            ) : (
              <span className="badge-status off">Off</span>
            )}
          </div>
          <div className="switch-desc">
            Commission earned on gift cards sold. <a href="#">Learn more</a>
          </div>
        </div>
        <div className="form-check form-switch custom-switch">
          <input
            className="form-check-input"
            type="checkbox"
            role="switch"
            checked={giftCardsEnabled}
            onChange={(e) => setGiftCardsEnabled(e.target.checked)}
          />
        </div>
      </div>

      {giftCardsEnabled && (
        <div className="fade-in mb-4 pb-2 mt-3">
          <div className="row g-3">
            <div className="col-12 col-md-6">
              <label className="control-label">Default commission type</label>
              <select className="form-select">
                <option>Fixed rate</option>
                <option>Percentage</option>
              </select>
            </div>
            <div className="col-12 col-md-6">
              <label className="control-label">Default rate</label>
              <div className="input-group">
                <span className="input-group-text px-3 bg-white border-end-0">
                  %
                </span>
                <input
                  type="number"
                  className="form-control border-start-0 ps-0"
                  placeholder="0"
                />
                <span className="input-group-text bg-white">
                  <Tag size={14} color="#6b7280" />
                </span>
              </div>
            </div>
          </div>

          <h6 className="sub-header mt-4 pt-1">Calculations</h6>
          <p className="calc-desc">
            Customize deductions for this team member.{" "}
            <a href="#">Learn more</a>
          </p>

          <div
            className="custom-radio"
            onClick={() => setGiftCalcType("default")}
          >
            <div
              className={`radio-circle ${giftCalcType === "default" ? "active" : ""}`}
            ></div>
            <div className="radio-content">
              <div className="radio-title">Default settings</div>
              <div className="radio-subtitle">
                Use your workspace commission settings
              </div>
            </div>
          </div>

          <div
            className="custom-radio"
            onClick={() => setGiftCalcType("custom")}
          >
            <div
              className={`radio-circle ${giftCalcType === "custom" ? "active" : ""}`}
            ></div>
            <div className="radio-content">
              <div className="radio-title" style={{ fontWeight: 400 }}>
                Custom settings
              </div>
              <div className="radio-subtitle">
                Choose custom settings for this team member
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="divider"></div>

      {/* Cancellation Commission */}
      <div className="custom-switch-container mb-0">
        <div className="switch-info">
          <div className="switch-title">
            Cancellation commission
            {cancellationEnabled ? (
              <span className="badge-status on">On</span>
            ) : (
              <span className="badge-status off">Off</span>
            )}
          </div>
          <div className="switch-desc">
            Commission earned on fees for no-shows and late cancellations.{" "}
            <a href="#">Learn more</a>
          </div>
        </div>
        <div className="form-check form-switch custom-switch">
          <input
            className="form-check-input"
            type="checkbox"
            role="switch"
            checked={cancellationEnabled}
            onChange={(e) => setCancellationEnabled(e.target.checked)}
          />
        </div>
      </div>

      {cancellationEnabled && (
        <div className="fade-in mb-4 pb-2 mt-3">
          {/* Late Cancellations */}
          <div className="d-flex align-items-flex-start gap-3 mb-3">
            <input
              type="checkbox"
              id="late-cancel"
              style={{
                width: 16,
                height: 16,
                marginTop: 3,
                cursor: "pointer",
                accentColor: "#6c3ce1",
              }}
              checked={lateCancel}
              onChange={(e) => setLateCancel(e.target.checked)}
            />
            <div>
              <label
                htmlFor="late-cancel"
                style={{
                  fontSize: 14,
                  fontWeight: 500,
                  color: "#111827",
                  cursor: "pointer",
                  display: "block",
                  marginBottom: 2,
                }}
              >
                Pass on the cancellation fee for late cancellations
              </label>
              <span style={{ fontSize: 12, color: "#6b7280" }}>
                When the client cancels late, the team member earns a portion of
                the cancellation fee
              </span>
            </div>
          </div>

          {/* No Shows */}
          <div className="d-flex align-items-flex-start gap-3">
            <input
              type="checkbox"
              id="no-show"
              style={{
                width: 16,
                height: 16,
                marginTop: 3,
                cursor: "pointer",
                accentColor: "#6c3ce1",
              }}
              checked={noShow}
              onChange={(e) => setNoShow(e.target.checked)}
            />
            <div>
              <label
                htmlFor="no-show"
                style={{
                  fontSize: 14,
                  fontWeight: 500,
                  color: "#111827",
                  cursor: "pointer",
                  display: "block",
                  marginBottom: 2,
                }}
              >
                Pass on the cancellation fee for no-shows
              </label>
              <span style={{ fontSize: 12, color: "#6b7280" }}>
                When the client is a no-show, the team member earns a portion of
                the fee
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default StaffCommissionsSection;
