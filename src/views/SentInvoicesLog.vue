<script setup lang="ts">
import { ref, onMounted, computed } from 'vue';
import api from '../api';

interface SentInvoice {
  id: number;
  invoice_number: string;
  recipient_name: string;
  recipient_email: string;
  total_amount: number;
  currency: string;
  sent_at: string;
  due_date: string | null;
  created_at: string;
  items: Array<{ description: string }>;
}

const invoices = ref<SentInvoice[]>([]);
const loading = ref(true);
const error = ref<string | null>(null);
const searchQuery = ref('');
const deletingId = ref<number | null>(null);

const fetchInvoices = async () => {
  try {
    loading.value = true;
    const response = await api.get('/sent-invoices/');
    invoices.value = response.data;
    error.value = null;
  } catch (err: any) {
    error.value = 'Failed to load sent invoices. Please check your connection.';
    console.error(err);
  } finally {
    loading.value = false;
  }
};

const deleteSentInvoice = async (id: number, invoiceNumber: string) => {
  if (!confirm(`Are you sure you want to delete the sent invoice record for ${invoiceNumber}? This action cannot be undone.`)) {
    return;
  }

  try {
    deletingId.value = id;
    await api.delete(`/sent-invoices/${id}/`);
    invoices.value = invoices.value.filter(inv => inv.id !== id);
    alert(`Sent invoice ${invoiceNumber} has been deleted.`);
  } catch (err: any) {
    alert('Error: ' + (err.response?.data?.detail || err.message));
  } finally {
    deletingId.value = null;
  }
};

const downloadPdf = async (id: number, number: string) => {
  try {
    const response = await api.get(`/sent-invoices/${id}/download_pdf/`, {
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

onMounted(() => {
  fetchInvoices();
});

const formatDate = (dateString: string | null) => {
  if (!dateString) return '—';
  return new Date(dateString).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  });
};

const formatDateTime = (dateString: string | null) => {
  if (!dateString) return '—';
  return new Date(dateString).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
};

const filteredInvoices = computed(() => {
  if (!searchQuery.value.trim()) return invoices.value;

  const query = searchQuery.value.toLowerCase().trim();
  return invoices.value.filter(invoice => {
    const nameMatch = invoice.recipient_name.toLowerCase().includes(query);
    const emailMatch = invoice.recipient_email.toLowerCase().includes(query);
    const invoiceNumberMatch = invoice.invoice_number.toLowerCase().includes(query);
    return nameMatch || emailMatch || invoiceNumberMatch;
  });
});

const totalsByCurrency = computed(() => {
  const totals: Record<string, number> = {};
  
  filteredInvoices.value.forEach(invoice => {
    const currency = invoice.currency || 'Unknown';
    if (!totals[currency]) {
      totals[currency] = 0;
    }
    totals[currency] += Number(invoice.total_amount);
  });
  
  return totals;
});
</script>

<template>
  <div class="sent-invoices-log">
    <div class="page-header">
      <div>
        <h1>Sent Invoices Log</h1>
        <p class="subtitle">Immutable record of all invoices sent to recipients. These are fixed snapshots and cannot be edited.</p>
      </div>
      <div class="header-actions">
        <button @click="fetchInvoices" class="btn-secondary" :disabled="loading">
          {{ loading ? 'Updating...' : 'Refresh' }}
        </button>
        <router-link to="/" class="btn-primary">← Back to Invoices</router-link>
      </div>
    </div>

    <!-- Summary Stats -->
    <div class="stats-grid">
      <div class="stat-card">
        <div class="stat-label">Total Sent Invoices</div>
        <div class="stat-value">{{ filteredInvoices.length }}</div>
      </div>
    </div>

    <!-- Totals by Currency -->
    <div v-if="Object.keys(totalsByCurrency).length > 0" class="currency-totals">
      <h3 class="section-label">Total Amount by Currency</h3>
      <div class="currency-grid">
        <div v-for="(amount, currency) in totalsByCurrency" :key="currency" class="currency-card">
          <div class="currency-code">{{ currency }}</div>
          <div class="currency-amount">{{ amount.toLocaleString(undefined, { minimumFractionDigits: 2 }) }}</div>
        </div>
      </div>
    </div>

    <div v-if="loading && invoices.length === 0" class="loading-state">
      <div class="spinner"></div>
      <p>Loading sent invoices...</p>
    </div>

    <div v-else-if="error" class="error-container">
      <div class="error-icon">!</div>
      <p>{{ error }}</p>
      <button @click="fetchInvoices" class="btn-secondary">Try Again</button>
    </div>

    <div v-else class="card table-card">
      <div class="table-header">
        <div class="search-box">
          <svg class="search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="11" cy="11" r="8"/>
            <path d="M21 21l-4.35-4.35"/>
          </svg>
          <input
            v-model="searchQuery"
            type="text"
            placeholder="Search by name, email, or invoice number..."
            class="search-input"
          />
          <button
            v-if="searchQuery"
            @click="searchQuery = ''"
            class="clear-search"
            title="Clear search"
          >
            &times;
          </button>
        </div>
        <div class="results-count">
          {{ filteredInvoices.length }} invoice(s)
        </div>
      </div>
      <div class="table-wrapper">
        <table v-if="filteredInvoices.length > 0">
          <thead>
            <tr>
              <th>Invoice #</th>
              <th>Recipient</th>
              <th>Email</th>
              <th>Amount</th>
              <th>Sent Date/Time</th>
              <th>Due Date</th>
              <th class="text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="invoice in filteredInvoices" :key="invoice.id">
              <td>
                <span class="invoice-id">{{ invoice.invoice_number }}</span>
              </td>
              <td>
                <span class="name">{{ invoice.recipient_name }}</span>
              </td>
              <td>
                <span class="email">{{ invoice.recipient_email }}</span>
              </td>
              <td>
                <span class="amount-text">
                  {{ invoice.currency }} {{ parseFloat(invoice.total_amount.toString()).toLocaleString(undefined, { minimumFractionDigits: 2 }) }}
                </span>
              </td>
              <td class="date-cell">
                <div class="sent-date">{{ formatDateTime(invoice.sent_at) }}</div>
              </td>
              <td class="date-cell">
                <span :class="['due-date', { overdue: invoice.due_date && new Date(invoice.due_date) < new Date() }]">
                  {{ formatDate(invoice.due_date) }}
                </span>
              </td>
              <td class="actions-cell">
                <div class="actions-group">
                  <button
                    @click="downloadPdf(invoice.id, invoice.invoice_number)"
                    class="action-btn view-pdf"
                    title="Download the exact PDF that was sent"
                  >
                    Download PDF
                  </button>
                  <button
                    @click="deleteSentInvoice(invoice.id, invoice.invoice_number)"
                    :disabled="deletingId === invoice.id"
                    class="action-btn delete"
                    title="Delete this sent invoice record"
                  >
                    {{ deletingId === invoice.id ? 'Deleting...' : 'Delete' }}
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>

        <div v-else class="empty-state">
          <div class="empty-illustration">📧</div>
          <h3>No sent invoices found</h3>
          <p v-if="searchQuery">No invoices match your search: "<strong>{{ searchQuery }}</strong>"</p>
          <p v-else>There are no sent invoices yet. Mark an invoice as sent from the dashboard.</p>
          <router-link v-if="!searchQuery" to="/" class="btn-primary">Go to Dashboard</router-link>
          <button v-else @click="searchQuery = ''" class="btn-secondary">Clear Search</button>
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

/* Stats Grid */
.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 1rem;
  margin-bottom: 2rem;
}

.stat-card {
  background: white;
  border-radius: 0.75rem;
  padding: 1.5rem;
  border: 1px solid #e2e8f0;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
}

.stat-label {
  font-size: 0.75rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: #64748b;
  margin-bottom: 0.5rem;
}

.stat-value {
  font-size: 1.75rem;
  font-weight: 700;
  color: #0f172a;
}

.stat-value.amount {
  color: #2563eb;
}

/* Currency Totals */
.currency-totals {
  margin-bottom: 2rem;
}

.section-label {
  font-size: 0.875rem;
  font-weight: 600;
  color: #64748b;
  margin-bottom: 0.75rem;
}

.currency-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 1rem;
}

.currency-card {
  background: white;
  border-radius: 0.75rem;
  padding: 1.5rem;
  border: 1px solid #e2e8f0;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.currency-code {
  font-size: 0.75rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: #64748b;
}

.currency-amount {
  font-size: 1.75rem;
  font-weight: 700;
  color: #2563eb;
}

/* Card Styling */
.card {
  background: white;
  border-radius: 1rem;
  border: 1px solid #e2e8f0;
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.03);
  overflow: hidden;
}

.table-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1.25rem 1.5rem;
  border-bottom: 1px solid #e2e8f0;
  background: #f8fafc;
  gap: 1rem;
  flex-wrap: wrap;
}

.search-box {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  flex: 1;
  min-width: 280px;
  max-width: 400px;
  position: relative;
}

.search-icon {
  width: 20px;
  height: 20px;
  color: #94a3b8;
  flex-shrink: 0;
}

.search-input {
  flex: 1;
  padding: 0.625rem 1rem;
  padding-left: 0.75rem;
  border: 1px solid #e2e8f0;
  border-radius: 0.5rem;
  font-size: 0.875rem;
  background: white;
  transition: all 0.2s;
}

.search-input:focus {
  outline: none;
  border-color: #2563eb;
  box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.1);
}

.search-input::placeholder {
  color: #94a3b8;
}

.clear-search {
  background: #f1f5f9;
  border: none;
  border-radius: 50%;
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  color: #64748b;
  font-size: 1.25rem;
  line-height: 1;
  transition: all 0.2s;
  flex-shrink: 0;
}

.clear-search:hover {
  background: #e2e8f0;
  color: #0f172a;
}

.results-count {
  font-size: 0.875rem;
  color: #64748b;
  font-weight: 500;
  white-space: nowrap;
}

.table-wrapper {
  overflow-x: auto;
  -webkit-overflow-scrolling: touch;
}

table {
  width: 100%;
  border-collapse: collapse;
  min-width: 980px;
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

.name {
  font-weight: 600;
  color: #0f172a;
  font-size: 0.9375rem;
}

.email {
  font-size: 0.8125rem;
  color: #64748b;
}

.amount-text {
  font-weight: 700;
  color: #0f172a;
}

.date-cell {
  color: #64748b;
  font-size: 0.875rem;
}

.sent-date {
  font-weight: 500;
  color: #0f172a;
}

.due-date {
  color: #64748b;
}

.due-date.overdue {
  color: #dc2626;
  font-weight: 600;
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

.no-recurring {
  color: #cbd5e1;
  font-size: 1.25rem;
}

/* Actions */
.actions-cell {
  text-align: right;
}

.actions-group {
  display: inline-flex;
  justify-content: flex-end;
  gap: 0.5rem;
  white-space: nowrap;
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

.action-btn.resend {
  border-color: #e2e8f0;
  color: #475569;
}

.action-btn.resend:hover {
  background: #f1f5f9;
  border-color: #cbd5e1;
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
  color: #dc2626;
  border-color: #fecaca;
}

.action-btn.delete:hover:not(:disabled) {
  background: #fee2e2;
  border-color: #fca5a5;
}

.action-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
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

@media (max-width: 960px) {
  .page-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 1rem;
  }

  .header-actions {
    flex-wrap: wrap;
  }

  .table-header {
    align-items: stretch;
  }

  .search-box {
    max-width: none;
    width: 100%;
  }
}

@media (max-width: 640px) {
  h1 {
    font-size: 1.625rem;
  }

  .header-actions {
    width: 100%;
  }

  .header-actions > * {
    width: 100%;
    text-align: center;
  }

  .table-header {
    padding: 1rem;
  }

  .search-box {
    min-width: 0;
  }

  .stats-grid,
  .currency-grid {
    grid-template-columns: 1fr;
  }
}

/* Dark Mode Overrides */
@media (prefers-color-scheme: dark) {
  .card {
    background: #1e293b;
    border-color: #334155;
  }
  .stat-card {
    background: #1e293b;
    border-color: #334155;
  }
  .currency-card {
    background: #1e293b;
    border-color: #334155;
  }
  .table-header {
    background: #1a2233;
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
  .name, .amount-text, .sent-date { color: #f8fafc; }
  tr:hover td { background-color: #1a2233; }
  .action-btn.resend { border-color: #334155; color: #94a3b8; }
  .action-btn.resend:hover { background: #334155; }
  .search-input {
    background: #1e293b;
    border-color: #334155;
    color: #f8fafc;
  }
  .search-input:focus {
    border-color: #3b82f6;
    box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
  }
  .search-input::placeholder {
    color: #64748b;
  }
  .clear-search {
    background: #334155;
    color: #94a3b8;
  }
  .clear-search:hover {
    background: #475569;
    color: #f8fafc;
  }
  .results-count {
    color: #94a3b8;
  }
}
</style>
