<script setup lang="ts">
import { ref, onMounted } from 'vue';
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
const showFormModal = ref(false);
const editingTemplate = ref<ServiceTemplate | null>(null);

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
    alert('Description is required.');
    return;
  }
  if (form.value.default_unit_price < 0) {
    alert('Price must be a positive number.');
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
    alert('Error saving template: ' + (err.response?.data?.detail || err.message));
  } finally {
    saving.value = false;
  }
};

const deleteTemplate = async (id: number, item_name: string) => {
  if (!confirm(`Are you sure you want to delete "${item_name}"? This cannot be undone.`)) return;

  try {
    await serviceTemplatesApi.delete(id);
    await fetchTemplates();
  } catch (err: any) {
    alert('Error deleting template: ' + (err.response?.data?.detail || err.message));
  }
};

onMounted(fetchTemplates);

const formatPrice = (price: number) => {
  return price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};
</script>

<template>
  <div class="service-templates-view">
    <div class="page-header">
      <div>
        <h1>Service Templates</h1>
        <p class="subtitle">Manage reusable service descriptions and prices</p>
      </div>
      <div class="header-actions">
        <button @click="fetchTemplates" class="btn-secondary" :disabled="loading">
          {{ loading ? 'Updating...' : 'Refresh' }}
        </button>
        <button @click="openCreateModal" class="btn-primary">+ New Template</button>
      </div>
    </div>

    <div v-if="loading && templates.length === 0" class="loading-state">
      <div class="spinner"></div>
      <p>Loading templates...</p>
    </div>

    <div v-else class="card table-card">
      <div class="table-wrapper">
        <table v-if="templates.length > 0">
          <thead>
            <tr>
              <th>Item Name</th>
              <th>Currency</th>
              <th>Default Price</th>
              <th>Description</th>
              <th class="text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="template in templates" :key="template.id">
              <td>
                <span class="item-name-text">{{ template.item_name }}</span>
              </td>
              <td>
                <span class="currency-badge">{{ template.currency }}</span>
              </td>
              <td>
                <span class="price-text">{{ template.currency }} {{ formatPrice(template.default_unit_price) }}</span>
              </td>
              <td class="description-cell">
                {{ template.description || '---' }}
              </td>
              <td class="actions-cell">
                <div class="actions-group">
                  <button
                    @click="openEditModal(template)"
                    class="action-btn edit"
                    title="Edit"
                  >
                    Edit
                  </button>
                  <button
                    @click="deleteTemplate(template.id, template.item_name)"
                    class="action-btn delete"
                    title="Delete"
                  >
                    Delete
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>

        <div v-else class="empty-state">
          <div class="empty-illustration">📋</div>
          <h3>No service templates yet</h3>
          <p>Create templates to quickly add common services to invoices.</p>
          <button @click="openCreateModal" class="btn-primary">Create First Template</button>
        </div>
      </div>
    </div>

    <!-- Create/Edit Modal -->
    <div v-if="showFormModal" class="modal-overlay" @click.self="showFormModal = false">
      <div class="modal-content">
        <div class="modal-header">
          <h2>{{ editingTemplate ? 'Edit Template' : 'Create New Template' }}</h2>
          <button @click="showFormModal = false" class="btn-close">&times;</button>
        </div>
        <form @submit.prevent="saveTemplate">
          <div class="form-group">
            <label>Item Name *</label>
            <input
              v-model="form.item_name"
              type="text"
              required
              placeholder="e.g. Spanish Tutoring"
            />
          </div>
          <div class="form-group">
            <label>Description</label>
            <textarea
              v-model="form.description"
              rows="3"
              placeholder="Detailed description of the service..."
            ></textarea>
          </div>
          <div class="form-row">
            <div class="form-group">
              <label>Currency *</label>
              <select v-model="form.currency" required>
                <option value="USD">USD ($)</option>
                <option value="NGN">NGN (₦)</option>
                <option value="GBP">GBP (£)</option>
                <option value="EUR">EUR (€)</option>
                <option value="CAD">CAD (C$)</option>
              </select>
            </div>
            <div class="form-group">
              <label>Default Unit Price *</label>
              <input
                v-model.number="form.default_unit_price"
                type="number"
                step="0.01"
                min="0"
                required
                placeholder="0.00"
              />
            </div>
          </div>
          <div class="form-footer">
            <button type="button" @click="showFormModal = false" class="btn-secondary">Cancel</button>
            <button type="submit" class="btn-primary" :disabled="saving">
              {{ saving ? 'Saving...' : (editingTemplate ? 'Update' : 'Create') }}
            </button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>

<style scoped>
.page-header { display: flex; justify-content: space-between; align-items: flex-end; margin-bottom: 2.5rem; }
h1 { font-size: 2rem; font-weight: 800; margin-bottom: 0.25rem; }
.subtitle { color: #64748b; margin: 0; }
.header-actions { display: flex; gap: 0.75rem; }

.card { background: white; border-radius: 1rem; border: 1px solid #e2e8f0; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05); overflow: hidden; }
.table-wrapper { overflow-x: auto; -webkit-overflow-scrolling: touch; }

table { width: 100%; border-collapse: collapse; min-width: 760px; }
th { background: #f8fafc; padding: 1rem 1.5rem; text-align: left; font-size: 0.75rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; color: #64748b; border-bottom: 1px solid #e2e8f0; }
td { padding: 1.25rem 1.5rem; border-bottom: 1px solid #f1f5f9; vertical-align: middle; }
tr:last-child td { border-bottom: none; }
tr:hover td { background-color: #f8fafc; }

.description-text { font-weight: 500; color: #0f172a; }
.price-text { font-weight: 700; color: #2563eb; font-size: 1rem; }

.actions-cell { text-align: right; }
.actions-group { display: inline-flex; justify-content: flex-end; gap: 0.5rem; white-space: nowrap; }
.action-btn { padding: 0.5rem 0.75rem; border-radius: 0.5rem; font-size: 0.8125rem; font-weight: 600; border: 1px solid transparent; background: transparent; cursor: pointer; transition: all 0.2s; }
.action-btn.edit { color: #2563eb; }
.action-btn.edit:hover { background: #eff6ff; }
.action-btn.delete { color: #ef4444; }
.action-btn.delete:hover { background: #fef2f2; }

.empty-state { padding: 5rem 2rem; text-align: center; }
.empty-illustration { font-size: 4rem; margin-bottom: 1.5rem; }
.empty-state h3 { margin-bottom: 0.5rem; }
.empty-state p { color: #64748b; margin-bottom: 2rem; }

.item-name-text { font-weight: 600; color: #0f172a; }
.currency-badge { display: inline-block; padding: 0.25rem 0.5rem; background: #f1f5f9; border-radius: 0.25rem; font-size: 0.75rem; font-weight: 600; color: #475569; }
.price-text { font-weight: 700; color: #2563eb; font-size: 0.9375rem; }
.description-cell { max-width: 250px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; color: #64748b; font-size: 0.8125rem; }

/* Modal */
.modal-overlay { position: fixed; inset: 0; background: rgba(0, 0, 0, 0.5); display: flex; align-items: center; justify-content: center; z-index: 1000; }
.modal-content { background: white; border-radius: 1rem; padding: 2rem; max-width: 500px; width: 90%; }
.modal-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.5rem; }
.modal-header h2 { font-size: 1.25rem; font-weight: 700; margin: 0; }
.btn-close { background: none; border: none; font-size: 1.5rem; cursor: pointer; color: #64748b; }

.form-group { margin-bottom: 1.25rem; }
label { display: block; font-size: 0.875rem; font-weight: 600; color: #475569; margin-bottom: 0.5rem; }
textarea, input[type="number"] { width: 100%; padding: 0.75rem; border: 1px solid #d1d5db; border-radius: 0.5rem; font-size: 1rem; transition: all 0.2s; font-family: inherit; }
textarea:focus, input:focus { outline: none; border-color: #2563eb; box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.1); }

.form-footer { display: flex; justify-content: flex-end; gap: 1rem; margin-top: 1.5rem; padding-top: 1.5rem; border-top: 1px solid #f1f5f9; }

.text-right { text-align: right; }

@media (max-width: 768px) {
  .page-header,
  .form-footer {
    flex-direction: column;
    align-items: stretch;
    gap: 1rem;
  }

  .header-actions {
    width: 100%;
    flex-wrap: wrap;
  }

  .header-actions > * {
    width: 100%;
  }

  .modal-content {
    width: calc(100% - 1rem);
    padding: 1.25rem;
  }

  .form-row {
    display: grid;
    grid-template-columns: 1fr;
    gap: 0;
  }
}

@media (max-width: 480px) {
  h1 {
    font-size: 1.625rem;
  }
}

/* Dark Mode */
@media (prefers-color-scheme: dark) {
  .card { background: #1e293b; border-color: #334155; }
  th { background: #1a2233; border-color: #334155; }
  td { border-color: #334155; }
  .description-text { color: #f8fafc; }
  tr:hover td { background-color: #1a2233; }
  .modal-content { background: #1e293b; }
}
</style>
