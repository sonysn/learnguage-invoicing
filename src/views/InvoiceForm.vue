<script setup lang="ts">
import { ref, onMounted, computed } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import api from '../api';

const router = useRouter();
const route = useRoute();

const isEdit = computed(() => !!route.params.id);
const loading = ref(false);
const saving = ref(false);

const form = ref({
  recipient_name: '',
  recipient_email: '',
  currency: 'USD',
  status: 'pending',
  is_recurring: false,
  recurrence_interval: 'none',
  items: [
    { description: '', duration: '', amount: 0 }
  ]
});

const totalAmount = computed(() => {
  return form.value.items.reduce((sum, item) => sum + (Number(item.amount) || 0), 0);
});

const addItem = () => {
  form.value.items.push({ description: '', duration: '', amount: 0 });
};

const removeItem = (index: number) => {
  if (form.value.items.length > 1) {
    form.value.items.splice(index, 1);
  }
};

const fetchInvoice = async () => {
  if (!isEdit.value) return;
  
  try {
    loading.value = true;
    const response = await api.get(`/invoices/${route.params.id}/`);
    const data = response.data;
    form.value = {
      recipient_name: data.recipient_name,
      recipient_email: data.recipient_email,
      currency: data.currency,
      status: data.status,
      is_recurring: data.is_recurring,
      recurrence_interval: data.recurrence_interval,
      items: data.items.map((item: any) => ({
        id: item.id,
        description: item.description,
        duration: item.duration,
        amount: parseFloat(item.amount)
      }))
    };
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
    if (isEdit.value) {
      await api.put(`/invoices/${route.params.id}/`, form.value);
    } else {
      await api.post('/invoices/', form.value);
    }
    router.push('/');
  } catch (err: any) {
    alert('Error saving invoice: ' + (err.response?.data?.detail || JSON.stringify(err.response?.data) || err.message));
  } finally {
    saving.value = false;
  }
};

onMounted(fetchInvoice);
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
                <label>Recipient Name</label>
                <input v-model="form.recipient_name" type="text" required placeholder="e.g. Mr. & Mrs. Fakunle" />
              </div>
              <div class="form-group">
                <label>Recipient Email</label>
                <input v-model="form.recipient_email" type="email" required placeholder="customer@example.com" />
              </div>
            </div>
          </div>

          <div class="form-section">
            <div class="section-header">
              <h3>Invoice Items</h3>
              <button type="button" @click="addItem" class="btn-text-primary">+ Add Another Item</button>
            </div>
            
            <div class="items-list">
              <div v-for="(item, index) in form.items" :key="index" class="item-row card-sub">
                <div class="item-main">
                  <div class="form-group">
                    <label>Description</label>
                    <textarea v-model="item.description" required rows="2" placeholder="Item description..."></textarea>
                  </div>
                  <div class="form-row">
                    <div class="form-group">
                      <label>Duration</label>
                      <input v-model="item.duration" type="text" placeholder="e.g. 4 Weeks" />
                    </div>
                    <div class="form-group">
                      <label>Amount</label>
                      <div class="input-with-icon">
                        <span class="currency-symbol">{{ form.currency }}</span>
                        <input v-model.number="item.amount" type="number" step="0.01" required />
                      </div>
                    </div>
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
                  <label class="radio-card" :class="{ active: form.recurrence_interval === 'yearly' }">
                    <input type="radio" v-model="form.recurrence_interval" value="yearly" />
                    <span>Yearly</span>
                  </label>
                </div>
              </div>
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
          <p>ℹ️ PDF will be generated and emailed only after you confirm payment on the dashboard.</p>
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
h3 { font-size: 1.125rem; font-weight: 700; color: #0f172a; margin: 0; }

.items-list { display: flex; flex-direction: column; gap: 1rem; }
.card-sub { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 0.75rem; padding: 1.5rem; position: relative; }
.item-row { display: flex; gap: 1rem; align-items: flex-start; }
.item-main { flex-grow: 1; }

.btn-remove { position: absolute; top: 0.5rem; right: 0.5rem; width: 24px; height: 24px; border-radius: 50%; border: none; background: #fee2e2; color: #b91c1c; font-size: 1.25rem; line-height: 1; cursor: pointer; display: flex; align-items: center; justify-content: center; transition: all 0.2s; }
.btn-remove:hover { background: #fecaca; transform: scale(1.1); }

.btn-text-primary { background: none; border: none; color: #2563eb; font-weight: 600; font-size: 0.875rem; cursor: pointer; }
.btn-text-primary:hover { text-decoration: underline; }

.form-group { margin-bottom: 1.25rem; }
label { display: block; font-size: 0.875rem; font-weight: 600; color: #475569; margin-bottom: 0.5rem; }

input[type="text"], input[type="email"], input[type="number"], textarea, select { width: 100%; padding: 0.75rem; border: 1px solid #d1d5db; border-radius: 0.5rem; font-size: 1rem; transition: all 0.2s; }
input:focus, textarea:focus, select:focus { outline: none; border-color: #2563eb; box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.1); }

.form-row { display: grid; grid-template-columns: 1fr 1fr; gap: 1.5rem; }
.input-with-icon { position: relative; display: flex; align-items: center; }
.currency-symbol { position: absolute; left: 0.75rem; font-weight: 700; color: #94a3b8; font-size: 0.875rem; }
.input-with-icon input { padding-left: 3rem; }

.recurring-toggle { display: flex; justify-content: space-between; align-items: center; background: #f8fafc; padding: 1.25rem; border-radius: 0.75rem; border: 1px solid #e2e8f0; margin-top: 1rem; }
.toggle-desc { font-size: 0.8125rem; color: #64748b; margin: 0; }
.switch { position: relative; display: inline-block; width: 44px; height: 24px; }
.switch input { opacity: 0; width: 0; height: 0; }
.slider { position: absolute; cursor: pointer; inset: 0; background-color: #cbd5e1; transition: .4s; border-radius: 24px; }
.slider:before { position: absolute; content: ""; height: 18px; width: 18px; left: 3px; bottom: 3px; background-color: white; transition: .4s; border-radius: 50%; }
input:checked + .slider { background-color: #2563eb; }
input:checked + .slider:before { transform: translateX(20px); }

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

@media (max-width: 1024px) { .form-grid { grid-template-columns: 1fr; } .preview-card { position: static; } }
@media (prefers-color-scheme: dark) { .card { background: #1e293b; border-color: #334155; } .preview-card { background: #1a2233; } h3, .preview-item .value { color: #f8fafc; } input, textarea, select { background: #0f172a; border-color: #334155; color: #f1f5f9; } .card-sub, .recurring-toggle, .preview-note { background: #0f172a; border-color: #334155; } .radio-card { border-color: #334155; } }
</style>
