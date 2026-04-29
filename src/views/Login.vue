<script setup lang="ts">
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import api from '../api';

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
      password: password.value
    });
    
    // The backend seems to return tokens based on the LoginView
    // If it's using SimpleJWT, it might be 'access' or just 'token'
    // Looking at the LoginView, it uses RefreshToken.for_user(user)
    
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
  <div class="login-view">
    <div class="login-card">
      <h2>Admin Login</h2>
      <p>Please log in to manage invoices.</p>
      
      <form @submit.prevent="handleLogin">
        <div v-if="error" class="error-msg">{{ error }}</div>
        
        <div class="form-group">
          <label>Email</label>
          <input v-model="email" type="email" required placeholder="admin@learnguage.online" />
        </div>
        
        <div class="form-group">
          <label>Password</label>
          <input v-model="password" type="password" required placeholder="••••••••" />
        </div>
        
        <button type="submit" class="btn-primary w-full" :disabled="loading">
          {{ loading ? 'Logging in...' : 'Login' }}
        </button>
      </form>
    </div>
  </div>
</template>

<style scoped>
.login-view {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 60vh;
  padding: 1rem 0;
}

.login-card {
  background: white;
  padding: 2.5rem;
  border-radius: 1rem;
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
  width: 100%;
  max-width: 400px;
}

h2 { margin-bottom: 0.5rem; text-align: center; color: #1e293b; }
p { margin-bottom: 2rem; text-align: center; color: #64748b; }

.form-group { margin-bottom: 1.5rem; }
label { display: block; font-size: 0.875rem; font-weight: 600; color: #475569; margin-bottom: 0.5rem; }

input {
  width: 100%;
  padding: 0.75rem;
  border: 1px solid #d1d5db;
  border-radius: 0.5rem;
  font-size: 1rem;
}

.error-msg {
  background-color: #fee2e2;
  color: #991b1b;
  padding: 0.75rem;
  border-radius: 0.5rem;
  margin-bottom: 1.5rem;
  font-size: 0.875rem;
  text-align: center;
}

.btn-primary {
  background-color: #2563eb;
  color: white;
  padding: 0.75rem;
  border: none;
  border-radius: 0.5rem;
  font-weight: 600;
  cursor: pointer;
  transition: background-color 0.2s;
}

.btn-primary:hover { background-color: #1d4ed8; }
.btn-primary:disabled { opacity: 0.7; cursor: not-allowed; }
.w-full { width: 100%; }

@media (max-width: 480px) {
  .login-card {
    padding: 1.5rem;
    border-radius: 0.875rem;
  }
}
</style>
