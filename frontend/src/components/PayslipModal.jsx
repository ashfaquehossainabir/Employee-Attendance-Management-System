import { useState } from 'react';
import { formatMoney, monthName } from '../utils/format';
import StatusBadge from './StatusBadge';

export default function PayslipModal({ payslip, isAdmin, onClose, onSaveAdjustments, onMarkPaid }) {
  const [bonus, setBonus] = useState(payslip.bonus || 0);
  const [otherDeductions, setOtherDeductions] = useState(payslip.otherDeductions || 0);
  const [notes, setNotes] = useState(payslip.notes || '');
  const [saving, setSaving] = useState(false);

  const isPending = payslip.status === 'pending';
  const currency = payslip.currency || 'USD';

  const handlePrint = () => window.print();

  const handleSave = async () => {
    setSaving(true);
    try {
      await onSaveAdjustments(payslip._id, {
        bonus: Number(bonus) || 0,
        otherDeductions: Number(otherDeductions) || 0,
        notes,
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-card payslip-print" style={{ maxWidth: 520 }} onClick={(e) => e.stopPropagation()}>
        <div className="payslip-header">
          <div>
            <div className="eyebrow">Payslip</div>
            <h2 style={{ marginTop: 2 }}>
              {monthName(payslip.month)} {payslip.year}
            </h2>
          </div>
          <StatusBadge status={payslip.status} />
        </div>

        <div className="payslip-meta">
          <div>
            <span>Employee</span>
            <strong>{payslip.user?.name}</strong>
          </div>
          <div>
            <span>Employee ID</span>
            <strong>{payslip.user?.employeeId}</strong>
          </div>
          <div>
            <span>Department</span>
            <strong>{payslip.user?.department}</strong>
          </div>
        </div>

        <div className="payslip-section">
          <div className="payslip-row">
            <span>Working days</span>
            <strong>{payslip.workingDays}</strong>
          </div>
          <div className="payslip-row">
            <span>Present days</span>
            <strong>{payslip.presentDays}</strong>
          </div>
          <div className="payslip-row">
            <span>Approved paid leave</span>
            <strong>{payslip.paidLeaveDays}</strong>
          </div>
          <div className="payslip-row">
            <span>Absent days</span>
            <strong>{payslip.absentDays}</strong>
          </div>
          <div className="payslip-row">
            <span>Late arrivals</span>
            <strong>{payslip.lateDays}</strong>
          </div>
          <div className="payslip-row">
            <span>Overtime hours</span>
            <strong>{payslip.overtimeHours}h</strong>
          </div>
        </div>

        <div className="payslip-section">
          <div className="payslip-row">
            <span>Base salary</span>
            <strong>{formatMoney(payslip.baseSalary, currency)}</strong>
          </div>
          <div className="payslip-row">
            <span>Overtime pay</span>
            <strong className="payslip-positive">+{formatMoney(payslip.overtimePay, currency)}</strong>
          </div>
          <div className="payslip-row">
            <span>Bonus</span>
            <strong className="payslip-positive">+{formatMoney(payslip.bonus, currency)}</strong>
          </div>
          <div className="payslip-row">
            <span>Absent deduction</span>
            <strong className="payslip-negative">-{formatMoney(payslip.absentDeduction, currency)}</strong>
          </div>
          <div className="payslip-row">
            <span>Late deduction</span>
            <strong className="payslip-negative">-{formatMoney(payslip.lateDeduction, currency)}</strong>
          </div>
          <div className="payslip-row">
            <span>Other deductions</span>
            <strong className="payslip-negative">-{formatMoney(payslip.otherDeductions, currency)}</strong>
          </div>
        </div>

        <div className="payslip-net">
          <span>Net pay</span>
          <strong>{formatMoney(payslip.netPay, currency)}</strong>
        </div>

        {payslip.notes && !isAdmin && <div className="leave-item-note">{payslip.notes}</div>}

        {isAdmin && isPending && (
          <div className="payslip-edit no-print">
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Bonus</label>
                <input
                  className="form-input"
                  type="number"
                  min="0"
                  step="0.01"
                  value={bonus}
                  onChange={(e) => setBonus(e.target.value)}
                />
              </div>
              <div className="form-group">
                <label className="form-label">Other deductions</label>
                <input
                  className="form-input"
                  type="number"
                  min="0"
                  step="0.01"
                  value={otherDeductions}
                  onChange={(e) => setOtherDeductions(e.target.value)}
                />
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">Notes (visible to employee)</label>
              <input className="form-input" value={notes} onChange={(e) => setNotes(e.target.value)} />
            </div>
            <button className="btn btn-ghost btn-block" onClick={handleSave} disabled={saving}>
              {saving ? 'Saving…' : 'Save adjustments'}
            </button>
          </div>
        )}

        <div className="payslip-actions no-print">
          <button className="btn btn-ghost" onClick={handlePrint} style={{ flex: 1 }}>
            Print / Save PDF
          </button>
          {isAdmin && isPending && (
            <button className="btn btn-primary" onClick={() => onMarkPaid(payslip._id)} style={{ flex: 1 }}>
              Mark as paid
            </button>
          )}
          <button className="btn btn-ghost" onClick={onClose} style={{ flex: 1 }}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
