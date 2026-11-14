<script setup lang="ts">
interface Props {
  name: 'account' | 'password' | 'security' | 'logo'
  size?: number
}

const props = withDefaults(defineProps<Props>(), { size: 22 })
</script>

<template>
  <svg
    :width="props.size"
    :height="props.size"
    viewBox="0 0 24 24"
    fill="none"
    aria-hidden="true"
  >
    <g v-if="props.name === 'account'">
      <circle cx="12" cy="7.7" r="3.9" fill="url(#login-icon-account-fill)" />
      <path d="M4.2 20.4c1-4 4.1-6 7.8-6s6.8 2 7.8 6c.2.9-.5 1.6-1.3 1.6H5.5c-.8 0-1.5-.7-1.3-1.6z" fill="url(#login-icon-account-fill)" />
      <defs>
        <linearGradient id="login-icon-account-fill" x1="4" y1="3.8" x2="20" y2="22" gradientUnits="userSpaceOnUse">
          <stop stop-color="#3E82FF" />
          <stop offset="1" stop-color="#2860E0" />
        </linearGradient>
      </defs>
    </g>

    <g v-else-if="props.name === 'password'">
      <path d="M7.4 10V8.6a4.6 4.6 0 0 1 9.2 0V10" stroke="url(#login-icon-password-fill)" stroke-width="2.1" stroke-linecap="round" />
      <rect x="4.6" y="10" width="14.8" height="11" rx="3.4" fill="url(#login-icon-password-fill)" />
      <path d="M10.1 15.5h3.8l-.7 2.9h-2.4z" fill="#fff" />
      <defs>
        <linearGradient id="login-icon-password-fill" x1="4" y1="4" x2="20" y2="21" gradientUnits="userSpaceOnUse">
          <stop stop-color="#3E82FF" />
          <stop offset="1" stop-color="#2860E0" />
        </linearGradient>
      </defs>
    </g>

    <g v-else-if="props.name === 'logo'">
      <path d="M12 1.8 21.4 7v10L12 22.2 2.6 17V7z" fill="url(#login-icon-logo-fill)" />
      <path d="M12 1.8 21.4 7 12 12.4 2.6 7z" fill="#63a4ff" opacity="0.9" />
      <path d="M12 12.4 21.4 17V7z" fill="#2054cc" opacity="0.62" />
      <path d="M12 8.1l4.4 2.5v5.1L12 18.2l-4.4-2.5v-5.1z" fill="#fff" />
      <path d="M12 10.4l2.5 1.4v2.9L12 16.2l-2.5-1.5v-2.9z" fill="#2d7bf5" />
      <defs>
        <linearGradient id="login-icon-logo-fill" x1="2.6" y1="1.8" x2="21.4" y2="22.2" gradientUnits="userSpaceOnUse">
          <stop stop-color="#6bb5ff" />
          <stop offset="1" stop-color="#2557d0" />
        </linearGradient>
      </defs>
    </g>

    <g v-else>
      <path d="M12 2.8l8 2.9v6c0 5-3.6 8.6-8 9.5-4.4-.9-8-4.5-8-9.5v-6z" fill="url(#login-icon-security-fill)" />
      <path d="M8.2 11.9l2.7 2.8 5-5.4" stroke="#fff" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round" />
      <defs>
        <linearGradient id="login-icon-security-fill" x1="4" y1="2.8" x2="20" y2="21.2" gradientUnits="userSpaceOnUse">
          <stop stop-color="#3E82FF" />
          <stop offset="1" stop-color="#2860E0" />
        </linearGradient>
      </defs>
    </g>
  </svg>
</template>
