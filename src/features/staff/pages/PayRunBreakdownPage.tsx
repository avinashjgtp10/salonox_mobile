import React, { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
    ChevronLeft,
    ThreeDotsVertical
} from "react-bootstrap-icons";
import "../styles/PayRunsPage.scss";
import AddAdjustmentModal from "../components/AddAdjustmentModal";

const PayRunBreakdownPage: React.FC = () => {
    const navigate = useNavigate();
    const { memberId } = useParams();
    const [activeTab, setActiveTab] = useState("Overview");
    const [showAddAdjustment, setShowAddAdjustment] = useState(false);

    console.log("Viewing breakdown for:", memberId);

    return (
        <div className="pr-breakdown-page">
            <div className="pr-breakdown-modal__header">
                <button className="pr-breakdown-modal__close" onClick={() => navigate("/dashboard/team/payruns")}>
                    <ChevronLeft size={20} />
                </button>
                <div className="pr-breakdown-modal__actions">
                    <button className="pr-breakdown-modal__more"><ThreeDotsVertical /></button>
                    <button
                        className="pr-page__btn pr-page__btn--white"
                        onClick={() => setShowAddAdjustment(true)}
                    >
                        Add adjustment
                    </button>
                </div>
            </div>

            <div className="pr-breakdown-modal__body">
                <h2>Breakdown</h2>

                <div className="pr-breakdown-modal__user-card">
                    <div className="pr-page__avatar">SD</div>
                    <div>
                        <strong>shivani dhumal</strong>
                        <p>bhb</p>
                        <small>Mar 9 – 15, 2026</small>
                    </div>
                </div>

                <div className="pr-breakdown-modal__tabs">
                    <button
                        className={`tab ${activeTab === "Overview" ? "active" : ""}`}
                        onClick={() => setActiveTab("Overview")}
                    >
                        Overview
                    </button>
                    <button
                        className={`tab ${activeTab === "Activity" ? "active" : ""}`}
                        onClick={() => setActiveTab("Activity")}
                    >
                        Activity
                    </button>
                </div>

                {activeTab === "Overview" && (
                    <div className="pr-breakdown-modal__content">
                        <div className="pr-breakdown-modal__metrics">
                            <div className="metric-card">
                                <span>Earnings</span>
                                <strong>₮0.00</strong>
                            </div>
                            <div className="metric-card">
                                <span>Other</span>
                                <strong>₮0.00</strong>
                            </div>
                            <div className="metric-card">
                                <span>Paid</span>
                                <strong>₮0.00</strong>
                            </div>
                            <div className="metric-card">
                                <span>To pay</span>
                                <strong>₮0.00</strong>
                            </div>
                        </div>

                        <div className="pr-breakdown-modal__detail-sections">
                            <div className="detail-section">
                                <div className="section-header">
                                    <strong>Earnings</strong>
                                    <span>₮0.00</span>
                                </div>
                                <div className="detail-rows">
                                    <div className="detail-row">
                                        <div>
                                            <strong>Wages</strong>
                                            <p>Hourly rate</p>
                                            <p>Regular hours</p>
                                            <p>Regular hours total</p>
                                            <p>Overtime hourly rate</p>
                                            <p>Overtime hours</p>
                                            <p>Overtime total</p>
                                        </div>
                                        <div className="text-right">
                                            <strong>₮0.00</strong>
                                            <p>₮0.00</p>
                                            <p>0min</p>
                                            <p>₮0.00</p>
                                            <p>₮0.00</p>
                                            <p>0min</p>
                                            <p>₮0.00</p>
                                        </div>
                                    </div>
                                    <div className="detail-row">
                                        <strong>Commissions</strong>
                                        <strong>₮0.00</strong>
                                    </div>
                                </div>
                            </div>

                            <div className="detail-section">
                                <div className="section-header">
                                    <strong>Paid</strong>
                                </div>
                                <div className="empty-state">
                                    No payments made
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
            <AddAdjustmentModal
                isOpen={showAddAdjustment}
                onClose={() => setShowAddAdjustment(false)}
                memberName="shivani dhumal"
            />
        </div>
    );
};

export default PayRunBreakdownPage;
