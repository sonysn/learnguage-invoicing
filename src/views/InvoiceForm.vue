<script setup lang="ts">
import { ref, onMounted, computed } from "vue";
import { useRouter, useRoute } from "vue-router";
import {
  User,
  Calendar,
  Receipt,
  ClipboardList,
  Plus,
  Trash2,
  Sliders,
  Info,
  MessageSquare,
  Calculator,
  ArrowLeft,
  Check,
  Save,
  Loader2,
  X,
  Layers,
  Inbox,
} from "lucide-vue-next";
import api, { serviceTemplatesApi } from "../api";

const router = useRouter();
const route = useRoute();

const isEdit = computed(() => !!route.params.id);
const loading = ref(false);
const saving = ref(false);

// Service templates
const serviceTemplates = ref<
  Array<{
    id: number;
    item_name: string;
    description: string;
    default_unit_price: number;
    currency: string;
  }>
>([]);
const showTemplatesModal = ref(false);
const activeItemIndex = ref(0);
const durationUnitSuggestions = ["month", "hour", "week", "session"];

const form = ref({
  recipient_title: "",
  recipient_title_custom: "",
  recipient_name: "",
  recipient_email: "",
  currency: "USD",
  status: "pending",
  invoice_date: "",
  due_date: "",
  is_recurring: false,
  recurrence_interval: "none",
  next_invoice_date: "",
  recurring_end_date: "",
  include_tax: false,
  tax_percentage: 0,
  notes: "",
  items: [
    {
      id: null as number | null,
      item_name: "",
      description: "",
      duration_value: 1,
      duration_unit: "",
      unit_price: 0,
      discount_percentage: 0,
    },
  ],
});

const getFullTitle = computed(() => {
  if (form.value.recipient_title === "custom") {
    return form.value.recipient_title_custom;
  }
  return form.value.recipient_title;
});

const getItemOriginalPrice = (item: { duration_value: number; unit_price: number }) => {
  return (Number(item.duration_value) || 0) * (Number(item.unit_price) || 0);
};

const getItemDiscountAmount = (item: { duration_value: number; unit_price: number; discount_percentage: number }) => {
  const orig = getItemOriginalPrice(item);
  const pct = Number(item.discount_percentage) || 0;
  return (orig * pct) / 100;
};

const getItemTotalPrice = (item: { duration_value: number; unit_price: number; discount_percentage: number }) => {
  return getItemOriginalPrice(item) - getItemDiscountAmount(item);
};

const totalAmount = computed(() => {
  if (form.value.include_tax && form.value.tax_percentage > 0) {
    return subtotal.value * (1 + form.value.tax_percentage / 100);
  }
  return subtotal.value;
});

const subtotal = computed(() => {
  return form.value.items.reduce((sum, item) => {
    return sum + getItemTotalPrice(item);
  }, 0);
});

const taxAmount = computed(() => {
  if (form.value.include_tax && form.value.tax_percentage > 0) {
    return subtotal.value * (form.value.tax_percentage / 100);
  }
  return 0;
});

const addItem = () => {
  form.value.items.push({
    id: null,
    item_name: "",
    description: "",
    duration_value: 1,
    duration_unit: "",
    unit_price: 0,
    discount_percentage: 0,
  });
};

const removeItem = (index: number) => {
  if (form.value.items.length > 1) {
    form.value.items.splice(index, 1);
  }
};

const setActiveItem = (index: number) => {
  activeItemIndex.value = index;
};

const loadServiceTemplate = (template: {
  id: number;
  item_name: string;
  description: string;
  default_unit_price: number;
  currency: string;
}) => {
  form.value.currency = template.currency;
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
    console.error("Failed to load service templates");
  }
};

const fetchInvoice = async () => {
  if (!isEdit.value) return;

  try {
    loading.value = true;
    const response = await api.get(`/invoices/${route.params.id}/`);
    const data = response.data;
    const title = data.recipient_title || "";

    const predefinedTitles = [
      "",
      "Mr",
      "Mrs",
      "Ms",
      "Dr",
      "Prof",
      "Rev",
      "Chief",
      "custom",
    ];
    if (predefinedTitles.includes(title)) {
      form.value.recipient_title = title;
      form.value.recipient_title_custom = "";
    } else {
      form.value.recipient_title = "custom";
      form.value.recipient_title_custom = title;
    }

    form.value.recipient_name = data.recipient_name;
    form.value.recipient_email = data.recipient_email;
    form.value.currency = data.currency;
    form.value.status = data.status;
    form.value.is_recurring = data.is_recurring;
    form.value.recurrence_interval = data.recurrence_interval;
    form.value.next_invoice_date = data.next_invoice_date
      ? new Date(data.next_invoice_date).toISOString().split("T")[0]
      : "";
    form.value.recurring_end_date = data.recurring_end_date
      ? new Date(data.recurring_end_date).toISOString().split("T")[0]
      : "";
    form.value.include_tax = data.include_tax || false;
    form.value.tax_percentage = parseFloat(data.tax_percentage) || 0;
    form.value.invoice_date = data.invoice_date
      ? new Date(data.invoice_date).toISOString().split("T")[0]
      : "";
    form.value.due_date = data.due_date
      ? new Date(data.due_date).toISOString().split("T")[0]
      : "";
    form.value.notes = data.notes || "";
    form.value.items = data.items.map((item: any) => ({
      id: item.id,
      item_name: item.item_name || "",
      description: item.description,
      duration_value: parseInt(item.duration_value) || 1,
      duration_unit: item.duration_unit || "",
      unit_price: parseFloat(item.unit_price) || 0,
      discount_percentage: parseFloat(item.discount_percentage) || 0,
    }));
  } catch (err: any) {
    alert("Failed to load invoice details.");
    router.push("/");
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
      items: form.value.items.map((item) => {
        const baseItem: any = {
          item_name: item.item_name,
          description: item.description,
          duration_value: item.duration_value,
          duration_unit: item.duration_unit?.trim() || null,
          unit_price: item.unit_price,
          discount_percentage: item.discount_percentage || 0,
        };
        if (item.id) {
          baseItem.id = item.id;
        }
        return baseItem;
      }),
    };

    if (isEdit.value) {
      await api.put(`/invoices/${route.params.id}/`, payload);
    } else {
      await api.post("/invoices/", payload);
    }
    router.push("/");
  } catch (err: any) {
    alert(
      "Error saving invoice: " +
      (err.response?.data?.detail ||
        JSON.stringify(err.response?.data) ||
        err.message),
    );
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
  <div class="space-y-6">
    <div>
      <router-link to="/"
        class="inline-flex items-center justify-center gap-2 py-2 text-secondary hover:text-secondary-dark active:text-secondary-base rounded-lg text-sm font-semibold transition w-full sm:w-auto">
        <ArrowLeft :size="16" />
        <span>Cancel</span>
      </router-link>
    </div>

    <!-- Header -->
    <div class="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
      <div>
        <h1 class="text-2xl sm:text-3xl font-extrabold font-heading text-text-primary tracking-tight">
          {{ isEdit ? "Edit Invoice" : "Create New Invoice" }}
        </h1>
        <p class="text-sm sm:text-base text-text-secondary mt-1">
          {{
            isEdit
              ? "Update details for " + (form.recipient_name || "invoice")
              : "Fill in the details to generate a new invoice"
          }}
        </p>
      </div>
      
    </div>

    <!-- Loading State -->
    <div v-if="loading"
      class="flex flex-col items-center justify-center py-24 bg-white rounded-2xl border border-slate-200 text-text-secondary gap-3">
      <Loader2 :size="36" class="animate-spin text-primary" />
      <p class="text-sm font-medium">Loading details...</p>
    </div>

    <!-- Main Grid -->
    <div v-else class="grid grid-cols-1 lg:grid-cols-[1fr_340px] gap-8 items-start">
      <!-- Form Card -->
      <div class="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 sm:p-8">
        <form @submit.prevent="saveInvoice" class="space-y-8">
          <!-- Section 1: Recipient Information -->
          <div class="space-y-4">
            <div class="flex items-center gap-2 pb-3 border-b border-slate-200">
             
              <h3 class="text-base sm:text-lg font-bold text-text-primary">Recipient Information</h3>
            </div>
            <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label class="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1.5">Title</label>
                <select v-model="form.recipient_title"
                  class="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-lg bg-white text-slate-800 focus:outline-none focus:border-primary focus:ring-2 focus:ring-blue-500/20 transition">
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
              <div>
                <label class="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1.5">Custom
                  Title</label>
                <input v-model="form.recipient_title_custom" type="text" :disabled="form.recipient_title !== 'custom'"
                  placeholder="e.g. Alhaji, Barr."
                  class="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-lg bg-white text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-primary focus:ring-2 focus:ring-blue-500/20 transition disabled:opacity-50 disabled:bg-slate-100" />
              </div>
              <div>
                <label class="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1.5">Recipient Name
                  *</label>
                <input v-model="form.recipient_name" type="text" required placeholder="e.g. John Fakunle"
                  class="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-lg bg-white text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-primary focus:ring-2 focus:ring-blue-500/20 transition" />
              </div>
            </div>
            <div>
              <label class="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1.5">Recipient Email
                *</label>
              <input v-model="form.recipient_email" type="email" required placeholder="customer@example.com"
                class="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-lg bg-white text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-primary focus:ring-2 focus:ring-blue-500/20 transition" />
            </div>
          </div>

          <!-- Section 2: Invoice Dates -->
          <div class="space-y-4">
            <div class="flex items-center gap-2 pb-3 border-b border-slate-200">
              
              <h3 class="text-base sm:text-lg font-bold text-text-primary">Invoice Dates</h3>
            </div>
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label class="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1.5">Invoice
                  Date</label>
                <input v-model="form.invoice_date" type="date"
                  class="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-lg bg-white text-slate-800 focus:outline-none focus:border-primary focus:ring-2 focus:ring-blue-500/20 transition" />
              </div>
              <div>
                <label class="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1.5">Due
                  Date</label>
                <input v-model="form.due_date" type="date"
                  class="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-lg bg-white text-slate-800 focus:outline-none focus:border-primary focus:ring-2 focus:ring-blue-500/20 transition" />
              </div>
            </div>
          </div>

          <!-- Section 3: Invoice Items -->
          <div class="space-y-4">
            <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200">
              <div class="flex items-center gap-2">
                <h3 class="text-base sm:text-lg font-bold text-text-primary">Invoice Items</h3>
              </div>
              <div class="flex flex-wrap items-center gap-3">
                <button type="button" @click="showTemplatesModal = true"
                  class="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-primary transition">
                  <ClipboardList :size="14" />
                  <span>Load from Templates</span>
                </button>
                <button type="button" @click="addItem"
                  class="inline-flex items-center gap-1.5 text-xs font-semibold text-primary hover:text-primary-dark transition">
                  <Plus :size="14" />
                  <span>Add Another Item</span>
                </button>
              </div>
            </div>

            <!-- Items List -->
            <div class="space-y-4">
              <div v-for="(item, index) in form.items" :key="index"
                class="relative bg-slate-50 border border-slate-200 rounded-xl p-4 sm:p-5 space-y-4">
                <!-- Remove item button -->
                <button v-if="form.items.length > 1" type="button" @click="removeItem(index)"
                  class="absolute top-3.5 right-3.5 w-6 h-6 rounded-full bg-red-100 text-red-600 hover:bg-red-200 flex items-center justify-center transition"
                  title="Remove Item">
                  <Trash2 :size="12" />
                </button>

                <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 pr-6 sm:pr-8">
                  <div>
                    <label class="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1.5">Item Name
                      *</label>
                    <input v-model="item.item_name" type="text" required placeholder="e.g. Spanish Tutoring"
                      @focus="setActiveItem(index)"
                      class="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-lg bg-white text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-primary focus:ring-2 focus:ring-blue-500/20 transition" />
                  </div>
                  <div>
                    <label class="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1.5">Unit
                      Price</label>
                    <div class="relative flex items-center">
                      <span class="absolute left-3 font-semibold text-slate-400 text-xs pointer-events-none">{{
                        form.currency }}</span>
                      <input v-model.number="item.unit_price" type="number" step="0.01" min="0" required
                        placeholder="0.00" @focus="setActiveItem(index)"
                        class="w-full pl-12 pr-3.5 py-2 text-sm border border-slate-300 rounded-lg bg-white text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-primary focus:ring-2 focus:ring-blue-500/20 transition" />
                    </div>
                  </div>
                </div>

                <div>
                  <label
                    class="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1.5">Description</label>
                  <textarea v-model="item.description" rows="2" placeholder="Detailed description of the item..."
                    @focus="setActiveItem(index)"
                    class="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-lg bg-white text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-primary focus:ring-2 focus:ring-blue-500/20 transition"></textarea>
                </div>

                <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label class="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1.5">Duration
                      Value</label>
                    <input v-model.number="item.duration_value" type="number" min="1" required placeholder="e.g. 4"
                      class="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-lg bg-white text-slate-800 focus:outline-none focus:border-primary focus:ring-2 focus:ring-blue-500/20 transition" />
                  </div>
                  <div>
                    <label class="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1.5">Duration
                      Unit (Optional)</label>
                    <input v-model="item.duration_unit" type="text" list="duration-unit-options"
                      placeholder="e.g. month, hour, session"
                      class="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-lg bg-white text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-primary focus:ring-2 focus:ring-blue-500/20 transition" />
                  </div>
                  <div>
                    <label class="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1.5">Discount
                      (%)</label>
                    <div class="relative flex items-center">
                      <input v-model.number="item.discount_percentage" type="number" step="0.1" min="0" max="100"
                        placeholder="0" @focus="setActiveItem(index)"
                        class="w-full pr-8 pl-3.5 py-2 text-sm border border-slate-300 rounded-lg bg-white text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-primary focus:ring-2 focus:ring-blue-500/20 transition" />
                      <span class="absolute right-3 font-semibold text-slate-400 text-xs pointer-events-none">%</span>
                    </div>
                  </div>
                </div>

                <!-- Item calculation footer -->
                <div
                  class="pt-3 border-t border-slate-200 flex flex-wrap items-center justify-between gap-2 text-xs sm:text-sm text-text-secondary">
                  <div>
                    <template v-if="(item.discount_percentage || 0) > 0">
                      <span class="text-xs">
                        Original: {{ form.currency }} {{ getItemOriginalPrice(item).toLocaleString(undefined, {
                          minimumFractionDigits: 2
                        }) }}
                        &bull; Discount: {{ item.discount_percentage }}% (-{{ form.currency }} {{
                          getItemDiscountAmount(item).toLocaleString(undefined, { minimumFractionDigits: 2 }) }})
                      </span>
                    </template>
                  </div>
                  <div class="font-semibold text-text-primary ml-auto">
                    <span>Final Fee: </span>
                    <span class="text-primary font-bold font-numbers">
                      {{ form.currency }} {{ getItemTotalPrice(item).toLocaleString(undefined, {
                        minimumFractionDigits:
                          2
                      }) }}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <datalist id="duration-unit-options">
              <option v-for="unit in durationUnitSuggestions" :key="unit" :value="unit" />
            </datalist>
          </div>

          <!-- Section 4: Settings -->
          <div class="space-y-4">
            <div class="flex items-center gap-2 pb-3 border-b border-slate-200">
              <h3 class="text-base sm:text-lg font-bold text-text-primary">Settings</h3>
            </div>

            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label
                  class="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1.5">Currency</label>
                <select v-model="form.currency"
                  class="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-lg bg-white text-slate-800 focus:outline-none focus:border-primary focus:ring-2 focus:ring-blue-500/20 transition">
                  <option value="USD">USD ($)</option>
                  <option value="NGN">NGN (₦)</option>
                  <option value="GBP">GBP (£)</option>
                  <option value="EUR">EUR (€)</option>
                  <option value="CAD">CAD (C$)</option>
                </select>
              </div>
              <div>
                <label class="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1.5">Status</label>
                <select v-model="form.status"
                  class="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-lg bg-white text-slate-800 focus:outline-none focus:border-primary focus:ring-2 focus:ring-blue-500/20 transition">
                  <option value="pending">Pending (Awaiting Confirmation)</option>
                  <option value="draft">Save as Draft</option>
                </select>
              </div>
            </div>

            <!-- Tax Toggle (CAD/USD) -->
            <div v-if="['CAD', 'USD'].includes(form.currency)"
              class="flex items-center justify-between p-4 bg-slate-50 border border-slate-200 rounded-xl">
              <div>
                <div class="font-semibold text-sm text-slate-800">Include Taxes (GST)</div>
                <div class="text-xs text-text-secondary">Add GST percentage to the invoice total</div>
              </div>
              <label class="relative inline-flex items-center cursor-pointer">
                <input type="checkbox" v-model="form.include_tax" class="sr-only peer" />
                <div
                  class="w-11 h-6 bg-slate-300 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-blue-500/20 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary rounded-full">
                </div>
              </label>
            </div>

            <!-- Tax Options Input -->
            <div v-if="form.include_tax" class="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
              <label class="block text-xs font-semibold text-slate-600 uppercase tracking-wider">GST Percentage
                (%)</label>
              <input v-model.number="form.tax_percentage" type="number" step="0.01" min="0" max="100"
                placeholder="e.g. 5"
                class="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-lg bg-white text-slate-800 focus:outline-none focus:border-primary focus:ring-2 focus:ring-blue-500/20 transition" />
              <p class="text-xs text-text-secondary">Standard GST rate is 5% for Canada and varies for US.</p>
            </div>

            <!-- Recurring Toggle -->
            <div class="flex items-center justify-between p-4 bg-slate-50 border border-slate-200 rounded-xl">
              <div>
                <div class="font-semibold text-sm text-slate-800">Recurring Invoice</div>
                <div class="text-xs text-text-secondary">Automatically repeat this invoice on a schedule</div>
              </div>
              <label class="relative inline-flex items-center cursor-pointer">
                <input type="checkbox" v-model="form.is_recurring" class="sr-only peer" />
                <div
                  class="w-11 h-6 bg-slate-300 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-blue-500/20 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary rounded-full">
                </div>
              </label>
            </div>

            <!-- Recurrence Options -->
            <div v-if="form.is_recurring" class="p-4 sm:p-5 bg-slate-50 border border-slate-200 rounded-xl space-y-4">
              <div>
                <label
                  class="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-2">Frequency</label>
                <div class="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  <label v-for="freq in ['weekly', 'monthly', 'quarterly', 'yearly']" :key="freq"
                    class="flex items-center justify-center p-2.5 rounded-lg border text-xs font-semibold cursor-pointer transition capitalize text-center"
                    :class="form.recurrence_interval === freq ? 'border-primary bg-blue-50 text-primary ring-1 ring-primary' : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'">
                    <input type="radio" v-model="form.recurrence_interval" :value="freq" class="sr-only" />
                    <span>{{ freq }}</span>
                  </label>
                </div>
              </div>

              <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label class="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1.5">Next Invoice
                    Date
                    *</label>
                  <input v-model="form.next_invoice_date" type="date" required
                    class="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-lg bg-white text-slate-800 focus:outline-none focus:border-primary focus:ring-2 focus:ring-blue-500/20 transition" />
                  <p class="text-xs text-text-secondary mt-1">Date when next invoice will be generated.</p>
                </div>
                <div>
                  <label class="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1.5">End Date
                    (Optional)</label>
                  <input v-model="form.recurring_end_date" type="date"
                    class="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-lg bg-white text-slate-800 focus:outline-none focus:border-primary focus:ring-2 focus:ring-blue-500/20 transition" />
                  <p class="text-xs text-text-secondary mt-1">Recurring will stop after this date.</p>
                </div>
              </div>

              <div
                class="flex items-start gap-2.5 p-3.5 bg-blue-50 border border-blue-200 rounded-lg text-xs text-blue-900">
                <Info :size="16" class="shrink-0 mt-0.5 text-primary" />
                <p>
                  A new invoice will be generated and sent on the Next Invoice Date, repeating
                  every <strong>{{ form.recurrence_interval }}</strong> until the End Date (or indefinitely).
                </p>
              </div>
            </div>
          </div>

          <!-- Section 5: Notes -->
          <div class="space-y-4">
            <div class="flex items-center gap-2 pb-3 border-b border-slate-200">
              <h3 class="text-base sm:text-lg font-bold text-text-primary">Notes (Optional)</h3>
            </div>
            <div>
              <label class="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1.5">Short Note for
                Invoice</label>
              <textarea v-model="form.notes" rows="3" maxlength="500" 
                placeholder="Add a short note to include on the invoice (max 500 characters). This will appear below the items table in the PDF."
                class="w-full px-3.5 py-2 text-sm border border-slate-300 min-h-[4.5rem] rounded-lg bg-white text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-primary focus:ring-2 focus:ring-blue-500/20 transition"></textarea>
              <p class="text-xs text-text-secondary mt-1">This note will appear on the PDF invoice below the items
                table.</p>
            </div>
          </div>

          <!-- Form Action Buttons -->
          <div class="flex flex-col sm:flex-row items-center justify-end gap-3 pt-6 border-t border-slate-200">
            <router-link to="/"
              class="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 rounded-lg text-sm font-semibold transition">
              <ArrowLeft :size="16" />
              <span>Cancel</span>
            </router-link>
            <button type="submit"
              class="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-2.5 bg-primary hover:bg-primary-dark active:bg-primary-light text-white rounded-lg text-sm font-semibold shadow-sm hover:shadow transition disabled:opacity-60 disabled:cursor-not-allowed"
              :disabled="saving">
              <Loader2 v-if="saving" :size="16" class="animate-spin shrink-0" />
              <span>{{
                saving
                  ? "Processing..."
                  : isEdit
                    ? "Update Invoice"
                    : "Generate Invoice"
              }}</span>
            </button>
          </div>
        </form>
      </div>

      <!-- Preview / Summary Card -->
      <div class="lg:sticky lg:top-24 bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-5">
        <div class="flex items-center gap-2 pb-3 border-b border-slate-200">
          <h3 class="text-base font-bold text-text-primary">Summary</h3>
        </div>

        <div class="space-y-3.5 text-sm">
          <div class="flex items-center justify-between">
            <span class="text-xs font-semibold uppercase text-slate-400 tracking-wider">Subtotal</span>
            <span class="font-semibold text-slate-800 font-numbers">
              {{ form.currency }} {{ subtotal.toLocaleString(undefined, { minimumFractionDigits: 2 }) }}
            </span>
          </div>

          <div v-if="form.include_tax && form.tax_percentage > 0" class="flex items-center justify-between">
            <span class="text-xs font-semibold uppercase text-slate-400 tracking-wider">Tax ({{ form.tax_percentage
              }}%)</span>
            <span class="font-semibold text-slate-800 font-numbers">
              {{ form.currency }} {{ taxAmount.toLocaleString(undefined, { minimumFractionDigits: 2 }) }}
            </span>
          </div>

          <div class="pt-3 border-t border-slate-200">
            <div class="flex items-baseline justify-between">
              <span class="text-xs font-bold uppercase text-slate-400 tracking-wider">Total Amount</span>
              <span class="text-xl sm:text-2xl font-extrabold text-primary font-numbers">
                {{ form.currency }} {{ totalAmount.toLocaleString(undefined, { minimumFractionDigits: 2 }) }}
              </span>
            </div>
          </div>

          <div class="pt-3 border-t border-slate-200 space-y-2 text-xs">
            <div class="flex items-center justify-between">
              <span class="text-text-secondary">Recipient</span>
              <span class="font-medium text-slate-800 truncate max-w-[150px]">{{ form.recipient_name || "—" }}</span>
            </div>
            <div class="flex items-center justify-between">
              <span class="text-text-secondary">Line Items</span>
              <span class="font-medium text-slate-800">{{ form.items.length }} item(s)</span>
            </div>
            <div class="flex items-center justify-between">
              <span class="text-text-secondary">Schedule</span>
              <span class="font-medium text-slate-800 capitalize">
                {{ form.is_recurring ? "Recurring " + form.recurrence_interval : "One-time payment" }}
              </span>
            </div>
          </div>
        </div>

        <div
          class="flex items-start gap-2.5 p-3.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-600">
          <Info :size="16" class="shrink-0 mt-0.5 text-primary" />
          <p>PDF will be generated and emailed when you mark the invoice as sent from the dashboard.</p>
        </div>
      </div>
    </div>

    <!-- Service Templates Modal -->
    <div v-if="showTemplatesModal"
      class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs"
      @click.self="showTemplatesModal = false">
      <div
        class="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-lg w-full max-h-[85vh] flex flex-col overflow-hidden">
        <div class="flex items-center justify-between p-5 border-b border-slate-200">
          <div class="flex items-center gap-2">
            <h2 class="text-lg font-bold text-text-primary">Select Service Template</h2>
          </div>
          <button @click="showTemplatesModal = false"
            class="w-8 h-8 rounded-lg text-text-secondary hover:bg-slate-100 flex items-center justify-center transition"
            title="Close">
            <X :size="18" />
          </button>
        </div>

        <div class="p-5 overflow-y-auto space-y-3">
          <div v-if="serviceTemplates.length === 0"
            class="flex flex-col items-center justify-center py-12 text-slate-400 text-center">
            <Inbox :size="36" class="mb-2" />
            <p class="text-sm">No service templates available.</p>
          </div>
          <div v-else class="space-y-2.5">
            <div v-for="template in serviceTemplates" :key="template.id" @click="loadServiceTemplate(template)"
              class="p-4 rounded-xl border border-slate-200 hover:border-blue-500 hover:bg-blue-50/50 cursor-pointer transition space-y-1">
              <div class="flex items-center justify-between">
                <div class="flex items-center gap-2">
                  <strong class="text-sm font-bold text-text-primary">{{ template.item_name }}</strong>
                  <span
                    class="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-slate-100 text-slate-600">
                    {{ template.currency }}
                  </span>
                </div>
                <span class="font-bold text-primary text-sm">
                  {{ template.currency }} {{ Number(template.default_unit_price).toLocaleString(undefined, {
                    minimumFractionDigits: 2
                  }) }}
                </span>
              </div>
              <p v-if="template.description" class="text-xs text-text-secondary line-clamp-2">
                {{ template.description }}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
