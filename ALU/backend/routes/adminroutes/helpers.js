export const MEMBER_STATUS_LABEL = {
  pending: 'Pending Review',
  email_verified: 'Pending Review',
  under_review: 'Pending Review',
  approved: 'Active',
  rejected: 'Rejected',
  suspended: 'Inactive',
};

export const APPROVAL_STATUS_LABEL = {
  pending: 'Pending Final Approval',
  in_review: 'Pending Final Approval',
  approved: 'Approved & Sent',
  returned: 'Returned to Proponent',
  rejected: 'Rejected',
};

export const APPROVAL_STATUS_TONE = {
  'Pending Final Approval': 'is-orange',
  'Approved & Sent': 'is-green',
  'Returned to Proponent': 'is-blue',
  Rejected: 'is-red',
};

export const DUES_STATUS_LABEL = {
  paid: 'Paid',
  pending: 'Pending',
  overdue: 'Overdue',
};

const pesoFormatter = new Intl.NumberFormat('en-PH', {
  style: 'currency',
  currency: 'PHP',
});

export const priorityConfidence = (priority) => {
  switch (priority) {
    case 'urgent':
      return 0.95;
    case 'high':
      return 0.9;
    case 'medium':
      return 0.78;
    case 'low':
      return 0.66;
    default:
      return 0.72;
  }
};

export const toMemberStatus = (status) => MEMBER_STATUS_LABEL[status] ?? 'Pending Review';

export const toDuesStatus = (status) => DUES_STATUS_LABEL[status] ?? 'Pending';

export const toApprovalStatus = (status) => APPROVAL_STATUS_LABEL[status] ?? 'Pending Final Approval';

export const computeTimeAgo = (input) => {
  if (!input) return null;
  const updated = new Date(input);
  if (Number.isNaN(updated.getTime())) return null;
  const now = new Date();
  const diffMs = now.getTime() - updated.getTime();

  const minute = 60 * 1000;
  const hour = 60 * minute;
  const day = 24 * hour;

  if (diffMs < minute) {
    const seconds = Math.max(1, Math.round(diffMs / 1000));
    return `${seconds} second${seconds === 1 ? '' : 's'} ago`;
  }

  if (diffMs < hour) {
    const minutes = Math.round(diffMs / minute);
    return `${minutes} minute${minutes === 1 ? '' : 's'} ago`;
  }

  if (diffMs < day) {
    const hours = Math.round(diffMs / hour);
    return `${hours} hour${hours === 1 ? '' : 's'} ago`;
  }

  const days = Math.round(diffMs / day);
  return `${days} day${days === 1 ? '' : 's'} ago`;
};

export const safeNumber = (value, fallback = 0) => (Number.isFinite(Number(value)) ? Number(value) : fallback);

export const formatDisplayDate = (value) => {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleString('en-US', {
    month: 'short',
    day: '2-digit',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
};

export const formatCurrency = (value, fallback = '₱0.00') => {
  if (!Number.isFinite(Number(value))) return fallback;
  try {
    return pesoFormatter.format(Number(value));
  } catch (error) {
    return fallback;
  }
};
