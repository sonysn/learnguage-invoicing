<script setup lang="ts">
import { ref, watch } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { LogOut } from 'lucide-vue-next';

const router = useRouter();
const route = useRoute();
const isLoggedIn = ref(!!localStorage.getItem('access_token'));

watch(() => route.path, () => {
  isLoggedIn.value = !!localStorage.getItem('access_token');
});

const logout = () => {
  localStorage.removeItem('access_token');
  localStorage.removeItem('refresh_token');
  isLoggedIn.value = false;
  router.push('/login');
};
</script>

<template>
  <div class="min-h-screen flex flex-col bg-slate-50 text-slate-800">
    <nav v-if="isLoggedIn" class="sticky top-0 z-50 bg-white/95 backdrop-blur-xs border-b border-slate-200">
      <div
        class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3.5 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <!-- Brand -->
        <div class="flex items-center">
          <router-link to="/" class="flex items-center gap-3">
            <img src="https://learnguage.online/_nuxt/logo-light-sm.CbssCni5.png" alt="Learnguage" class="h-8 w-auto" />
            <span class="text-lg font-heading font-bold text-text-primary tracking-tight">Invoicing</span>
          </router-link>
        </div>

        <!-- Nav Links -->
        <div class="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-6 flex-wrap">
          <router-link to="/"
            class="inline-flex items-center gap-2 px-3 py-2 sm:px-0 sm:py-0 text-sm font-medium transition rounded-lg sm:rounded-none border sm:border-0 border-slate-200 sm:border-transparent bg-white sm:bg-transparent"
            :class="route.path === '/' ? 'text-primary font-semibold' : 'text-slate-600 hover:text-primary'">

            <span>Dashboard</span>
          </router-link>

          <router-link to="/service-templates"
            class="inline-flex items-center gap-2 px-3 py-2 sm:px-0 sm:py-0 text-sm font-medium transition rounded-lg sm:rounded-none border sm:border-0 border-slate-200 sm:border-transparent bg-white sm:bg-transparent"
            :class="route.path === '/service-templates' ? 'text-primary font-semibold' : 'text-slate-600 hover:text-primary'">

            <span>Service Templates</span>
          </router-link>



          <button @click="logout"
            class="inline-flex items-center justify-center gap-2 px-3 py-2 text-sm font-medium bg-neutral text-white rounded-md hover:opacity-90 transition cursor-pointer">
            <LogOut :size="16" />
            <span>Logout</span>
          </button>

        </div>
      </div>
    </nav>

    <main class="flex-1 py-8 sm:py-10 bg-background-light-surface">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <router-view />
      </div>
    </main>
  </div>
</template>
