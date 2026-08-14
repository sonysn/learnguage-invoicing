<script setup lang="ts">
import { ref, onMounted, computed } from 'vue';
import {
  RefreshCw,
  ArrowLeft,
  Search,
  X,
  FileDown,
  Trash2,
  AlertCircle,
  SearchX,
  MailCheck,
  Loader2,
} from 'lucide-vue-next';
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
  <div class="space-y-6">
    <!-- Header -->
    <div class="">
      <router-link to="/"
        class="inline-flex items-center justify-center gap-2 py-2 text-secondary hover:text-secondary-dark active:text-secondary-base rounded-lg text-sm font-semibold transition w-full sm:w-auto">
        <ArrowLeft :size="16" />
        <span>Back to Invoices</span>
      </router-link>

    </div>
    <div class="flex flex-col md:flex-row md:items-end justify-between gap-4">

      <div>
        <h1 class="text-2xl sm:text-3xl font-extrabold font-heading text-text-primary tracking-tight">Sent Invoices Log
        </h1>
        <p class="text-sm sm:text-base text-text-secondary mt-1 max-w-2xl">
          Immutable record of all invoices sent to recipients. These are fixed snapshots and cannot be edited.
        </p>
      </div>
      <div class="flex flex-wrap sm:flex-nowrap items-center gap-3">
        <button @click="fetchInvoices"
          class="inline-flex items-center justify-center gap-2 px-4 py-2 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 rounded-lg text-sm font-semibold transition shadow-xs disabled:opacity-60 w-full sm:w-auto"
          :disabled="loading">
          <RefreshCw :size="16" :class="{ 'animate-spin': loading }" />
          <span>{{ loading ? 'Updating...' : 'Refresh' }}</span>
        </button>

      </div>
    </div>

    <!-- Summary Stats -->
    <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
      <div
        class="bg-white p-5 rounded-2xl border border-slate-200 shadow-lg sm:odd:last:col-span-2 md:odd:last:col-span-1">
        <div class="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">Total Sent Invoices</div>
        <div class="text-2xl sm:text-3xl font-bold text-primary font-numbers">{{ filteredInvoices.length }}</div>
      </div>
      <div v-for="(amount, currency) in totalsByCurrency" :key="currency"
        class="bg-white p-5 rounded-2xl border border-slate-200 shadow-lg sm:odd:last:col-span-2 md:odd:last:col-span-1">
        <div class="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">{{ currency }} Total</div>
        <div class="text-2xl sm:text-3xl font-bold text-primary font-numbers">
          {{ amount.toLocaleString(undefined, { minimumFractionDigits: 2 }) }}
        </div>
      </div>
    </div>

    <!-- Loading State -->
    <div v-if="loading && invoices.length === 0"
      class="flex flex-col items-center justify-center py-24 bg-white rounded-2xl border border-slate-200 text-text-secondary gap-3">
      <Loader2 :size="36" class="animate-spin text-primary" />
      <p class="text-sm font-medium">Loading sent invoices...</p>
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
    <div v-else class="bg-white rounded-2xl border border-slate-200 shadow-lg overflow-hidden">
      <!-- Search and Header Bar -->
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
          {{ filteredInvoices.length }} invoice(s)
        </div>
      </div>

      <!-- Table -->
      <div class="overflow-x-auto">
        <table v-if="filteredInvoices.length > 0" class="w-full border-collapse text-left text-sm min-w-[950px]">
          <thead>
            <tr class="border-b border-slate-200 bg-slate-50/50">
              <th class="px-6 py-3.5 text-xs font-bold uppercase tracking-wider text-text-secondary">Invoice #</th>
              <th class="px-6 py-3.5 text-xs font-bold uppercase tracking-wider text-text-secondary">Recipient</th>
              <th class="px-6 py-3.5 text-xs font-bold uppercase tracking-wider text-text-secondary">Email</th>
              <th class="px-6 py-3.5 text-xs font-bold uppercase tracking-wider text-text-secondary">Amount</th>
              <th class="px-6 py-3.5 text-xs font-bold uppercase tracking-wider text-text-secondary">Sent Date/Time</th>
              <th class="px-6 py-3.5 text-xs font-bold uppercase tracking-wider text-text-secondary">Due Date</th>
              <th class="px-6 py-3.5 text-xs font-bold uppercase tracking-wider text-text-secondary text-right">Actions
              </th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-100">
            <tr v-for="invoice in filteredInvoices" :key="invoice.id" class="hover:bg-slate-50/80 transition-colors">
              <td class="px-6 py-4 whitespace-nowrap">
                <span
                  class="inline-flex items-center font-mono font-semibold font-numbers text-xs px-2.5 py-1 rounded bg-slate-100 text-slate-800">
                  {{ invoice.invoice_number }}
                </span>
              </td>
              <td class="px-6 py-4 whitespace-nowrap font-semibold text-text-primary text-sm">
                {{ invoice.recipient_name }}
              </td>
              <td class="px-6 py-4 whitespace-nowrap text-xs text-text-secondary">
                {{ invoice.recipient_email }}
              </td>
              <td class="px-6 py-4 whitespace-nowrap font-bold font-numbers text-text-primary text-sm">
                {{ invoice.currency }} {{ parseFloat(invoice.total_amount.toString()).toLocaleString(undefined, {
                  minimumFractionDigits: 2
                }) }}
              </td>
              <td class="px-6 py-4 whitespace-nowrap text-xs text-slate-700">
                {{ formatDateTime(invoice.sent_at) }}
              </td>
              <td class="px-6 py-4 whitespace-nowrap text-xs">
                <span
                  :class="invoice.due_date && new Date(invoice.due_date) < new Date() ? 'text-red-600 font-semibold' : 'text-text-secondary'">
                  {{ formatDate(invoice.due_date) }}
                </span>
              </td>
              <td class="px-6 py-4 whitespace-nowrap text-right">
                <div class="inline-flex items-center justify-end gap-1.5">
                  <button @click="downloadPdf(invoice.id, invoice.invoice_number)" data-tooltip="Download PDF"
                    class="group relative inline-flex items-center justify-center p-2 border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 rounded-lg text-xs font-semibold transition before:pointer-events-none before:absolute before:bottom-full before:left-1/2 before:-translate-x-1/2 before:mb-2 before:whitespace-nowrap before:rounded-md before:bg-slate-900 before:px-2.5 before:py-1 before:text-xs before:font-medium before:text-white before:shadow-md before:opacity-0 before:transition-opacity before:duration-200 before:content-[attr(data-tooltip)] before:z-30 group-hover:before:opacity-100 hover:before:opacity-100">
                    <FileDown :size="15" />
                  </button>
                  <button @click="deleteSentInvoice(invoice.id, invoice.invoice_number)"
                    :disabled="deletingId === invoice.id"
                    :data-tooltip="deletingId === invoice.id ? 'Deleting...' : 'Delete'"
                    class="group relative inline-flex items-center justify-center p-2 text-red-600 hover:bg-red-50 rounded-lg text-xs font-semibold transition disabled:opacity-50 before:pointer-events-none before:absolute before:bottom-full before:left-1/2 before:-translate-x-1/2 before:mb-2 before:whitespace-nowrap before:rounded-md before:bg-slate-900 before:px-2.5 before:py-1 before:text-xs before:font-medium before:text-white before:shadow-md before:opacity-0 before:transition-opacity before:duration-200 before:content-[attr(data-tooltip)] before:z-30 group-hover:before:opacity-100 hover:before:opacity-100">
                    <Loader2 v-if="deletingId === invoice.id" :size="15" class="animate-spin" />
                    <Trash2 v-else :size="15" />
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
            <MailCheck v-else :size="32" />
          </div>
          <h3 class="text-base sm:text-lg font-bold text-slate-800 mb-1">
            {{ searchQuery ? 'No sent invoices found' : 'No sent invoices yet' }}
          </h3>
          <p v-if="searchQuery" class="text-sm text-text-secondary mb-5 max-w-sm">
            No invoices match your search: "<strong>{{ searchQuery }}</strong>"
          </p>
          <p v-else class="text-sm text-text-secondary mb-5 max-w-sm">
            There are no sent invoices yet. Mark an invoice as sent from the dashboard.
          </p>
          <router-link v-if="!searchQuery" to="/"
            class="inline-flex items-center gap-2 px-4 py-2 bg-primary hover:bg-primary-dark text-white rounded-lg text-sm font-semibold shadow-sm hover:shadow transition">
            <ArrowLeft :size="16" />
            <span>Go to Dashboard</span>
          </router-link>
          <button v-else @click="searchQuery = ''"
            class="inline-flex items-center gap-2 px-4 py-2 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 rounded-lg text-sm font-semibold transition">
            <X :size="16" />
            <span>Clear Search</span>
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
