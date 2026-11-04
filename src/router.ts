import { createRouter, createWebHistory } from "vue-router";
import { useAuthStore } from "@/stores/auth";
import { safeRedirect } from "@/utils/navigation";
import AppShell from "@/components/AppShell.vue";

const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: "/login",
      name: "login",
      component: () => import("@/views/LoginView.vue"),
      meta: { public: true, title: "登录" },
    },
    {
      path: "/",
      component: AppShell,
      children: [
        {
          path: "",
          name: "plans",
          component: () => import("@/views/PlanListView.vue"),
          meta: { title: "方案档案" },
        },
        {
          path: "plans/new",
          name: "plan-new",
          component: () => import("@/views/PlanCreateView.vue"),
          meta: { title: "新建方案" },
        },
        {
          path: "plans/:id/generating",
          name: "plan-generating",
          component: () => import("@/views/GeneratingView.vue"),
          meta: { title: "正在生成" },
        },
        {
          path: "plans/:id",
          name: "plan-detail",
          component: () => import("@/views/PlanDetailView.vue"),
          meta: { title: "方案详情" },
        },
      ],
    },
    {
      path: "/plans/:id/print",
      name: "plan-print",
      component: () => import("@/views/PrintView.vue"),
      meta: { title: "打印方案" },
    },
    {
      path: "/:pathMatch(.*)*",
      redirect: "/",
    },
  ],
  scrollBehavior(to, _from, savedPosition) {
    if (savedPosition) return savedPosition;
    if (to.hash) return { el: to.hash, behavior: "smooth" };
    return { top: 0 };
  },
});

router.beforeEach(async (to) => {
  const auth = useAuthStore();
  const isPublic = Boolean(to.meta.public);

  if (isPublic) {
    if (auth.token) {
      return safeRedirect(to.query.redirect);
    }
    return true;
  }

  if (!auth.token) {
    return { name: "login", query: { redirect: to.fullPath } };
  }

  if (!auth.user) {
    try {
      await auth.fetchMe();
    } catch {
      auth.clear();
      return { name: "login", query: { redirect: to.fullPath } };
    }
  }

  return true;
});

router.afterEach((to) => {
  const base = "活动智囊";
  const title = to.meta.title as string | undefined;
  document.title = title ? `${title} · ${base}` : `${base} · 活动方案工作台`;
});

export default router;
