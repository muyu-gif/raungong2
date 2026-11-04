import { onBeforeUnmount, onMounted, ref } from "vue";
import { checkHealth } from "@/api/auth";

export type ServiceStatus = "checking" | "online" | "offline";

export function useServiceStatus() {
  const status = ref<ServiceStatus>("checking");
  let timer: number | undefined;
  let mounted = true;

  async function check() {
    if (status.value === "checking") {
      try {
        await checkHealth();
        status.value = "online";
        return;
      } catch {
        status.value = "offline";
        return;
      }
    }

    try {
      await checkHealth();
      if (mounted) status.value = "online";
    } catch {
      if (mounted) status.value = "offline";
    }
  }

  onMounted(() => {
    void check();
    timer = window.setInterval(() => void check(), 60_000);
  });

  onBeforeUnmount(() => {
    mounted = false;
    if (timer) window.clearInterval(timer);
  });

  return { status, check };
}
