<script setup lang="ts">
import { ref, watch } from 'vue';
import { useRouter, useRoute } from 'vue-router';

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
  <div class="app-wrapper">
    <nav class="top-nav" v-if="isLoggedIn">
      <div class="container nav-content">
        <div class="brand">
          <router-link to="/">
            <img src="https://learnguage.online/_nuxt/logo-light-sm.CbssCni5.png" alt="Learnguage" class="nav-logo" />
            <span class="brand-text">Invoicing</span>
          </router-link>
        </div>
        
        <div class="nav-links">
          <router-link to="/" class="nav-item">Dashboard</router-link>
          <router-link to="/service-templates" class="nav-item">Service Templates</router-link>
          <router-link to="/new" class="nav-item btn-create">Create Invoice</router-link>
          <button @click="logout" class="btn-logout">Logout</button>
        </div>
      </div>
    </nav>

    <main class="main-content">
      <div class="container">
        <router-view />
      </div>
    </main>
  </div>
</template>

<style scoped>
.app-wrapper {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}

.top-nav {
  background: white;
  border-bottom: 1px solid #e2e8f0;
  height: 72px;
  position: sticky;
  top: 0;
  z-index: 50;
}

.nav-content {
  display: flex;
  justify-content: space-between;
  align-items: center;
  height: 100%;
}

.brand a {
  display: flex;
  align-items: center;
  gap: 12px;
  text-decoration: none;
}

.nav-logo {
  height: 32px;
  width: auto;
}

.brand-text {
  font-size: 1.125rem;
  font-weight: 700;
  color: #0f172a;
  letter-spacing: -0.025em;
}

.nav-links {
  display: flex;
  align-items: center;
  gap: 2rem;
}

.nav-item {
  color: #475569;
  font-weight: 500;
  font-size: 0.875rem;
  transition: color 0.2s;
}

.nav-item:hover {
  color: #2563eb;
}

.router-link-active:not(.btn-create) {
  color: #2563eb;
  font-weight: 600;
}

.btn-create {
  background: #2563eb;
  color: white !important;
  padding: 0.625rem 1.25rem;
  border-radius: 0.5rem;
  font-weight: 600;
}

.btn-create:hover {
  background: #1d4ed8;
}

.btn-logout {
  background: none;
  border: none;
  color: #94a3b8;
  font-size: 0.875rem;
  font-weight: 500;
  cursor: pointer;
  padding: 0;
}

.btn-logout:hover {
  color: #ef4444;
}

.main-content {
  flex-grow: 1;
  padding: 3rem 0;
}

@media (prefers-color-scheme: dark) {
  .top-nav {
    background: #1e293b;
    border-bottom-color: #334155;
  }
  .brand-text {
    color: #f8fafc;
  }
  .nav-item {
    color: #94a3b8;
  }
  .nav-item:hover {
    color: #60a5fa;
  }
}
</style>
