import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAppDispatch, useAppSelector } from "../../../hooks/useAppRedux";
import { 
  fetchPayRunsThunk, 
  createPayRunThunk, 
  updatePayRunThunk, 
  deletePayRunThunk 
} from "../../../middleware/payRun/payRun.thunk";
import { clearPayRunError, clearPayRunSuccess } from "../../../store/payRunSlice";
import type { PayRun } from "../../../types/payRun.types";
import toast from "react-hot-toast";

import PayRunSummaryCards from "../components/payruns/PayRunSummaryCards";
import PayRunTable from "../components/payruns/PayRunTable";
import PayRunFilterBar from "../components/payruns/PayRunFilterBar";
import PayRunFormModal from "../components/payruns/PayRunFormModal";
import PayRunDeleteModal from "../components/payruns/PayRunDeleteModal";
import Button from "../../../components/ui/Button";
import { Gear } from "react-bootstrap-icons";

const PayRunsPage: React.FC = () => {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const { payRuns, summary, loading, error, success } = useAppSelector((state) => state.payRun);

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [selectedPayRun, setSelectedPayRun] = useState<PayRun | null>(null);

  useEffect(() => {
    dispatch(fetchPayRunsThunk({}));
  }, [dispatch]);

  useEffect(() => {
    if (error) {
      toast.error(error);
      dispatch(clearPayRunError());
    }
    if (success) {
      toast.success(selectedPayRun?.id ? "Pay run updated successfully" : "Pay adjustment added successfully");
      dispatch(clearPayRunSuccess());
      setIsFormOpen(false);
      setSelectedPayRun(null);
    }
  }, [error, success, dispatch, selectedPayRun]);

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
      dispatch(deletePayRunThunk(selectedPayRun.id)).then((res) => {
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

  return (
    <div className="p-6 max-w-[1600px] mx-auto animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-black text-gray-900 tracking-tight">Pay runs</h1>
          <p className="text-gray-500 mt-1 font-medium">
            Calculate and settle the amount owed to your team for tips, commissions, and wages.
            <a href="#" className="text-blue-600 hover:underline ml-1">Learn more</a>
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" className="flex items-center gap-2 border-gray-200">
            <Gear /> Settings
          </Button>
          <Button onClick={() => { setSelectedPayRun(null); setIsFormOpen(true); }}>
            Add Adjustment
          </Button>
        </div>
      </div>

      <PayRunSummaryCards summary={summary} />

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-1">
        <div className="p-4 border-b border-gray-50">
          <PayRunFilterBar 
            onSearchChange={handleSearch} 
            onDateChange={() => {}} 
            currentDateRange="Mar 9 – 15, 2026" 
          />
        </div>
        
        <PayRunTable 
          data={payRuns} 
          loading={loading} 
          onRowClick={(pr) => navigate(`/dashboard/team/payruns/${pr.id}`)}
          onEdit={openEditModal}
          onDelete={openDeleteModal}
        />
      </div>

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
    </div>
  );
};

export default PayRunsPage;
