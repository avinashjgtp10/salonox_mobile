import React from "react";
import Modal from "../../../../components/ui/Modal";
import Button from "../../../../components/ui/Button";
import { ExclamationTriangleFill } from "react-bootstrap-icons";

interface PayRunDeleteModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  loading?: boolean;
  itemName?: string;
}

const PayRunDeleteModal: React.FC<PayRunDeleteModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  loading,
  itemName,
}) => {
  return (
    <Modal show={isOpen} onClose={onClose} title="Delete Pay Run">
      <div className="flex flex-col items-center text-center p-2">
        <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mb-4">
          <ExclamationTriangleFill size={32} className="text-red-500" />
        </div>
        <h3 className="text-lg font-bold text-gray-900 mb-2">Are you absolutely sure?</h3>
        <p className="text-gray-500 mb-8 max-w-xs">
          This action will permanently delete the pay run record for <span className="font-bold text-gray-900">{itemName}</span>. This cannot be undone.
        </p>
        <div className="flex w-full gap-3">
          <Button variant="outline" className="flex-1 py-3" onClick={onClose} disabled={loading}>
            No, Keep it
          </Button>
          <Button variant="danger" className="flex-1 py-3" onClick={onConfirm} loading={loading}>
            Yes, Delete
          </Button>
        </div>
      </div>
    </Modal>
  );
};

export default PayRunDeleteModal;
