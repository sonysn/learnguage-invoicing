<script setup lang="ts">
import { ref, onMounted } from 'vue';
import api from '../api';

interface Invoice {
  id: number;
  invoice_number: string;
  recipient_name: string;
  recipient_email: string;
  total_amount: number;
  currency: string;
  status: string;
  created_at: string;
  is_recurring: boolean;
  recurrence_interval: string;
  next_invoice_date: string | null;
  items: Array<{ description: string }>;
}

const invoices = ref<Invoice[]>([]);
const loading = ref(true);
const error = ref<string | null>(null);

const fetchInvoices = async () => {
  try {
    loading.value = true;
    const response = await api.get('/invoices/');
    invoices.value = response.data;
    error.value = null;
  } catch (err: any) {
    error.value = 'Failed to load invoices. Please check your connection.';
    console.error(err);
  } finally {
    loading.value = false;
  }
};

const markAsSent = async (id: number) => {
  if (!confirm('Are you sure you want to mark this invoice as sent? This will send the PDF invoice to the student.')) return;

  try {
    await api.post(`/invoices/${id}/mark_as_sent/`);
    await fetchInvoices();
  } catch (err: any) {
    alert('Error: ' + (err.response?.data?.detail || err.message));
  }
};

const resendInvoice = async (id: number) => {
  try {
    await api.post(`/invoices/${id}/resend_invoice/`);
    alert('Invoice resent successfully!');
  } catch (err: any) {
    alert('Error: ' + (err.response?.data?.detail || err.message));
  }
};

const deleteInvoice = async (id: number, number: string) => {
  if (!confirm(`Are you sure you want to delete invoice ${number}? This action cannot be undone.`)) return;

  try {
    await api.delete(`/invoices/${id}/`);
    await fetchInvoices();
  } catch (err: any) {
    alert('Error deleting invoice: ' + (err.response?.data?.detail || err.message));
  }
};

const downloadPdf = async (id: number, number: string) => {
  try {
    const response = await api.get(`/invoices/${id}/download_pdf/`, {
      responseType: 'blob'
    });
    const url = window.URL.createObjectURL(response.data);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `Invoice_${number}.pdf`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  } catch (err: any) {
    alert('Error downloading PDF: ' + err.message);
  }
};

onMounted(fetchInvoices);

const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  });
};

const getStatusClass = (status: string) => {
  switch (status) {
    case 'sent': return 'status-sent';
    case 'pending': return 'status-pending';
    case 'cancelled': return 'status-cancelled';
    default: return 'status-draft';
  }
};

const getDescriptionSummary = (invoice: Invoice) => {
  if (!invoice.items || invoice.items.length === 0) return 'No items';
  if (invoice.items.length === 1) return invoice.items[0].description;
  return `${invoice.items[0].description} (+${invoice.items.length - 1} more)`;
};

const getRecurringLabel = (invoice: Invoice) => {
  if (!invoice.is_recurring) return null;
  const interval = invoice.recurrence_interval || 'none';
  if (interval === 'none') return null;
  
  let label = interval.charAt(0).toUpperCase() + interval.slice(1);
  if (invoice.next_invoice_date) {
    const nextDate = new Date(invoice.next_invoice_date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric'
    });
    label += ` • Next: ${nextDate}`;
  }
  return label;
};

const getRecurringClass = (invoice: Invoice) => {
  if (!invoice.is_recurring) return '';
  const interval = invoice.recurrence_interval;
  return `recurring-${interval}`;
};
</script>

<template>
  <div class="dashboard">
    <div class="page-header">
      <div>
        <h1>Invoices</h1>
        <p class="subtitle">Manage and track your student invoices</p>
      </div>
      <div class="header-actions">
        <button @click="fetchInvoices" class="btn-secondary" :disabled="loading">
          {{ loading ? 'Updating...' : 'Refresh' }}
        </button>
        <router-link to="/new" class="btn-primary">Create Invoice</router-link>
      </div>
    </div>

    <div v-if="loading && invoices.length === 0" class="loading-state">
      <div class="spinner"></div>
      <p>Fetching invoices...</p>
    </div>

    <div v-else-if="error" class="error-container">
      <div class="error-icon">!</div>
      <p>{{ error }}</p>
      <button @click="fetchInvoices" class="btn-secondary">Try Again</button>
    </div>

    <div v-else class="card table-card">
      <div class="table-wrapper">
        <table v-if="invoices.length > 0">
          <thead>
            <tr>
              <th>Invoice</th>
              <th>Recipient</th>
              <th>Description</th>
              <th>Amount</th>
              <th>Status</th>
              <th>Recurring</th>
              <th>Date</th>
              <th class="text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="invoice in invoices" :key="invoice.id">
              <td>
                <span class="invoice-id">{{ invoice.invoice_number }}</span>
              </td>
              <td>
                <div class="recipient-info">
                  <span class="name">{{ invoice.recipient_name }}</span>
                  <span class="email">{{ invoice.recipient_email }}</span>
                </div>
              </td>
              <td class="description-cell">
                {{ getDescriptionSummary(invoice) }}
              </td>
              <td>
                <span class="amount-text">
                  {{ invoice.currency }} {{ parseFloat(invoice.total_amount.toString()).toLocaleString(undefined, { minimumFractionDigits: 2 }) }}
                </span>
              </td>
              <td>
                <span :class="['status-pill', getStatusClass(invoice.status)]">
                  {{ invoice.status }}
                </span>
              </td>
              <td>
                <span v-if="getRecurringLabel(invoice)" :class="['recurring-pill', getRecurringClass(invoice)]">
                  {{ getRecurringLabel(invoice) }}
                </span>
                <span v-else class="no-recurring">—</span>
              </td>
              <td class="date-cell">{{ formatDate(invoice.created_at) }}</td>
              <td class="actions-cell">
                <button
                  v-if="invoice.status === 'pending'"
                  @click="markAsSent(invoice.id)"
                  class="action-btn confirm"
                  title="Mark as Sent"
                >
                  Mark as Sent
                </button>
                <button
                  v-if="invoice.status === 'sent'"
                  @click="resendInvoice(invoice.id)"
                  class="action-btn resend"
                  title="Resend Invoice"
                >
                  Resend
                </button>
                <router-link :to="'/edit/' + invoice.id" class="action-btn edit" title="Edit">
                  Edit
                </router-link>
                <button
                  @click="downloadPdf(invoice.id, invoice.invoice_number)"
                  class="action-btn view-pdf"
                  title="View PDF"
                >
                  View PDF
                </button>
                <button
                  v-if="invoice.status !== 'sent'"
                  @click="deleteInvoice(invoice.id, invoice.invoice_number)"
                  class="action-btn delete"
                  title="Delete"
                >
                  Delete
                </button>
              </td>
            </tr>
          </tbody>
        </table>

        <div v-else class="empty-state">
          <div class="empty-illustration">📄</div>
          <h3>No invoices yet</h3>
          <p>Create your first invoice to start tracking payments.</p>
          <router-link to="/new" class="btn-primary">Create First Invoice</router-link>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.page-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
  margin-bottom: 2.5rem;
}

h1 {
  font-size: 2rem;
  font-weight: 800;
  letter-spacing: -0.025em;
  margin-bottom: 0.25rem;
}

.subtitle {
  color: #64748b;
  font-size: 1rem;
  margin: 0;
}

.header-actions {
  display: flex;
  gap: 0.75rem;
}

/* Card Styling */
.card {
  background: white;
  border-radius: 1rem;
  border: 1px solid #e2e8f0;
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.03);
  overflow: hidden;
}

.table-wrapper {
  overflow-x: auto;
}

table {
  width: 100%;
  border-collapse: collapse;
}

th {
  background: #f8fafc;
  padding: 1rem 1.5rem;
  text-align: left;
  font-size: 0.75rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: #64748b;
  border-bottom: 1px solid #e2e8f0;
}

td {
  padding: 1.25rem 1.5rem;
  border-bottom: 1px solid #f1f5f9;
  vertical-align: middle;
}

tr:last-child td {
  border-bottom: none;
}

tr:hover td {
  background-color: #f8fafc;
}

/* Cell Content */
.invoice-id {
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  font-weight: 600;
  color: #0f172a;
  background: #f1f5f9;
  padding: 0.25rem 0.5rem;
  border-radius: 0.375rem;
  font-size: 0.875rem;
}

.recipient-info {
  display: flex;
  flex-direction: column;
}

.name {
  font-weight: 600;
  color: #0f172a;
  font-size: 0.9375rem;
}

.email {
  font-size: 0.8125rem;
  color: #64748b;
}

.description-cell {
  max-width: 200px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  color: #475569;
  font-size: 0.875rem;
}

.amount-text {
  font-weight: 700;
  color: #0f172a;
}

.date-cell {
  color: #64748b;
  font-size: 0.875rem;
}

/* Status Pills */
.status-pill {
  display: inline-flex;
  padding: 0.25rem 0.75rem;
  border-radius: 9999px;
  font-size: 0.75rem;
  font-weight: 700;
  text-transform: capitalize;
}

.status-sent {
  background: #dbeafe;
  color: #1e40af;
}

.status-pending {
  background: #fef9c3;
  color: #a16207;
}

.status-cancelled {
  background: #fee2e2;
  color: #b91c1c;
}

.status-draft {
  background: #f1f5f9;
  color: #475569;
}

/* Recurring Pills */
.recurring-pill {
  display: inline-flex;
  padding: 0.25rem 0.75rem;
  border-radius: 9999px;
  font-size: 0.7rem;
  font-weight: 600;
  background: #dbeafe;
  color: #1e40af;
}

.recurring-weekly { background: #dcfce7; color: #166534; }
.recurring-monthly { background: #fef9c3; color: #854d0e; }
.recurring-quarterly { background: #fed7aa; color: #9a3412; }
.recurring-yearly { background: #e0e7ff; color: #3730a3; }

.no-recurring {
  color: #cbd5e1;
  font-size: 1.25rem;
}

/* Actions */
.actions-cell {
  display: flex;
  justify-content: flex-end;
  gap: 0.5rem;
}

.action-btn {
  padding: 0.5rem 0.75rem;
  border-radius: 0.5rem;
  font-size: 0.8125rem;
  font-weight: 600;
  border: 1px solid transparent;
  background: transparent;
  cursor: pointer;
  transition: all 0.2s;
}

.action-btn.confirm {
  background: #2563eb;
  color: white;
}

.action-btn.confirm:hover {
  background: #1d4ed8;
}

.action-btn.resend {
  border-color: #e2e8f0;
  color: #475569;
}

.action-btn.resend:hover {
  background: #f1f5f9;
  border-color: #cbd5e1;
}

.action-btn.edit {
  color: #2563eb;
  text-decoration: none;
}

.action-btn.edit:hover {
  background: #eff6ff;
}

.action-btn.view-pdf {
  color: #64748b;
  border-color: #e2e8f0;
}

.action-btn.view-pdf:hover {
  background: #f8fafc;
  color: #0f172a;
}

.action-btn.delete {
  color: #ef4444;
}

.action-btn.delete:hover {
  background: #fef2f2;
}

/* Empty State */
.empty-state {
  padding: 5rem 2rem;
  text-align: center;
}

.empty-illustration {
  font-size: 4rem;
  margin-bottom: 1.5rem;
}

.empty-state h3 {
  margin-bottom: 0.5rem;
}

.empty-state p {
  color: #64748b;
  margin-bottom: 2rem;
}

.text-right { text-align: right; }

/* Dark Mode Overrides */
@media (prefers-color-scheme: dark) {
  .card {
    background: #1e293b;
    border-color: #334155;
  }
  th {
    background: #1a2233;
    border-color: #334155;
  }
  td {
    border-color: #334155;
  }
  .invoice-id {
    background: #334155;
    color: #f1f5f9;
  }
  .name, .amount-text { color: #f8fafc; }
  tr:hover td { background-color: #1a2233; }
  .action-btn.resend { border-color: #334155; color: #94a3b8; }
  .action-btn.resend:hover { background: #334155; }
}
</style>
