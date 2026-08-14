<script setup lang="ts">
import { ref, onMounted } from 'vue';
import {
  RefreshCw,
  Plus,
  Pencil,
  Trash2,
  Layers,
  X,
  Loader2,
  AlertCircle,
  AlertTriangle,
  Info,
} from 'lucide-vue-next';
import { serviceTemplatesApi } from '../api';

interface ServiceTemplate {
  id: number;
  item_name: string;
  description: string;
  default_unit_price: number;
  currency: string;
}

const templates = ref<ServiceTemplate[]>([]);
const loading = ref(true);
const saving = ref(false);
const deleting = ref(false);
const showFormModal = ref(false);
const showDeleteModal = ref(false);
const templateToDelete = ref<ServiceTemplate | null>(null);
const editingTemplate = ref<ServiceTemplate | null>(null);

const alertModal = ref<{
  show: boolean;
  title: string;
  message: string;
  type: 'error' | 'warning' | 'info';
}>({
  show: false,
  title: '',
  message: '',
  type: 'error'
});

const showAlert = (message: string, title = 'Notice', type: 'error' | 'warning' | 'info' = 'error') => {
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

const form = ref({
  item_name: '',
  description: '',
  default_unit_price: 0,
  currency: 'USD'
});

const fetchTemplates = async () => {
  try {
    loading.value = true;
    const response = await serviceTemplatesApi.getAll();
    templates.value = response.data;
  } catch (err: any) {
    console.error('Failed to load service templates:', err);
  } finally {
    loading.value = false;
  }
};

const openCreateModal = () => {
  editingTemplate.value = null;
  form.value = { item_name: '', description: '', default_unit_price: 0, currency: 'USD' };
  showFormModal.value = true;
};

const openEditModal = (template: ServiceTemplate) => {
  editingTemplate.value = template;
  form.value = {
    item_name: template.item_name,
    description: template.description,
    default_unit_price: Number(template.default_unit_price),
    currency: template.currency
  };
  showFormModal.value = true;
};

const saveTemplate = async () => {
  if (!form.value.description.trim()) {
    showAlert('Description is required.', 'Validation Error', 'warning');
    return;
  }
  if (form.value.default_unit_price < 0) {
    showAlert('Price must be a positive number.', 'Validation Error', 'warning');
    return;
  }

  try {
    saving.value = true;
    if (editingTemplate.value) {
      await serviceTemplatesApi.update(editingTemplate.value.id, form.value);
    } else {
      await serviceTemplatesApi.create(form.value);
    }
    showFormModal.value = false;
    await fetchTemplates();
  } catch (err: any) {
    showAlert('Error saving template: ' + (err.response?.data?.detail || err.message), 'Save Error', 'error');
  } finally {
    saving.value = false;
  }
};

const confirmDeleteTemplate = (template: ServiceTemplate) => {
  templateToDelete.value = template;
  showDeleteModal.value = true;
};

const executeDeleteTemplate = async () => {
  if (!templateToDelete.value) return;

  try {
    deleting.value = true;
    await serviceTemplatesApi.delete(templateToDelete.value.id);
    showDeleteModal.value = false;
    templateToDelete.value = null;
    await fetchTemplates();
  } catch (err: any) {
    showDeleteModal.value = false;
    showAlert('Error deleting template: ' + (err.response?.data?.detail || err.message), 'Delete Error', 'error');
  } finally {
    deleting.value = false;
  }
};

onMounted(fetchTemplates);

const formatPrice = (price: number) => {
  return price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};
</script>

<template>
  <div class="space-y-6">
    <!-- Header -->
    <div class="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
      <div>
        <h1 class="text-2xl sm:text-3xl font-extrabold font-heading text-text-primary tracking-tight">Service Templates</h1>
        <p class="text-sm sm:text-base text-text-secondary mt-1">Manage reusable service descriptions and prices</p>
      </div>
      <div class="flex flex-wrap sm:flex-nowrap items-center gap-3">
        <button @click="fetchTemplates"
          class="inline-flex items-center justify-center gap-2 px-4 py-2 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 rounded-lg text-sm font-semibold transition shadow-xs disabled:opacity-60 w-full sm:w-auto"
          :disabled="loading">
          <RefreshCw :size="16" :class="{ 'animate-spin': loading }" />
          <span>{{ loading ? 'Updating...' : 'Refresh' }}</span>
        </button>
        <button @click="openCreateModal"
          class="inline-flex items-center justify-center gap-2 px-4 py-2 bg-primary hover:bg-primary-dark active:bg-primary-light text-white rounded-lg text-sm font-semibold shadow-sm hover:shadow transition w-full sm:w-auto">
          <Plus :size="16" stroke-width="2.5" />
          <span>New Template</span>
        </button>
      </div>
    </div>

    <!-- Loading State -->
    <div v-if="loading && templates.length === 0"
      class="flex flex-col items-center justify-center py-24 bg-white rounded-2xl border border-slate-200 text-text-secondary gap-3">
      <Loader2 :size="36" class="animate-spin text-primary" />
      <p class="text-sm font-medium">Loading templates...</p>
    </div>

    <!-- Table Card -->
    <div v-else class="bg-white rounded-2xl border border-slate-200 shadow-lg overflow-hidden">
      <div class="overflow-x-auto">
        <table v-if="templates.length > 0" class="w-full border-collapse text-left text-sm min-w-[760px]">
          <thead>
            <tr class="border-b border-slate-200 bg-slate-50/50">
              <th class="px-6 py-3.5 text-xs font-bold uppercase tracking-wider text-text-secondary">Item Name</th>
              <th class="px-6 py-3.5 text-xs font-bold uppercase tracking-wider text-text-secondary">Currency</th>
              <th class="px-6 py-3.5 text-xs font-bold uppercase tracking-wider text-text-secondary">Default Price</th>
              <th class="px-6 py-3.5 text-xs font-bold uppercase tracking-wider text-text-secondary">Description</th>
              <th class="px-6 py-3.5 text-xs font-bold uppercase tracking-wider text-text-secondary text-right">Actions
              </th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-100">
            <tr v-for="template in templates" :key="template.id" class="hover:bg-slate-50/80 transition-colors">
              <td class="px-6 py-4 whitespace-nowrap font-semibold text-text-primary text-sm">
                {{ template.item_name }}
              </td>
              <td class="px-6 py-4 whitespace-nowrap">
                <span
                  class="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-slate-100 text-slate-700">
                  {{ template.currency }}
                </span>
              </td>
              <td class="px-6 py-4 whitespace-nowrap font-bold font-numbers text-primary text-sm">
                {{ template.currency }} {{ formatPrice(template.default_unit_price) }}
              </td>
              <td class="px-6 py-4 max-w-[280px] truncate text-text-secondary text-xs sm:text-sm">
                {{ template.description || '—' }}
              </td>
              <td class="px-6 py-4 whitespace-nowrap text-right">
                <div class="inline-flex items-center justify-end gap-1.5">
                  <button @click="openEditModal(template)" data-tooltip="Edit"
                    class="group relative inline-flex items-center justify-center p-2 text-primary hover:bg-blue-50 rounded-lg text-xs font-semibold transition before:pointer-events-none before:absolute before:bottom-full before:left-1/2 before:-translate-x-1/2 before:mb-2 before:whitespace-nowrap before:rounded-md before:bg-slate-900 before:px-2.5 before:py-1 before:text-xs before:font-medium before:text-white before:shadow-md before:opacity-0 before:transition-opacity before:duration-200 before:content-[attr(data-tooltip)] before:z-30 group-hover:before:opacity-100 hover:before:opacity-100">
                    <Pencil :size="15" />
                  </button>
                  <button @click="confirmDeleteTemplate(template)" data-tooltip="Delete"
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
            <Layers :size="32" />
          </div>
          <h3 class="text-base sm:text-lg font-bold text-slate-800 mb-1">
            No service templates yet
          </h3>
          <p class="text-sm text-text-secondary mb-5 max-w-sm">
            Create templates to quickly add common services to invoices.
          </p>
          <button @click="openCreateModal"
            class="inline-flex items-center gap-2 px-4 py-2 bg-primary hover:bg-primary-dark text-white rounded-lg text-sm font-semibold shadow-sm hover:shadow transition">
            <Plus :size="16" stroke-width="2.5" />
            <span>Create First Template</span>
          </button>
        </div>
      </div>
    </div>

    <!-- Create/Edit Modal -->
    <div v-if="showFormModal"
      class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs"
      @click.self="!saving && (showFormModal = false)">
      <div
        class="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-lg w-full overflow-hidden flex flex-col">
        <div class="flex items-center justify-between p-5 border-b border-slate-200">
          <div class="flex items-center gap-2">
           
            <h2 class="text-lg font-bold text-text-primary">
              {{ editingTemplate ? 'Edit Template' : 'Create New Template' }}
            </h2>
          </div>
          <button @click="showFormModal = false"
            class="w-8 h-8 rounded-lg text-text-secondary hover:bg-slate-100 flex items-center justify-center transition"
            title="Close">
            <X :size="18" />
          </button>
        </div>

        <form @submit.prevent="saveTemplate" class="p-6 space-y-4">
          <div>
            <label class="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1.5">Item Name
              *</label>
            <input v-model="form.item_name" type="text" required placeholder="e.g. Spanish Tutoring"
              class="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-lg bg-white text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-primary focus:ring-2 focus:ring-blue-500/20 transition" />
          </div>

          <div>
            <label class="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1.5">Description
              *</label>
            <textarea v-model="form.description" rows="3" required placeholder="Detailed description of the service..."
              class="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-lg bg-white text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-primary focus:ring-2 focus:ring-blue-500/20 transition"></textarea>
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label class="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1.5">Currency
                *</label>
              <select v-model="form.currency" required
                class="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-lg bg-white text-slate-800 focus:outline-none focus:border-primary focus:ring-2 focus:ring-blue-500/20 transition">
                <option value="USD">USD ($)</option>
                <option value="NGN">NGN (₦)</option>
                <option value="GBP">GBP (£)</option>
                <option value="EUR">EUR (€)</option>
                <option value="CAD">CAD (C$)</option>
              </select>
            </div>
            <div>
              <label class="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1.5">Default Unit
                Price *</label>
              <input v-model.number="form.default_unit_price" type="number" step="0.01" min="0" required
                placeholder="0.00"
                class="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-lg bg-white text-slate-800 focus:outline-none focus:border-primary focus:ring-2 focus:ring-blue-500/20 transition" />
            </div>
          </div>

          <div class="flex flex-col sm:flex-row items-center justify-end gap-3 pt-4 border-t border-slate-200">
            <button type="button" @click="showFormModal = false"
              class="w-full sm:w-auto inline-flex items-center justify-center px-4 py-2 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 rounded-lg text-sm font-semibold transition">
              Cancel
            </button>
            <button type="submit"
              class="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2 bg-primary hover:bg-primary-dark active:bg-primary-light text-white rounded-lg text-sm font-semibold shadow-sm hover:shadow transition disabled:opacity-60 disabled:cursor-not-allowed"
              :disabled="saving">
              <Loader2 v-if="saving" :size="16" class="animate-spin shrink-0" />
              
              <span>{{ saving ? 'Saving...' : (editingTemplate ? 'Update Template' : 'Create Template') }}</span>
            </button>
          </div>
        </form>
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
          <div class="space-y-1">
            <h3 class="text-lg font-bold text-text-primary">Delete Template</h3>
            <p class="text-sm text-text-secondary">
              Are you sure you want to delete <strong class="text-slate-800 font-semibold">"{{ templateToDelete?.item_name }}"</strong>? This action cannot be undone.
            </p>
          </div>
        </div>

        <div class="flex flex-col sm:flex-row items-center justify-end gap-3 pt-2 border-t border-slate-100">
          <button type="button" @click="showDeleteModal = false" :disabled="deleting"
            class="w-full sm:w-auto inline-flex items-center justify-center px-4 py-2 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 rounded-lg text-sm font-semibold transition disabled:opacity-50">
            Cancel
          </button>
          <button type="button" @click="executeDeleteTemplate" :disabled="deleting"
            class="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2 bg-red-600 hover:bg-red-700 active:bg-red-800 text-white rounded-lg text-sm font-semibold shadow-sm hover:shadow transition disabled:opacity-60 disabled:cursor-not-allowed">
            <Loader2 v-if="deleting" :size="16" class="animate-spin shrink-0" />
            <span>{{ deleting ? 'Deleting...' : 'Delete Template' }}</span>
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
          <div v-if="alertModal.type === 'error'"
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
          <div class="space-y-1">
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
