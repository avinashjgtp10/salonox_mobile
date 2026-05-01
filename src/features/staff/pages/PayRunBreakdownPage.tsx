import React, { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useAppDispatch, useAppSelector } from "../../../hooks/useAppRedux";
import { fetchPayRunByIdThunk } from "../../../middleware/payRun/payRun.thunk";
import { ChevronLeft, Printer, Download, Share } from "react-bootstrap-icons";
import Card from "../../../components/ui/Card";
import Button from "../../../components/ui/Button";
import Badge from "../../../components/ui/Badge";
import Loader from "../../../components/ui/Loader";

const PayRunBreakdownPage: React.FC = () => {
  const navigate = useNavigate();
  const { memberId } = useParams();
  const dispatch = useAppDispatch();
  const { loading } = useAppSelector((state) => state.payRun);
  
  // Mocking current pay run details for the UI demo, in a real app this would come from state/selector
  const [payRun, setPayRun] = useState<any>(null);
  const [activeTab, setActiveTab] = useState("Overview");

  useEffect(() => {
    if (memberId) {
      dispatch(fetchPayRunByIdThunk(memberId)).then((res) => {
        if (res.meta.requestStatus === "fulfilled") {
          setPayRun(res.payload);
        } else {
          // Mock data if API fails or for demo purposes
          setPayRun({
            id: memberId,
            employeeName: "Shivani Dhumal",
            payPeriodStart: "2026-03-09",
            payPeriodEnd: "2026-03-15",
            earnings: 2450.00,
            other: 150.00,
            deductions: 0,
            total: 2600.00,
            paid: 0,
            toPay: 2600.00,
            status: "Pending",
            paymentMethod: "Bank Transfer",
            notes: "Regular weekly pay run"
          });
        }
      });
    }
  }, [memberId, dispatch]);

  if (loading && !payRun) {
    return (
      <div className="flex items-center justify-center h-[80vh]">
        <Loader size="lg" />
      </div>
    );
  }

  if (!payRun) return null;

  return (
    <div className="p-6 max-w-[1200px] mx-auto animate-in slide-in-from-bottom-4 duration-500">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => navigate("/dashboard/team/payruns")}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <ChevronLeft size={24} />
          </button>
          <div>
            <h1 className="text-2xl font-black text-gray-900">Pay Run Breakdown</h1>
            <p className="text-gray-500 text-sm font-medium">
              {new Date(payRun.payPeriodStart).toLocaleDateString()} – {new Date(payRun.payPeriodEnd).toLocaleDateString()}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" className="flex items-center gap-2">
            <Printer /> Print
          </Button>
          <Button variant="outline" className="flex items-center gap-2">
            <Download /> Export
          </Button>
          <Button>Pay Now</Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: Summary & Actions */}
        <div className="lg:col-span-1 space-y-6">
          <Card className="p-6 text-center">
            <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center text-blue-700 font-bold text-2xl mx-auto mb-4 border-4 border-white shadow-sm">
              {payRun.employeeName.split(" ").map((n: string) => n[0]).join("").toUpperCase()}
            </div>
            <h2 className="text-xl font-bold text-gray-900">{payRun.employeeName}</h2>
            <Badge variant={payRun.status === "Paid" ? "success" : "warning"} className="mt-2">
              {payRun.status}
            </Badge>
            
            <div className="mt-8 pt-6 border-t border-gray-100">
              <span className="text-sm text-gray-500 font-medium uppercase tracking-wider">Total Amount Owed</span>
              <div className="text-4xl font-black text-gray-900 mt-2">
                ₮{payRun.total.toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <h3 className="font-bold text-gray-900 mb-4">Payment Information</h3>
            <div className="space-y-4">
              <div className="flex justify-between">
                <span className="text-sm text-gray-500">Method</span>
                <span className="text-sm font-bold">{payRun.paymentMethod}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-500">Period</span>
                <span className="text-sm font-bold">Weekly</span>
              </div>
              <div className="pt-4 border-t border-gray-50">
                <span className="text-sm text-gray-500 block mb-1">Notes</span>
                <p className="text-sm text-gray-700 italic">"{payRun.notes || "No notes provided"}"</p>
              </div>
            </div>
          </Card>
        </div>

        {/* Right Column: Detailed Breakdown */}
        <div className="lg:col-span-2 space-y-6">
          <div className="flex gap-4 border-b border-gray-100 mb-2">
            {["Overview", "Earnings", "Deductions", "History"].map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`pb-4 text-sm font-bold transition-all px-2 ${
                  activeTab === tab 
                    ? "text-blue-600 border-b-2 border-blue-600" 
                    : "text-gray-400 hover:text-gray-600"
                }`}
              >
                {tab}
              </button>
            ))}
          </div>

          {activeTab === "Overview" && (
            <div className="space-y-6 animate-in fade-in duration-300">
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-green-50 rounded-2xl border border-green-100">
                  <span className="text-xs font-bold text-green-700 uppercase">Gross Earnings</span>
                  <div className="text-2xl font-black text-green-800 mt-1">₮{payRun.earnings.toLocaleString()}</div>
                </div>
                <div className="p-4 bg-red-50 rounded-2xl border border-red-100">
                  <span className="text-xs font-bold text-red-700 uppercase">Total Deductions</span>
                  <div className="text-2xl font-black text-red-800 mt-1">₮{payRun.deductions.toLocaleString()}</div>
                </div>
              </div>

              <Card className="p-0 overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-50 bg-gray-50/50 flex justify-between items-center">
                  <h3 className="font-bold text-gray-900">Earnings Breakdown</h3>
                  <Button variant="ghost" size="sm" className="text-blue-600 font-bold">Edit</Button>
                </div>
                <div className="p-6 space-y-4">
                  <div className="flex justify-between items-center">
                    <div>
                      <div className="font-bold text-gray-900">Base Salary / Wages</div>
                      <div className="text-xs text-gray-500">Regular hourly rate</div>
                    </div>
                    <span className="font-bold">₮{payRun.earnings.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <div>
                      <div className="font-bold text-gray-900">Adjustments / Other</div>
                      <div className="text-xs text-gray-500">Bonuses and tips</div>
                    </div>
                    <span className="font-bold">₮{payRun.other.toLocaleString()}</span>
                  </div>
                  <div className="pt-4 border-t border-gray-100 flex justify-between items-center">
                    <span className="font-black text-gray-900">Total Gross</span>
                    <span className="font-black text-xl text-gray-900">₮{(payRun.earnings + payRun.other).toLocaleString()}</span>
                  </div>
                </div>
              </Card>

              <Card className="p-0 overflow-hidden border-dashed border-2">
                <div className="p-8 text-center">
                  <div className="w-12 h-12 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-3">
                    <Share className="text-gray-400" />
                  </div>
                  <h4 className="font-bold text-gray-900">No deductions recorded</h4>
                  <p className="text-gray-500 text-sm mt-1 mb-4">Add tax, insurance or other deductions to this pay run.</p>
                  <Button variant="outline" size="sm">Add Deduction</Button>
                </div>
              </Card>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default PayRunBreakdownPage;
