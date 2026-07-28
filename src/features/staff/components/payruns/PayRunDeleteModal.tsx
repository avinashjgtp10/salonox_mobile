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
      <div className="d-flex flex-column align-items-center text-center p-3">
        <div
          className="pay-run-delete-modal__icon-wrap rounded-circle d-flex align-items-center justify-content-center mb-4 shadow-sm"
        >
          <ExclamationTriangleFill size={32} className="pay-run-delete-modal__icon" />
        </div>

        <h4 className="fw-black text-dark mb-2">Are you absolutely sure?</h4>
        <p className="pay-run-delete-modal__desc text-muted mb-5 mx-auto">
          This action will permanently delete the pay run record for 
          <strong className="text-dark d-block mt-1">"{itemName || "this staff member"}"</strong>
          This operation cannot be reversed.
        </p>

        <div className="d-flex w-100 gap-3 mt-2">
          <Button 
            variant="outline" 
            className="flex-grow-1 rounded-pill py-2 fw-bold border shadow-sm" 
            onClick={onClose} 
            disabled={loading}
          >
            No, Keep it
          </Button>
          <Button 
            variant="danger" 
            className="flex-grow-1 rounded-pill py-2 fw-bold shadow" 
            onClick={onConfirm} 
            loading={loading}
          >
            Yes, Delete
          </Button>
        </div>
      </div>
    </Modal>
  );
};

export default PayRunDeleteModal;
