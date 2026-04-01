<script setup lang="ts">
import { ref, onMounted, computed } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import api, { serviceTemplatesApi } from '../api';

const router = useRouter();
const route = useRoute();

const isEdit = computed(() => !!route.params.id);
const loading = ref(false);
const saving = ref(false);

// Service templates
const serviceTemplates = ref<Array<{ id: number; item_name: string; description: string; default_unit_price: number; currency: string }>>([]);
const showTemplatesModal = ref(false);
const activeItemIndex = ref(0);

const form = ref({
  recipient_title: '',
  recipient_title_custom: '',
  recipient_name: '',
  recipient_email: '',
  currency: 'USD',
  status: 'pending',
  invoice_date: '',
  due_date: '',
  is_recurring: false,
  recurrence_interval: 'none',
  next_invoice_date: '',
  recurring_end_date: '',
  include_tax: false,
  tax_percentage: 0,
  notes: '',
  items: [
    { id: null as number | null, item_name: '', description: '', duration_value: 1, duration_unit: 'monthly', unit_price: 0 }
  ]
});

const getFullTitle = computed(() => {
  if (form.value.recipient_title === 'custom') {
    return form.value.recipient_title_custom;
  }
  return form.value.recipient_title;
});

const totalAmount = computed(() => {
  const subtotal = form.value.items.reduce((sum, item) => {
    return sum + (Number(item.duration_value) || 0) * (Number(item.unit_price) || 0);
  }, 0);
  
  if (form.value.include_tax && form.value.tax_percentage > 0) {
    return subtotal * (1 + form.value.tax_percentage / 100);
  }
  return subtotal;
});

const subtotal = computed(() => {
  return form.value.items.reduce((sum, item) => {
    return sum + (Number(item.duration_value) || 0) * (Number(item.unit_price) || 0);
  }, 0);
});

const taxAmount = computed(() => {
  if (form.value.include_tax && form.value.tax_percentage > 0) {
    return subtotal.value * (form.value.tax_percentage / 100);
  }
  return 0;
});

const addItem = () => {
  form.value.items.push({ id: null, item_name: '', description: '', duration_value: 1, duration_unit: 'monthly', unit_price: 0 });
};

const removeItem = (index: number) => {
  if (form.value.items.length > 1) {
    form.value.items.splice(index, 1);
  }
};

const setActiveItem = (index: number) => {
  activeItemIndex.value = index;
};

const loadServiceTemplate = (template: { id: number; item_name: string; description: string; default_unit_price: number; currency: string }) => {
  // Update currency to match the template's currency
  form.value.currency = template.currency;

  // Update the active item with template data
  const activeItem = form.value.items[activeItemIndex.value];
  if (activeItem) {
    activeItem.item_name = template.item_name;
    activeItem.description = template.description;
    activeItem.unit_price = Number(template.default_unit_price);
  }

  showTemplatesModal.value = false;
};

const fetchServiceTemplates = async () => {
  try {
    const response = await serviceTemplatesApi.getAll();
    serviceTemplates.value = response.data;
  } catch (err) {
    console.error('Failed to load service templates');
  }
};

const fetchInvoice = async () => {
  if (!isEdit.value) return;

  try {
    loading.value = true;
    const response = await api.get(`/invoices/${route.params.id}/`);
    const data = response.data;
    const title = data.recipient_title || '';
    
    // Check if it's a predefined title or custom
    const predefinedTitles = ['', 'Mr', 'Mrs', 'Ms', 'Dr', 'Prof', 'Rev', 'Chief', 'custom'];
    if (predefinedTitles.includes(title)) {
      form.value.recipient_title = title;
      form.value.recipient_title_custom = '';
    } else {
      form.value.recipient_title = 'custom';
      form.value.recipient_title_custom = title;
    }
    
    form.value.recipient_name = data.recipient_name;
    form.value.recipient_email = data.recipient_email;
    form.value.currency = data.currency;
    form.value.status = data.status;
    form.value.is_recurring = data.is_recurring;
    form.value.recurrence_interval = data.recurrence_interval;
    form.value.next_invoice_date = data.next_invoice_date ? new Date(data.next_invoice_date).toISOString().split('T')[0] : '';
    form.value.recurring_end_date = data.recurring_end_date ? new Date(data.recurring_end_date).toISOString().split('T')[0] : '';
    form.value.include_tax = data.include_tax || false;
    form.value.tax_percentage = parseFloat(data.tax_percentage) || 0;
    form.value.invoice_date = data.invoice_date ? new Date(data.invoice_date).toISOString().split('T')[0] : '';
    form.value.due_date = data.due_date ? new Date(data.due_date).toISOString().split('T')[0] : '';
    form.value.notes = data.notes || '';
    form.value.items = data.items.map((item: any) => ({
      id: item.id,
      item_name: item.item_name || '',
      description: item.description,
      duration_value: parseInt(item.duration_value) || 1,
      duration_unit: item.duration_unit || 'monthly',
      unit_price: parseFloat(item.unit_price) || 0
    }));
  } catch (err: any) {
    alert('Failed to load invoice details.');
    router.push('/');
  } finally {
    loading.value = false;
  }
};

const saveInvoice = async () => {
  try {
    saving.value = true;
    const payload = {
      recipient_title: getFullTitle.value,
      recipient_name: form.value.recipient_name,
      recipient_email: form.value.recipient_email,
      currency: form.value.currency,
      status: form.value.status,
      invoice_date: form.value.invoice_date || null,
      due_date: form.value.due_date || null,
      is_recurring: form.value.is_recurring,
      recurrence_interval: form.value.recurrence_interval,
      next_invoice_date: form.value.next_invoice_date || null,
      recurring_end_date: form.value.recurring_end_date || null,
      include_tax: form.value.include_tax,
      tax_percentage: form.value.tax_percentage,
      notes: form.value.notes,
      items: form.value.items.map(item => {
        const baseItem: any = {
          item_name: item.item_name,
          description: item.description,
          duration_value: item.duration_value,
          duration_unit: item.duration_unit,
          unit_price: item.unit_price
        };
        if (item.id) {
          baseItem.id = item.id;
        }
        return baseItem;
      })
    };
    
    if (isEdit.value) {
      await api.put(`/invoices/${route.params.id}/`, payload);
    } else {
      await api.post('/invoices/', payload);
    }
    router.push('/');
  } catch (err: any) {
    alert('Error saving invoice: ' + (err.response?.data?.detail || JSON.stringify(err.response?.data) || err.message));
  } finally {
    saving.value = false;
  }
};

onMounted(() => {
  fetchServiceTemplates();
  fetchInvoice();
});
</script>

<template>
  <div class="invoice-form-view">
    <div class="page-header">
      <div>
        <h1>{{ isEdit ? 'Edit Invoice' : 'Create New Invoice' }}</h1>
        <p class="subtitle">{{ isEdit ? 'Update details for ' + form.recipient_name : 'Fill in the details to generate a new invoice' }}</p>
      </div>
      <router-link to="/" class="btn-secondary">Cancel</router-link>
    </div>

    <div v-if="loading" class="loading-state">
      <div class="spinner"></div>
      <p>Loading details...</p>
    </div>

    <div v-else class="form-grid">
      <div class="card form-card">
        <form @submit.prevent="saveInvoice">
          <div class="form-section">
            <div class="section-header">
              <h3>Recipient Information</h3>
            </div>
            <div class="form-row">
              <div class="form-group">
                <label>Title</label>
                <select v-model="form.recipient_title">
                  <option value="">None</option>
                  <option value="Mr">Mr</option>
                  <option value="Mrs">Mrs</option>
                  <option value="Ms">Ms</option>
                  <option value="Dr">Dr</option>
                  <option value="Prof">Prof</option>
                  <option value="Rev">Rev</option>
                  <option value="Chief">Chief</option>
                  <option value="custom">Custom...</option>
                </select>
              </div>
              <div class="form-group">
                <label>Custom Title</label>
                <input v-model="form.recipient_title_custom" type="text" :disabled="form.recipient_title !== 'custom'" placeholder="e.g. Alhaji, Barr., etc." />
              </div>
              <div class="form-group">
                <label>Recipient Name</label>
                <input v-model="form.recipient_name" type="text" required placeholder="e.g. John Fakunle" />
              </div>
            </div>
            <div class="form-row">
              <div class="form-group" style="grid-column: span 3;">
                <label>Recipient Email</label>
                <input v-model="form.recipient_email" type="email" required placeholder="customer@example.com" />
              </div>
            </div>
          </div>

          <div class="form-section">
            <div class="section-header">
              <h3>Invoice Dates</h3>
            </div>
            <div class="form-row-dates">
              <div class="form-group">
                <label>Invoice Date</label>
                <input v-model="form.invoice_date" type="date" />
              </div>
              <div class="form-group">
                <label>Due Date</label>
                <input v-model="form.due_date" type="date" />
              </div>
            </div>
          </div>

          <div class="form-section">
            <div class="section-header">
              <h3>Invoice Items</h3>
              <div class="header-actions">
                <button type="button" @click="showTemplatesModal = true" class="btn-text-secondary">📋 Load from Templates</button>
                <button type="button" @click="addItem" class="btn-text-primary">+ Add Another Item</button>
              </div>
            </div>

            <div class="items-list">
              <div v-for="(item, index) in form.items" :key="index" class="item-row card-sub">
                <div class="item-main">
                  <div class="form-row">
                    <div class="form-group">
                      <label>Item Name *</label>
                      <input v-model="item.item_name" type="text" required placeholder="e.g. Spanish Tutoring" @focus="setActiveItem(index)" />
                    </div>
                    <div class="form-group">
                      <label>Unit Price</label>
                      <div class="input-with-icon">
                        <span class="currency-symbol">{{ form.currency }}</span>
                        <input v-model.number="item.unit_price" type="number" step="0.01" min="0" required placeholder="0.00" @focus="setActiveItem(index)" />
                      </div>
                    </div>
                  </div>
                  <div class="form-group">
                    <label>Description</label>
                    <textarea v-model="item.description" required rows="2" placeholder="Detailed description of the item..." @focus="setActiveItem(index)"></textarea>
                  </div>
                  <div class="form-row">
                    <div class="form-group">
                      <label>Duration Value</label>
                      <input v-model.number="item.duration_value" type="number" min="1" required placeholder="e.g. 4" />
                    </div>
                    <div class="form-group">
                      <label>Duration Unit</label>
                      <select v-model="item.duration_unit" required>
                        <option value="monthly">Month</option>
                        <option value="per_hour">Hour</option>
                      </select>
                    </div>
                  </div>
                  <div class="item-total">
                    <span>Amount: </span>
                    <strong>{{ form.currency }} {{ ((item.duration_value || 0) * (item.unit_price || 0)).toLocaleString(undefined, { minimumFractionDigits: 2 }) }}</strong>
                  </div>
                </div>
                <button
                  v-if="form.items.length > 1"
                  type="button"
                  @click="removeItem(index)"
                  class="btn-remove"
                  title="Remove Item"
                >
                  &times;
                </button>
              </div>
            </div>
          </div>

          <div class="form-section">
            <div class="section-header">
              <h3>Settings</h3>
            </div>

            <div class="form-row">
              <div class="form-group">
                <label>Currency</label>
                <select v-model="form.currency">
                  <option value="USD">USD ($)</option>
                  <option value="NGN">NGN (₦)</option>
                  <option value="GBP">GBP (£)</option>
                  <option value="EUR">EUR (€)</option>
                  <option value="CAD">CAD (C$)</option>
                </select>
              </div>
              <div class="form-group">
                <label>Status</label>
                <select v-model="form.status">
                  <option value="pending">Pending (Awaiting Confirmation)</option>
                  <option value="draft">Save as Draft</option>
                </select>
              </div>
            </div>

            <!-- Tax Toggle - Only for CAD and USD -->
            <div class="tax-toggle" v-if="['CAD', 'USD'].includes(form.currency)">
              <div class="toggle-info">
                <label class="toggle-label">Include Taxes (GST)</label>
                <p class="toggle-desc">Add GST percentage to the invoice total</p>
              </div>
              <label class="switch">
                <input type="checkbox" v-model="form.include_tax">
                <span class="slider round"></span>
              </label>
            </div>

            <div v-if="form.include_tax" class="tax-options animate-fade-in">
              <div class="form-group">
                <label>GST Percentage (%)</label>
                <input v-model.number="form.tax_percentage" type="number" step="0.01" min="0" max="100" placeholder="e.g. 5" />
                <p class="help-text">Standard GST rate is 5% for Canada and varies for US.</p>
              </div>
            </div>

            <div class="recurring-toggle">
              <div class="toggle-info">
                <label class="toggle-label">Recurring Invoice</label>
                <p class="toggle-desc">Automatically repeat this invoice on a schedule</p>
              </div>
              <label class="switch">
                <input type="checkbox" v-model="form.is_recurring">
                <span class="slider round"></span>
              </label>
            </div>

            <div v-if="form.is_recurring" class="recurrence-options animate-fade-in">
              <div class="form-row">
                <div class="form-group">
                  <label>Frequency</label>
                  <div class="radio-group">
                    <label class="radio-card" :class="{ active: form.recurrence_interval === 'weekly' }">
                      <input type="radio" v-model="form.recurrence_interval" value="weekly" />
                      <span>Weekly</span>
                    </label>
                    <label class="radio-card" :class="{ active: form.recurrence_interval === 'monthly' }">
                      <input type="radio" v-model="form.recurrence_interval" value="monthly" />
                      <span>Monthly</span>
                    </label>
                    <label class="radio-card" :class="{ active: form.recurrence_interval === 'quarterly' }">
                      <input type="radio" v-model="form.recurrence_interval" value="quarterly" />
                      <span>Quarterly</span>
                    </label>
                    <label class="radio-card" :class="{ active: form.recurrence_interval === 'yearly' }">
                      <input type="radio" v-model="form.recurrence_interval" value="yearly" />
                      <span>Yearly</span>
                    </label>
                  </div>
                </div>
                <div class="form-group">
                  <label>Next Invoice Date *</label>
                  <input v-model="form.next_invoice_date" type="date" required />
                  <p class="help-text">The date when the next invoice will be automatically generated and sent.</p>
                </div>
                <div class="form-group">
                  <label>End Date (Optional)</label>
                  <input v-model="form.recurring_end_date" type="date" />
                  <p class="help-text">Recurring will stop after this date. Leave empty for indefinite.</p>
                </div>
              </div>
              <div class="recurring-note">
                <p>ℹ️ A new invoice will be automatically generated and sent on the Next Invoice Date. Subsequent invoices will be created every <strong>{{ form.recurrence_interval }}</strong> until the End Date (or indefinitely if no end date is set).</p>
              </div>
            </div>
          </div>

          <div class="form-section">
            <div class="section-header">
              <h3>Notes (Optional)</h3>
            </div>
            <div class="form-group">
              <label>Short Note for Invoice</label>
              <textarea v-model="form.notes" rows="4" maxlength="500" placeholder="Add a short note to include on the invoice (max 500 characters). This will appear below the items table in the PDF." />
              <p class="help-text">This note will be displayed on the PDF invoice below the items table.</p>
            </div>
          </div>

          <div class="form-footer">
            <button type="button" @click="router.push('/')" class="btn-secondary">Cancel</button>
            <button type="submit" class="btn-primary" :disabled="saving">
              {{ saving ? 'Processing...' : (isEdit ? 'Update Invoice' : 'Generate Invoice') }}
            </button>
          </div>
        </form>
      </div>

      <div class="card preview-card">
        <h3>Summary</h3>
        <div class="preview-content">
          <div class="preview-item">
            <span class="label">Subtotal</span>
            <span class="value">{{ form.currency }} {{ subtotal.toLocaleString(undefined, { minimumFractionDigits: 2 }) }}</span>
          </div>
          <div v-if="form.include_tax && form.tax_percentage > 0" class="preview-item">
            <span class="label">Tax ({{ form.tax_percentage }}%)</span>
            <span class="value">{{ form.currency }} {{ taxAmount.toLocaleString(undefined, { minimumFractionDigits: 2 }) }}</span>
          </div>
          <hr />
          <div class="preview-item">
            <span class="label">Total Amount</span>
            <span class="value big">{{ form.currency }} {{ totalAmount.toLocaleString(undefined, { minimumFractionDigits: 2 }) }}</span>
          </div>
          <hr />
          <div class="preview-item">
            <span class="label">Recipient</span>
            <span class="value">{{ form.recipient_name || '---' }}</span>
          </div>
          <div class="preview-item">
            <span class="label">Line Items</span>
            <span class="value">{{ form.items.length }} item(s)</span>
          </div>
          <div class="preview-item">
            <span class="label">Schedule</span>
            <span class="value">{{ form.is_recurring ? 'Recurring ' + form.recurrence_interval : 'One-time payment' }}</span>
          </div>
        </div>
        <div class="preview-note">
          <p>ℹ️ PDF will be generated and emailed when you mark the invoice as sent from the dashboard.</p>
        </div>
      </div>
    </div>

    <!-- Service Templates Modal -->
    <div v-if="showTemplatesModal" class="modal-overlay" @click.self="showTemplatesModal = false">
      <div class="modal-content">
        <div class="modal-header">
          <h2>Select Service Template</h2>
          <button @click="showTemplatesModal = false" class="btn-close">&times;</button>
        </div>
        <div class="modal-body">
          <div v-if="serviceTemplates.length === 0" class="empty-state">
            <p>No service templates available.</p>
          </div>
          <div v-else class="templates-list">
            <div
              v-for="template in serviceTemplates"
              :key="template.id"
              class="template-item"
              @click="loadServiceTemplate(template)"
            >
              <div class="template-info">
                <div>
                  <strong>{{ template.item_name }}</strong>
                  <span class="template-currency">{{ template.currency }}</span>
                </div>
                <div class="template-price">{{ template.currency }} {{ Number(template.default_unit_price).toLocaleString(undefined, { minimumFractionDigits: 2 }) }}</div>
                <p v-if="template.description" class="template-description">{{ template.description }}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.page-header { display: flex; justify-content: space-between; align-items: flex-end; margin-bottom: 2.5rem; }
h1 { font-size: 2rem; font-weight: 800; margin-bottom: 0.25rem; }
.subtitle { color: #64748b; margin: 0; }

.form-grid { display: grid; grid-template-columns: 1fr 320px; gap: 2rem; align-items: start; }
.card { background: white; border-radius: 1rem; border: 1px solid #e2e8f0; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05); padding: 2rem; }
.form-section { margin-bottom: 2.5rem; }
.section-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.5rem; }
.header-actions { display: flex; gap: 0.75rem; }
h3 { font-size: 1.125rem; font-weight: 700; color: #0f172a; margin: 0; }

.items-list { display: flex; flex-direction: column; gap: 1rem; }
.card-sub { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 0.75rem; padding: 1.5rem; position: relative; }
.item-row { display: flex; gap: 1rem; align-items: flex-start; }
.item-main { flex-grow: 1; }
.item-total { margin-top: 0.75rem; padding-top: 0.75rem; border-top: 1px solid #e2e8f0; font-size: 0.875rem; color: #64748b; }

.btn-remove { position: absolute; top: 0.5rem; right: 0.5rem; width: 24px; height: 24px; border-radius: 50%; border: none; background: #fee2e2; color: #b91c1c; font-size: 1.25rem; line-height: 1; cursor: pointer; display: flex; align-items: center; justify-content: center; transition: all 0.2s; }
.btn-remove:hover { background: #fecaca; transform: scale(1.1); }

.btn-text-primary { background: none; border: none; color: #2563eb; font-weight: 600; font-size: 0.875rem; cursor: pointer; }
.btn-text-primary:hover { text-decoration: underline; }
.btn-text-secondary { background: none; border: none; color: #475569; font-weight: 600; font-size: 0.875rem; cursor: pointer; }
.btn-text-secondary:hover { text-decoration: underline; }

.form-group { margin-bottom: 1.25rem; }
label { display: block; font-size: 0.875rem; font-weight: 600; color: #475569; margin-bottom: 0.5rem; }

input[type="text"], input[type="email"], input[type="number"], textarea, select { width: 100%; padding: 0.75rem; border: 1px solid #d1d5db; border-radius: 0.5rem; font-size: 1rem; transition: all 0.2s; }
input:focus, textarea:focus, select:focus { outline: none; border-color: #2563eb; box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.1); }

.form-row { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 1rem; }
.form-row-dates { display: grid; grid-template-columns: 1fr 1fr; gap: 1.5rem; }
.form-row-dates .form-group { margin-bottom: 0; }
.input-with-icon { position: relative; display: flex; align-items: center; }
.currency-symbol { position: absolute; left: 0.75rem; font-weight: 700; color: #94a3b8; font-size: 0.875rem; }
.input-with-icon input { padding-left: 2.5rem; }

.help-text { font-size: 0.75rem; color: #64748b; margin-top: 0.25rem; }

.recurring-note { background: #eff6ff; border: 1px solid #bfdbfe; border-radius: 0.5rem; padding: 1rem; margin-top: 1rem; }
.recurring-note p { margin: 0; font-size: 0.8125rem; color: #1e40af; }

.tax-toggle, .recurring-toggle { display: flex; justify-content: space-between; align-items: center; background: #f8fafc; padding: 1.25rem; border-radius: 0.75rem; border: 1px solid #e2e8f0; margin-top: 1rem; }
.toggle-desc { font-size: 0.8125rem; color: #64748b; margin: 0; }
.switch { position: relative; display: inline-block; width: 44px; height: 24px; }
.switch input { opacity: 0; width: 0; height: 0; }
.slider { position: absolute; cursor: pointer; inset: 0; background-color: #cbd5e1; transition: .4s; border-radius: 24px; }
.slider:before { position: absolute; content: ""; height: 18px; width: 18px; left: 3px; bottom: 3px; background-color: white; transition: .4s; border-radius: 50%; }
input:checked + .slider { background-color: #2563eb; }
input:checked + .slider:before { transform: translateX(20px); }

.tax-options { background: #f8fafc; padding: 1.25rem; border-radius: 0.75rem; border: 1px solid #e2e8f0; margin-top: 1rem; }

.radio-group { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 0.75rem; margin-top: 1rem; }
.radio-card { border: 1px solid #e2e8f0; padding: 0.75rem; border-radius: 0.5rem; text-align: center; cursor: pointer; font-weight: 600; font-size: 0.875rem; color: #64748b; }
.radio-card input { display: none; }
.radio-card.active { border-color: #2563eb; background: #eff6ff; color: #2563eb; }

.form-footer { display: flex; justify-content: flex-end; gap: 1rem; margin-top: 3rem; padding-top: 2rem; border-top: 1px solid #f1f5f9; }
.preview-card { position: sticky; top: 100px; background: #f8fafc; border-style: dashed; }
.preview-item { display: flex; flex-direction: column; gap: 0.25rem; margin-bottom: 1.25rem; }
.preview-item .label { font-size: 0.75rem; font-weight: 700; color: #94a3b8; text-transform: uppercase; }
.preview-item .value { font-weight: 600; color: #0f172a; }
.preview-item .value.big { font-size: 1.5rem; font-weight: 800; color: #2563eb; }
hr { border: 0; border-top: 1px solid #e2e8f0; margin: 1.5rem 0; }
.preview-note { margin-top: 2rem; padding: 1rem; background: #fff; border-radius: 0.5rem; border: 1px solid #e2e8f0; font-size: 0.8125rem; color: #475569; }

/* Modal Styles */
.modal-overlay { position: fixed; inset: 0; background: rgba(0, 0, 0, 0.5); display: flex; align-items: center; justify-content: center; z-index: 1000; }
.modal-content { background: white; border-radius: 1rem; padding: 2rem; max-width: 500px; width: 90%; max-height: 80vh; overflow-y: auto; }
.modal-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.5rem; }
.modal-header h2 { font-size: 1.25rem; font-weight: 700; margin: 0; }
.btn-close { background: none; border: none; font-size: 1.5rem; cursor: pointer; color: #64748b; }
.templates-list { display: flex; flex-direction: column; gap: 0.75rem; }
.template-item { padding: 1rem; border: 1px solid #e2e8f0; border-radius: 0.5rem; cursor: pointer; transition: all 0.2s; }
.template-item:hover { background: #f8fafc; border-color: #2563eb; }
.template-info { display: flex; flex-direction: column; gap: 0.25rem; }
.template-currency { display: inline-block; margin-left: 0.5rem; padding: 0.125rem 0.5rem; background: #f1f5f9; border-radius: 0.25rem; font-size: 0.7rem; font-weight: 600; color: #475569; }
.template-price { font-weight: 700; color: #2563eb; font-size: 0.9375rem; }
.template-description { font-size: 0.8125rem; color: #64748b; margin: 0.25rem 0 0 0; }

@media (max-width: 1024px) { .form-grid { grid-template-columns: 1fr; } .preview-card { position: static; } }
@media (prefers-color-scheme: dark) { .card { background: #1e293b; border-color: #334155; } .preview-card { background: #1a2233; } h3, .preview-item .value { color: #f8fafc; } input, textarea, select { background: #0f172a; border-color: #334155; color: #f1f5f9; } .card-sub, .recurring-toggle, .preview-note, .tax-toggle, .tax-options { background: #0f172a; border-color: #334155; } .radio-card { border-color: #334155; } .modal-content { background: #1e293b; } .template-item { border-color: #334155; } .template-item:hover { background: #0f172a; } }
</style>
