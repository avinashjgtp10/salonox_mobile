import React, { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useAppDispatch, useAppSelector } from "../../../hooks/useAppRedux";
import {
  fetchPayRunsThunk,
  createPayRunThunk,
  updatePayRunThunk,
  deletePayRunThunk,
} from "../../../middleware/payRun/payRun.thunk";
import { clearPayRunError, clearPayRunSuccess } from "../../../store/payRunSlice";
import type { PayRun } from "../../../types/payRun.types";
import toast from "react-hot-toast";

import PayRunSummaryCards from "../components/payruns/PayRunSummaryCards";
import PayRunTable from "../components/payruns/PayRunTable";
import PayRunFilterBar from "../components/payruns/PayRunFilterBar";
import PayRunFormModal from "../components/payruns/PayRunFormModal";
import PayRunDeleteModal from "../components/payruns/PayRunDeleteModal";
import PayRunSettingsModal from "../components/payruns/PayRunSettingsModal";
import Button from "../../../components/ui/Button";
import { ChevronLeft, ChevronRight, Gear } from "react-bootstrap-icons";

import "../styles/PayRunsPage.scss";

const PAGE_SIZE = 10;

const PayRunsPage: React.FC = () => {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const { payRuns, summary, loading, error, success } = useAppSelector(
    (state) => state.payRun
  );

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [selectedPayRun, setSelectedPayRun] = useState<PayRun | null>(null);
  const [, setSearchTerm] = useState("");

  // ── Pagination state ────────────────────────────────────────────────────────
  const [currentPage, setCurrentPage] = useState(1);

  const totalPages = useMemo(
    () => Math.max(1, Math.ceil(payRuns.length / PAGE_SIZE)),
    [payRuns.length]
  );

  // Slice the current page's records
  const pagedPayRuns = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE;
    return payRuns.slice(start, start + PAGE_SIZE);
  }, [payRuns, currentPage]);

  // Reset to page 1 when the list changes (after add / delete / search)
  useEffect(() => {
    setCurrentPage(1);
  }, [payRuns.length]);

  // ── Initial load ────────────────────────────────────────────────────────────
  useEffect(() => {
    dispatch(fetchPayRunsThunk({}));
  }, [dispatch]);

  // ── Toast feedback ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (error) {
      toast.error(error);
      dispatch(clearPayRunError());
    }
    if (success) {
      toast.success(
        selectedPayRun?.id
          ? "Pay run updated successfully"
          : "Pay adjustment added successfully"
      );
      dispatch(clearPayRunSuccess());
      setIsFormOpen(false);
      setSelectedPayRun(null);
    }
  }, [error, success, dispatch, selectedPayRun]);

  // ── Handlers ────────────────────────────────────────────────────────────────
  const handleSearch = (value: string) => {
    setSearchTerm(value);
    dispatch(fetchPayRunsThunk({ search: value }));
  };

  const handleCreateOrUpdate = (data: Partial<PayRun>) => {
    if (selectedPayRun?.id) {
      dispatch(updatePayRunThunk({ id: selectedPayRun.id, data }));
    } else {
      dispatch(createPayRunThunk(data));
    }
  };

  const handleDelete = () => {
    if (selectedPayRun?.id) {
      const staffId = selectedPayRun.staffId || selectedPayRun.staff_id;
      dispatch(deletePayRunThunk({ id: selectedPayRun.id, staffId })).then((res) => {
        if (res.meta.requestStatus === "fulfilled") {
          toast.success("Pay run deleted successfully");
          setIsDeleteOpen(false);
          setSelectedPayRun(null);
        }
      });
    }
  };

  const openEditModal = (e: React.MouseEvent, payRun: PayRun) => {
    e.stopPropagation();
    setSelectedPayRun(payRun);
    setIsFormOpen(true);
  };

  const openDeleteModal = (e: React.MouseEvent, payRun: PayRun) => {
    e.stopPropagation();
    setSelectedPayRun(payRun);
    setIsDeleteOpen(true);
  };

  const handlePayTeam = () => {
    if (summary.toPay <= 0) {
      toast.error("There are no pending amounts to pay.");
      return;
    }
    toast.success(
      `Processing payment of ₹${summary.toPay.toLocaleString()} for the team...`
    );
  };

  // ── Range label e.g. "1–10 of 23" ──────────────────────────────────────────
  const rangeStart = payRuns.length === 0 ? 0 : (currentPage - 1) * PAGE_SIZE + 1;
  const rangeEnd   = Math.min(currentPage * PAGE_SIZE, payRuns.length);

  return (
    <div className="pay-runs-container">
      {/* ── Header ── */}
      <div className="page-header d-flex flex-column flex-md-row align-items-md-center justify-content-between gap-3">
        <div>
          <h1 className="title">Pay runs</h1>
          <p className="subtitle">
            Calculate and settle the amount owed to your team for tips,
            commissions, and wages. <a href="#">Learn more</a>
          </p>
        </div>
        <div className="d-flex align-items-center gap-3">
          <Button
            variant="outline"
            className="d-flex align-items-center gap-2 border shadow-sm bg-white rounded-pill"
            onClick={() => setIsSettingsOpen(true)}
          >
            <Gear /> Settings
          </Button>
          <Button
            variant="dark"
            className="rounded-pill px-4 fw-bold shadow-sm"
            onClick={() => { setSelectedPayRun(null); setIsFormOpen(true); }}
          >
            Add Adjustment
          </Button>
        </div>
      </div>

      {/* ── Summary cards ── */}
      <PayRunSummaryCards summary={summary} onPayTeam={handlePayTeam} />

      {/* ── Table ── */}
      <div className="table-container">
        <div className="filter-bar-wrapper">
          <PayRunFilterBar
            onSearchChange={handleSearch}
            onDateChange={() => {}}
            currentDateRange="Mar 9 – 15, 2026"
          />
        </div>

        <PayRunTable
          data={pagedPayRuns}
          loading={loading}
          onRowClick={(pr) => navigate(`/dashboard/team/payruns/${pr.id}`)}
          onEdit={openEditModal}
          onDelete={openDeleteModal}
        />

        {/* ── Pagination ── */}
        {payRuns.length > 0 && (
          <div className="pagination-bar">
            {/* Left: record range */}
            <span className="pagination-bar__range">
              Showing{" "}
              <strong>{rangeStart}–{rangeEnd}</strong>
              {" "}of{" "}
              <strong>{payRuns.length}</strong>
            </span>

            {/* Right: Previous / Next */}
            <div className="pagination-bar__controls">
              <button
                className="pagination-bar__btn"
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
              >
                <ChevronLeft size={14} />
                Previous
              </button>

              {/* Current page indicator */}
              <span className="pagination-bar__page-indicator">
                {currentPage} / {totalPages}
              </span>

              <button
                className="pagination-bar__btn"
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
              >
                Next
                <ChevronRight size={14} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ── Modals ── */}
      <PayRunFormModal
        isOpen={isFormOpen}
        onClose={() => { setIsFormOpen(false); setSelectedPayRun(null); }}
        onSubmit={handleCreateOrUpdate}
        initialData={selectedPayRun || undefined}
        loading={loading}
      />

      <PayRunDeleteModal
        isOpen={isDeleteOpen}
        onClose={() => { setIsDeleteOpen(false); setSelectedPayRun(null); }}
        onConfirm={handleDelete}
        loading={loading}
        itemName={selectedPayRun?.employeeName}
      />

      <PayRunSettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
      />
    </div>
  );
};

export default PayRunsPage;
