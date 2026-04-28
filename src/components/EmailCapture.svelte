<script lang="ts">
  let email = '';
  let state: 'idle' | 'loading' | 'success' | 'error' = 'idle';
  let errorMsg = '';

  async function submit(e: Event) {
    e.preventDefault();
    if (!email.includes('@')) return;
    state = 'loading';
    try {
      const res = await fetch('/api/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      if (res.ok) {
        state = 'success';
      } else {
        const data = await res.json();
        errorMsg = data.error || 'Something went wrong.';
        state = 'error';
      }
    } catch {
      errorMsg = 'Could not connect. Try again.';
      state = 'error';
    }
  }
</script>

{#if state === 'success'}
  <div class="text-center py-4">
    <div class="text-2xl mb-2">⚡</div>
    <p class="text-emerald-400 font-semibold">You're on the list.</p>
    <p class="text-slate-400 text-sm mt-1">We'll let you know when we launch.</p>
  </div>
{:else}
  <form on:submit={submit} class="flex flex-col sm:flex-row gap-3 w-full max-w-md mx-auto">
    <input
      type="email"
      bind:value={email}
      placeholder="your@email.com"
      required
      disabled={state === 'loading'}
      class="flex-1 px-4 py-3 rounded-xl bg-[#0f172a] border border-[#1e293b] text-white placeholder-slate-500 text-sm focus:outline-none focus:border-emerald-500 transition-colors disabled:opacity-50"
    />
    <button
      type="submit"
      disabled={state === 'loading' || !email}
      class="px-6 py-3 rounded-xl font-semibold text-sm text-white transition-all disabled:opacity-40 cursor-pointer disabled:cursor-not-allowed"
      style="background: linear-gradient(135deg, #10b981, #2563eb);"
    >
      {state === 'loading' ? 'Sending…' : 'Notify me'}
    </button>
  </form>
  {#if state === 'error'}
    <p class="text-red-400 text-sm text-center mt-2">{errorMsg}</p>
  {/if}
{/if}
