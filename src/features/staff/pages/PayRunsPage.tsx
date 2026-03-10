import React, { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
    ChevronDown,
    Search,
    Gear
} from "react-bootstrap-icons";
import "../styles/PayRunsPage.scss";
import AddAdjustmentModal from "../components/AddAdjustmentModal";

const PayRunsPage: React.FC = () => {
    const navigate = useNavigate();
    const [isOptionsOpen, setIsOptionsOpen] = useState(false);
    const [activeRowActions, setActiveRowActions] = useState<string | null>(null);
    const [showAddAdjustment, setShowAddAdjustment] = useState(false);
    const actionsRef = useRef<HTMLDivElement>(null);

    // Click outside handler for actions dropdown
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (actionsRef.current && !actionsRef.current.contains(event.target as Node)) {
                setActiveRowActions(null);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const toggleActions = (e: React.MouseEvent, id: string) => {
        e.stopPropagation();
        setActiveRowActions(activeRowActions === id ? null : id);
    };

    return (
        <div className="pr-page">
            <div className="pr-page__header">
                <div className="pr-page__header-info">
                    <h2>Pay runs</h2>
                    <p>Calculate and settle the amount owed to your team for tips, commissions, and wages. <a href="#">Learn more</a></p>
                </div>
                <div className="pr-page__header-btns">
                    <div className="pr-page__options-wrap">
                        <button
                            className="pr-page__btn pr-page__btn--white"
                            onClick={() => setIsOptionsOpen(!isOptionsOpen)}
                        >
                            Options <ChevronDown size={12} />
                        </button>
                        {isOptionsOpen && (
                            <div className="pr-page__options-menu">
                                <div className="pr-page__options-item">
                                    <Gear size={16} /> Pay run settings
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            <div className="pr-page__toolbar">
                <div className="pr-page__date-selector">
                    <button className="pr-page__btn pr-page__btn--white">
                        Mar 9 – 15, 2026 <ChevronDown size={12} />
                    </button>
                </div>
                <div className="pr-page__search-wrap">
                    <Search />
                    <input type="text" placeholder="Search by name" />
                </div>
            </div>

            <div className="pr-page__summary">
                <div className="pr-page__cards">
                    <div className="pr-page__card">
                        <label>Earnings</label>
                        <div className="pr-page__val">₮2,450.00</div>
                    </div>
                    <div className="pr-page__card">
                        <label>Other</label>
                        <div className="pr-page__val">₮150.00</div>
                    </div>
                    <div className="pr-page__card">
                        <label>Total</label>
                        <div className="pr-page__val">₮2,600.00</div>
                    </div>
                    <div className="pr-page__card">
                        <label>Paid</label>
                        <div className="pr-page__val">₮0.00</div>
                    </div>
                    <div className="pr-page__card pr-page__card--action">
                        <div>
                            <label>To pay</label>
                            <div className="pr-page__val">₮2,600.00</div>
                        </div>
                        <button className="pr-page__btn pr-page__btn--dark">Pay team</button>
                    </div>
                </div>
            </div>

            <div className="pr-page__list">
                <div className="pr-page__list-header">
                    <div className="col-member">Team member</div>
                    <div className="col-earnings">Earnings</div>
                    <div className="col-other">Other</div>
                    <div className="col-total">Total</div>
                    <div className="col-paid">Paid</div>
                    <div className="col-topay">To pay</div>
                </div>

                <div className="pr-page__list-item" onClick={() => navigate("/dashboard/team/payruns/sd")}>
                    <div className="col-member">
                        <div className="pr-page__avatar">SD</div>
                        <div className="pr-page__member-info">
                            <strong>shivani dhumal</strong>
                            <div className="pr-page__actions-trigger-wrap" ref={activeRowActions === 'sd' ? actionsRef : null}>
                                <div
                                    className="pr-page__actions-trigger"
                                    onClick={(e) => toggleActions(e, 'sd')}
                                >
                                    Actions <ChevronDown size={10} />
                                </div>
                                {activeRowActions === 'sd' && (
                                    <div className="pr-page__row-dropdown">
                                        <div className="pr-page__dropdown-item" onClick={() => navigate("/dashboard/team/payruns/sd")}>
                                            View breakdown
                                        </div>
                                        <div className="pr-page__dropdown-item">
                                            Edit team member
                                        </div>
                                        <div className="pr-page__dropdown-item" onClick={(e) => {
                                            e.stopPropagation();
                                            setShowAddAdjustment(true);
                                            setActiveRowActions(null);
                                        }}>
                                            Add adjustment
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                    <div className="col-earnings">₮2,450.00</div>
                    <div className="col-other">₮150.00</div>
                    <div className="col-total">₮2,600.00</div>
                    <div className="col-paid">₮0.00</div>
                    <div className="col-topay">₮2,600.00</div>
                </div>
            </div>

            <AddAdjustmentModal
                isOpen={showAddAdjustment}
                onClose={() => setShowAddAdjustment(false)}
                memberName="shivani dhumal"
            />
        </div>
    );
};

export default PayRunsPage;
