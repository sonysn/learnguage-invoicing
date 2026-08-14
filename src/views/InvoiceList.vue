<script setup lang="ts">
import { ref, onMounted, computed } from 'vue';
import {
  Mail,
  RefreshCw,
  Plus,
  Search,
  X,
  Send,
  RotateCw,
  Pencil,
  FileDown,
  Trash2,
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  Info,
  SearchX,
  Inbox,
  Loader2,
} from 'lucide-vue-next';
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
  items: Array<{ item_name?: string; description?: string; discount_percentage?: number }>;
}

const invoices = ref<Invoice[]>([]);
const loading = ref(true);
const error = ref<string | null>(null);
const searchQuery = ref('');

const showDeleteModal = ref(false);
const invoiceToDelete = ref<{
  id: number;
  invoice_number: string;
  status: string;
  recipient_email: string;
  is_recurring: boolean;
} | null>(null);
const deleting = ref(false);

const showSendModal = ref(false);
const invoiceToSend = ref<{
  id: number;
  invoice_number: string;
  recipient_name: string;
  recipient_email: string;
} | null>(null);
const sending = ref(false);
const resendingId = ref<number | null>(null);

const alertModal = ref<{
  show: boolean;
  title: string;
  message: string;
  type: 'success' | 'error' | 'warning' | 'info';
}>({
  show: false,
  title: '',
  message: '',
  type: 'error'
});

const showAlert = (message: string, title = 'Notice', type: 'success' | 'error' | 'warning' | 'info' = 'error') => {
  alertModal.value = {
    show: true,
    title,
    message,
    type
  };
};

const closeAlert = () => {
  alertModal.value.show = false;
};

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

const confirmMarkAsSent = (invoice: Invoice) => {
  invoiceToSend.value = {
    id: invoice.id,
    invoice_number: invoice.invoice_number,
    recipient_name: invoice.recipient_name,
    recipient_email: invoice.recipient_email
  };
  showSendModal.value = true;
};

const executeMarkAsSent = async () => {
  if (!invoiceToSend.value) return;

  try {
    sending.value = true;
    await api.post(`/invoices/${invoiceToSend.value.id}/mark_as_sent/`);
    showSendModal.value = false;
    invoiceToSend.value = null;
    await fetchInvoices();
    showAlert('Invoice marked as sent and emailed to the student.', 'Invoice Sent', 'success');
  } catch (err: any) {
    showSendModal.value = false;
    showAlert('Error: ' + (err.response?.data?.detail || err.message), 'Send Failed', 'error');
  } finally {
    sending.value = false;
  }
};

const resendInvoice = async (id: number) => {
  try {
    resendingId.value = id;
    await api.post(`/invoices/${id}/resend_invoice/`);
    showAlert('Invoice resent successfully!', 'Success', 'success');
  } catch (err: any) {
    showAlert('Error: ' + (err.response?.data?.detail || err.message), 'Resend Failed', 'error');
  } finally {
    resendingId.value = null;
  }
};

const confirmDeleteInvoice = (invoice: Invoice) => {
  invoiceToDelete.value = {
    id: invoice.id,
    invoice_number: invoice.invoice_number,
    status: invoice.status,
    recipient_email: invoice.recipient_email,
    is_recurring: invoice.is_recurring
  };
  showDeleteModal.value = true;
};

const executeDeleteInvoice = async () => {
  if (!invoiceToDelete.value) return;

  try {
    deleting.value = true;
    await api.delete(`/invoices/${invoiceToDelete.value.id}/`);
    showDeleteModal.value = false;
    invoiceToDelete.value = null;
    await fetchInvoices();
  } catch (err: any) {
    showDeleteModal.value = false;
    showAlert('Error deleting invoice: ' + (err.response?.data?.detail || err.message), 'Delete Error', 'error');
  } finally {
    deleting.value = false;
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
    showAlert('Error downloading PDF: ' + err.message, 'Download Failed', 'error');
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

const getStatusBadgeClass = (status: string) => {
  switch (status) {
    case 'sent':
      return 'bg-blue-100 text-primary-light';
    case 'pending':
      return 'bg-amber-100 text-amber-800';
    case 'cancelled':
      return 'bg-red-100 text-red-800';
    default:
      return 'bg-slate-100 text-slate-700';
  }
};

const getDescriptionSummary = (invoice: Invoice) => {
  if (!invoice.items || invoice.items.length === 0) return 'No items';
  const first = invoice.items[0];
  const summaryText = first.item_name || first.description || 'Item';
  if (invoice.items.length === 1) return summaryText;
  return `${summaryText} (+${invoice.items.length - 1} more)`;
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

const getRecurringBadgeClass = (invoice: Invoice) => {
  if (!invoice.is_recurring) return '';
  switch (invoice.recurrence_interval) {
    case 'weekly':
      return 'bg-emerald-100 text-emerald-800';
    case 'monthly':
      return 'bg-amber-100 text-amber-800';
    case 'quarterly':
      return 'bg-orange-100 text-orange-800';
    case 'yearly':
      return 'bg-indigo-100 text-indigo-800';
    default:
      return 'bg-blue-100 text-primary-light';
  }
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
</script>

<template>
  <div class="space-y-6">
    <!-- Header -->
    <div class="flex flex-col md:flex-row md:items-end justify-between gap-4">
      <div>
        <h1 class="text-2xl sm:text-3xl font-extrabold font-heading text-text-primary tracking-tight">Invoices</h1>
        <p class="text-sm sm:text-base text-text-secondary mt-1">Manage and track your student invoices</p>
      </div>
      <div class="flex flex-wrap sm:flex-nowrap items-center gap-3 ">
        <router-link to="/sent-invoices"
          class="inline-flex items-center justify-center gap-2 px-4 py-2 shadow-md bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 rounded-lg text-sm font-semibold transition shadow-xs w-full sm:w-auto">
          <Mail :size="16" />
          <span>Sent Log</span>
        </router-link>
        <button @click="fetchInvoices"
          class="inline-flex items-center justify-center gap-2 px-4 py-2 shadow-md bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 rounded-lg text-sm font-semibold transition shadow-xs disabled:opacity-60 w-full sm:w-auto"
          :disabled="loading">
          <RefreshCw :size="16" :class="{ 'animate-spin': loading }" />
          <span>{{ loading ? 'Updating...' : 'Refresh' }}</span>
        </button>
        <router-link to="/new"
          class="inline-flex items-center justify-center gap-2 px-4 py-2 shadow-md bg-primary hover:bg-primary-dark active:bg-primary-light text-white rounded-lg text-sm font-semibold shadow-sm hover:shadow transition w-full sm:w-auto">
          <Plus :size="16" stroke-width="2.5" />
          <span>Create Invoice</span>
        </router-link>
      </div>
    </div>

    <!-- Loading State -->
    <div v-if="loading && invoices.length === 0"
      class="flex flex-col items-center justify-center py-24 bg-white rounded-2xl border border-slate-200 text-text-secondary gap-3">
      <Loader2 :size="36" class="animate-spin text-primary" />
      <p class="text-sm font-medium">Fetching invoices...</p>
    </div>

    <!-- Error State -->
    <div v-else-if="error"
      class="flex flex-col items-center justify-center py-16 px-6 text-center bg-white rounded-2xl border border-red-200 shadow-xs gap-4">
      <div class="w-12 h-12 rounded-full bg-red-100 text-red-600 flex items-center justify-center">
        <AlertCircle :size="24" />
      </div>
      <p class="text-red-700 font-medium text-sm sm:text-base max-w-md">{{ error }}</p>
      <button @click="fetchInvoices"
        class="inline-flex items-center gap-2 px-4 py-2 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 rounded-lg text-sm font-semibold transition">
        <RefreshCw :size="16" />
        <span>Try Again</span>
      </button>
    </div>

    <!-- Table Card -->
    <div v-else class="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
      <!-- Table Filter Bar -->
      <div
        class="flex flex-col sm:flex-row justify-between items-stretch sm:items-center p-4 sm:p-5 border-b border-slate-200 bg-slate-50/70 gap-3">
        <div class="relative flex items-center flex-1 max-w-full sm:max-w-md">
          <Search :size="18" class="absolute left-3 text-slate-400 pointer-events-none" />
          <input v-model="searchQuery" type="text" placeholder="Search by name, email, or invoice number..."
            class="w-full pl-9 pr-9 py-2 text-sm bg-white border border-slate-200 rounded-lg text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-primary focus:ring-2 focus:ring-blue-500/20 transition" />
          <button v-if="searchQuery" @click="searchQuery = ''"
            class="absolute right-2.5 w-5 h-5 rounded-full bg-slate-100 hover:bg-slate-200 text-text-secondary flex items-center justify-center transition"
            title="Clear search">
            <X :size="12" />
          </button>
        </div>
        <div class="text-xs sm:text-sm text-text-secondary font-medium whitespace-nowrap">
          {{ filteredInvoices.length }} of {{ invoices.length }} invoices
        </div>
      </div>

      <!-- Table View -->
      <div class="overflow-x-auto">
        <table v-if="filteredInvoices.length > 0" class="w-full border-collapse text-left text-sm min-w-[1150px]">
          <thead>
            <tr class="border-b border-slate-200 bg-slate-50/50">
              <th class="px-6 py-3.5 text-xs font-bold uppercase tracking-wider text-text-secondary">Invoice</th>
              <th class="px-6 py-3.5 text-xs font-bold uppercase tracking-wider text-text-secondary">Recipient</th>
              <th class="px-6 py-3.5 text-xs font-bold uppercase tracking-wider text-text-secondary">Description</th>
              <th class="px-6 py-3.5 text-xs font-bold uppercase tracking-wider text-text-secondary">Amount</th>
              <th class="px-6 py-3.5 text-xs font-bold uppercase tracking-wider text-text-secondary">Status</th>
              <th class="px-6 py-3.5 text-xs font-bold uppercase tracking-wider text-text-secondary">Recurring</th>
              <th class="px-6 py-3.5 text-xs font-bold uppercase tracking-wider text-text-secondary">Date</th>
              <th class="px-6 py-3.5 text-xs font-bold uppercase tracking-wider text-text-secondary text-right">Actions
              </th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-100">
            <tr v-for="invoice in filteredInvoices" :key="invoice.id" class="hover:bg-slate-50/80 transition-colors">
              <td class="px-6 py-4 whitespace-nowrap">
                <span
                  class="inline-flex items-center font-numbers font-semibold text-xs px-2.5 py-1 rounded bg-slate-100 text-slate-800">
                  {{ invoice.invoice_number }}
                </span>
              </td>
              <td class="px-6 py-4">
                <div class="flex flex-col">
                  <span class="font-semibold text-text-primary text-sm whitespace-nowrap">{{ invoice.recipient_name
                  }}</span>
                  <span class="text-xs text-text-secondary whitespace-nowrap">{{ invoice.recipient_email }}</span>
                </div>
              </td>
              <td class="px-6 py-4 max-w-[280px] truncate text-slate-600 text-xs sm:text-sm">
                {{ getDescriptionSummary(invoice) }}
              </td>
              <td class="px-6 py-4 whitespace-nowrap">
                <span class="font-bold text-text-primary font-numbers text-sm">
                  {{ invoice.currency }} {{ parseFloat(invoice.total_amount.toString()).toLocaleString(undefined, {
                    minimumFractionDigits: 2
                  }) }}
                </span>
              </td>
              <td class="px-6 py-4 whitespace-nowrap">
                <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold capitalize"
                  :class="getStatusBadgeClass(invoice.status)">
                  {{ invoice.status }}
                </span>
              </td>
              <td class="px-6 py-4 whitespace-nowrap">
                <span v-if="getRecurringLabel(invoice)"
                  class="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold"
                  :class="getRecurringBadgeClass(invoice)">
                  {{ getRecurringLabel(invoice) }}
                </span>
                <span v-else class="text-slate-300 text-base leading-none select-none">—</span>
              </td>
              <td class="px-6 py-4 whitespace-nowrap text-xs text-text-secondary">
                {{ formatDate(invoice.created_at) }}
              </td>
              <td class="px-6 py-4 whitespace-nowrap text-right">
                <div class="inline-flex items-center justify-end gap-1.5">
                  <button v-if="invoice.status === 'pending'" @click="confirmMarkAsSent(invoice)" data-tooltip="Send"
                    class="group relative inline-flex items-center justify-center p-2 bg-primary hover:bg-primary-dark text-white rounded-lg text-xs font-semibold shadow-xs transition before:pointer-events-none before:absolute before:bottom-full before:left-1/2 before:-translate-x-1/2 before:mb-2 before:whitespace-nowrap before:rounded-md before:bg-slate-900 before:px-2.5 before:py-1 before:text-xs before:font-medium before:text-white before:shadow-md before:opacity-0 before:transition-opacity before:duration-200 before:content-[attr(data-tooltip)] before:z-30 group-hover:before:opacity-100 hover:before:opacity-100">
                    <Send :size="15" />
                  </button>
                  <button v-if="invoice.status === 'sent'" @click="resendInvoice(invoice.id)" :disabled="resendingId === invoice.id" data-tooltip="Resend"
                    class="group relative inline-flex items-center justify-center p-2 border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 rounded-lg text-xs font-semibold transition disabled:opacity-50 before:pointer-events-none before:absolute before:bottom-full before:left-1/2 before:-translate-x-1/2 before:mb-2 before:whitespace-nowrap before:rounded-md before:bg-slate-900 before:px-2.5 before:py-1 before:text-xs before:font-medium before:text-white before:shadow-md before:opacity-0 before:transition-opacity before:duration-200 before:content-[attr(data-tooltip)] before:z-30 group-hover:before:opacity-100 hover:before:opacity-100">
                    <Loader2 v-if="resendingId === invoice.id" :size="15" class="animate-spin text-primary" />
                    <RotateCw v-else :size="15" />
                  </button>
                  <router-link :to="'/edit/' + invoice.id" data-tooltip="Edit"
                    class="group relative inline-flex items-center justify-center p-2 text-primary hover:bg-blue-50 rounded-lg text-xs font-semibold transition before:pointer-events-none before:absolute before:bottom-full before:left-1/2 before:-translate-x-1/2 before:mb-2 before:whitespace-nowrap before:rounded-md before:bg-slate-900 before:px-2.5 before:py-1 before:text-xs before:font-medium before:text-white before:shadow-md before:opacity-0 before:transition-opacity before:duration-200 before:content-[attr(data-tooltip)] before:z-30 group-hover:before:opacity-100 hover:before:opacity-100">
                    <Pencil :size="15" />
                  </router-link>
                  <button @click="downloadPdf(invoice.id, invoice.invoice_number)" data-tooltip="PDF"
                    class="group relative inline-flex items-center justify-center p-2 border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 rounded-lg text-xs font-semibold transition before:pointer-events-none before:absolute before:bottom-full before:left-1/2 before:-translate-x-1/2 before:mb-2 before:whitespace-nowrap before:rounded-md before:bg-slate-900 before:px-2.5 before:py-1 before:text-xs before:font-medium before:text-white before:shadow-md before:opacity-0 before:transition-opacity before:duration-200 before:content-[attr(data-tooltip)] before:z-30 group-hover:before:opacity-100 hover:before:opacity-100">
                    <FileDown :size="15" />
                  </button>
                  <button
                    @click="confirmDeleteInvoice(invoice)"
                    data-tooltip="Delete"
                    class="group relative inline-flex items-center justify-center p-2 text-red-600 hover:bg-red-50 rounded-lg text-xs font-semibold transition before:pointer-events-none before:absolute before:bottom-full before:left-1/2 before:-translate-x-1/2 before:mb-2 before:whitespace-nowrap before:rounded-md before:bg-slate-900 before:px-2.5 before:py-1 before:text-xs before:font-medium before:text-white before:shadow-md before:opacity-0 before:transition-opacity before:duration-200 before:content-[attr(data-tooltip)] before:z-30 group-hover:before:opacity-100 hover:before:opacity-100">
                    <Trash2 :size="15" />
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>

        <!-- Empty State -->
        <div v-else class="flex flex-col items-center justify-center py-20 px-6 text-center">
          <div class="w-16 h-16 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mb-4">
            <SearchX v-if="searchQuery" :size="32" />
            <Inbox v-else :size="32" />
          </div>
          <h3 class="text-base sm:text-lg font-bold text-slate-800 mb-1">
            {{ searchQuery ? 'No matching invoices found' : 'No invoices yet' }}
          </h3>
          <p v-if="searchQuery" class="text-sm text-text-secondary mb-5 max-w-sm">
            No invoices match your search: "<strong>{{ searchQuery }}</strong>"
          </p>
          <p v-else class="text-sm text-text-secondary mb-5 max-w-sm">
            No invoices yet. Create your first invoice to start tracking payments.
          </p>
          <router-link v-if="!searchQuery" to="/new"
            class="inline-flex items-center gap-2 px-4 py-2 bg-primary hover:bg-primary-dark text-white rounded-lg text-sm font-semibold shadow-sm hover:shadow transition">
            <Plus :size="16" stroke-width="2.5" />
            <span>Create First Invoice</span>
          </router-link>
          <button v-else @click="searchQuery = ''"
            class="inline-flex items-center gap-2 px-4 py-2 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 rounded-lg text-sm font-semibold transition">
            <X :size="16" />
            <span>Clear Search</span>
          </button>
        </div>
      </div>
    </div>

    <!-- Send Confirmation Modal -->
    <div v-if="showSendModal"
      class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs"
      @click.self="!sending && (showSendModal = false)">
      <div
        class="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-md w-full overflow-hidden flex flex-col p-6 space-y-5">
        <div class="flex items-start gap-4">
          <div class="w-11 h-11 rounded-full bg-blue-100 text-primary flex items-center justify-center shrink-0">
            <Send :size="20" />
          </div>
          <div class="space-y-1 flex-1">
            <h3 class="text-lg font-bold text-text-primary">Send Invoice</h3>
            <p class="text-sm text-text-secondary">
              Are you sure you want to mark invoice <strong class="text-slate-800 font-semibold font-numbers">{{ invoiceToSend?.invoice_number }}</strong> as sent?
            </p>
            <p class="text-xs text-text-secondary pt-1">
              This will generate the official PDF and email it to <strong class="text-slate-800">{{ invoiceToSend?.recipient_email }}</strong>.
            </p>
          </div>
        </div>

        <div class="flex flex-col sm:flex-row items-center justify-end gap-3 pt-2 border-t border-slate-100">
          <button type="button" @click="showSendModal = false" :disabled="sending"
            class="w-full sm:w-auto inline-flex items-center justify-center px-4 py-2 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 rounded-lg text-sm font-semibold transition disabled:opacity-50">
            Cancel
          </button>
          <button type="button" @click="executeMarkAsSent" :disabled="sending"
            class="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2 bg-primary hover:bg-primary-dark active:bg-primary-light text-white rounded-lg text-sm font-semibold shadow-sm hover:shadow transition disabled:opacity-60 disabled:cursor-not-allowed">
            <Loader2 v-if="sending" :size="16" class="animate-spin shrink-0" />
            <span>{{ sending ? 'Sending...' : 'Send Invoice' }}</span>
          </button>
        </div>
      </div>
    </div>

    <!-- Delete Confirmation Modal -->
    <div v-if="showDeleteModal"
      class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs"
      @click.self="!deleting && (showDeleteModal = false)">
      <div
        class="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-md w-full overflow-hidden flex flex-col p-6 space-y-5">
        <div class="flex items-start gap-4">
          <div class="w-11 h-11 rounded-full bg-red-100 text-red-600 flex items-center justify-center shrink-0">
            <Trash2 :size="22" />
          </div>
          <div class="space-y-2 flex-1">
            <h3 class="text-lg font-bold text-text-primary">Delete Invoice</h3>
            
            <div v-if="invoiceToDelete?.status === 'sent'" class="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-800 space-y-1">
              <p class="font-bold flex items-center gap-1.5">
                <AlertTriangle :size="14" class="text-red-600 shrink-0" />
                This invoice has already been sent
              </p>
              <p>Sent to: <strong>{{ invoiceToDelete?.recipient_email }}</strong></p>
              <p v-if="invoiceToDelete?.is_recurring" class="font-semibold text-red-700">
                This will also STOP future recurring invoices for this student.
              </p>
            </div>

            <p class="text-sm text-text-secondary">
              Are you sure you want to delete invoice <strong class="text-slate-800 font-semibold font-numbers">{{ invoiceToDelete?.invoice_number }}</strong>? This action cannot be undone.
            </p>
          </div>
        </div>

        <div class="flex flex-col sm:flex-row items-center justify-end gap-3 pt-2 border-t border-slate-100">
          <button type="button" @click="showDeleteModal = false" :disabled="deleting"
            class="w-full sm:w-auto inline-flex items-center justify-center px-4 py-2 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 rounded-lg text-sm font-semibold transition disabled:opacity-50">
            Cancel
          </button>
          <button type="button" @click="executeDeleteInvoice" :disabled="deleting"
            class="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2 bg-red-600 hover:bg-red-700 active:bg-red-800 text-white rounded-lg text-sm font-semibold shadow-sm hover:shadow transition disabled:opacity-60 disabled:cursor-not-allowed">
            <Loader2 v-if="deleting" :size="16" class="animate-spin shrink-0" />
            <span>{{ deleting ? 'Deleting...' : 'Delete Invoice' }}</span>
          </button>
        </div>
      </div>
    </div>

    <!-- Alert / Notification Modal -->
    <div v-if="alertModal.show"
      class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs"
      @click.self="closeAlert">
      <div
        class="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-md w-full overflow-hidden flex flex-col p-6 space-y-5">
        <div class="flex items-start gap-4">
          <div v-if="alertModal.type === 'success'"
            class="w-11 h-11 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center shrink-0">
            <CheckCircle2 :size="22" />
          </div>
          <div v-else-if="alertModal.type === 'error'"
            class="w-11 h-11 rounded-full bg-red-100 text-red-600 flex items-center justify-center shrink-0">
            <AlertCircle :size="22" />
          </div>
          <div v-else-if="alertModal.type === 'warning'"
            class="w-11 h-11 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center shrink-0">
            <AlertTriangle :size="22" />
          </div>
          <div v-else
            class="w-11 h-11 rounded-full bg-blue-100 text-primary flex items-center justify-center shrink-0">
            <Info :size="22" />
          </div>
          <div class="space-y-1 flex-1">
            <h3 class="text-lg font-bold text-text-primary">{{ alertModal.title }}</h3>
            <p class="text-sm text-text-secondary whitespace-pre-line leading-relaxed">{{ alertModal.message }}</p>
          </div>
        </div>

        <div class="flex items-center justify-end pt-2 border-t border-slate-100">
          <button type="button" @click="closeAlert"
            class="w-full sm:w-auto inline-flex items-center justify-center px-5 py-2 bg-primary hover:bg-primary-dark active:bg-primary-light text-white rounded-lg text-sm font-semibold shadow-sm transition">
            Dismiss
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
