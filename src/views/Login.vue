<script setup lang="ts">
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { Mail, Lock, AlertCircle, Loader2 } from 'lucide-vue-next';
import api from '../api';
import { PLATFORM_TAG } from '../../constants/platform';

const router = useRouter();
const email = ref('');
const password = ref('');
const loading = ref(false);
const error = ref('');

const handleLogin = async () => {
  try {
    loading.value = true;
    error.value = '';

    const response = await api.post('/login', {
      email: email.value,
      password: password.value,
      platform_tag: PLATFORM_TAG
    });

    const { access_token, refresh_token } = response.data;

    if (access_token) {
      localStorage.setItem('access_token', access_token);
    }
    if (refresh_token) {
      localStorage.setItem('refresh_token', refresh_token);
    }

    router.push('/');
  } catch (err: any) {
    error.value = err.response?.data?.message || 'Login failed. Please check your credentials.';
    console.error(err);
  } finally {
    loading.value = false;
  }
};
</script>

<template>
  <div class="flex justify-center items-center min-h-[60vh] py-6 px-4">
    <div class="w-full max-w-[420px] bg-white rounded-2xl shadow-lg border border-slate-200/80 p-6 sm:p-10">
      <div
        class="w-14 h-14 text-primary rounded-full flex items-center justify-center mx-auto mb-5 py-4">
        <img src="https://learnguage.online/_nuxt/logo-light-sm.CbssCni5.png" alt="Learnguage" class="h-14 w-auto" />
      </div>
      <h2 class="text-2xl font-bold text-center text-slate-800 mb-1">Admin Login</h2>
      <p class="text-sm text-center text-text-secondary mb-6">Please log in to manage invoices.</p>

      <form @submit.prevent="handleLogin" class="space-y-4">
        <div v-if="error"
          class="flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 p-3.5 rounded-lg text-sm">
          <AlertCircle :size="18" class="shrink-0 text-red-600" />
          <span>{{ error }}</span>
        </div>

        <div>
          <label class="block text-sm font-semibold text-slate-700 mb-1.5">Email</label>
          <div class="relative flex items-center">
            <Mail :size="18" class="absolute left-3.5 text-slate-400 pointer-events-none" />
            <input v-model="email" type="email" required placeholder="admin@learnguage.online"
              class="w-full pl-10 pr-3.5 py-2.5 text-sm border border-slate-300 rounded-lg bg-white text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-primary  transition" />
          </div>
        </div>

        <div>
          <label class="block text-sm font-semibold text-slate-700 mb-1.5">Password</label>
          <div class="relative flex items-center">
            <Lock :size="18" class="absolute left-3.5 text-slate-400 pointer-events-none" />
            <input v-model="password" type="password" required placeholder="••••••••"
              class="w-full pl-10 pr-3.5 py-2.5 text-sm border border-slate-300 rounded-lg bg-white text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-primary  transition" />
          </div>
        </div>

        <button type="submit"
          class="w-full flex items-center justify-center gap-2 bg-primary hover:bg-primary-dark active:bg-primary-light text-white font-semibold py-2.5 px-4 rounded-lg shadow-sm hover:shadow transition disabled:opacity-60 disabled:cursor-not-allowed pt-3 pb-3"
          :disabled="loading">
          <Loader2 v-if="loading" :size="18" class="animate-spin shrink-0" />
        
          <span>{{ loading ? 'Logging in...' : 'Login' }}</span>
        </button>
      </form>
    </div>
  </div>
</template>
