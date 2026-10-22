import { supabase } from "@/integrations/supabase/client";

interface PublicConnectors {
  meta_pixel_id: string | null;
  meta_pixel_on: boolean;
  ga4_id: string | null;
  ga4_on: boolean;
  gtm_id: string | null;
  gtm_on: boolean;
  tiktok_id: string | null;
  tiktok_on: boolean;
  stripe_pk: string | null;
}

declare global {
  interface Window {
    fbq?: (...args: unknown[]) => void;
    _fbq?: unknown;
    dataLayer?: unknown[];
    gtag?: (...args: unknown[]) => void;
    ttq?: { load: (id: string) => void; page: () => void };
    __stripePk?: string;
    __vetmedixConnectorsLoaded?: boolean;
  }
}

let loaded = false;

const injectMetaPixel = (id: string) => {
  if (window.fbq) return;
  /* eslint-disable */
  ((f: any, b: any, e: any, v: any, n?: any, t?: any, s?: any) => {
    if (f.fbq) return;
    n = f.fbq = function () {
      n.callMethod ? n.callMethod.apply(n, arguments) : n.queue.push(arguments);
    };
    if (!f._fbq) f._fbq = n;
    n.push = n;
    n.loaded = !0;
    n.version = "2.0";
    n.queue = [];
    t = b.createElement(e);
    t.async = !0;
    t.src = v;
    s = b.getElementsByTagName(e)[0];
    s.parentNode.insertBefore(t, s);
  })(window, document, "script", "https://connect.facebook.net/en_US/fbevents.js");
  /* eslint-enable */
  window.fbq?.("init", id);
  window.fbq?.("track", "PageView");

  // noscript fallback in body (CSP rule: not in head)
  const ns = document.createElement("noscript");
  const img = document.createElement("img");
  img.height = 1;
  img.width = 1;
  img.style.display = "none";
  img.src = `https://www.facebook.com/tr?id=${encodeURIComponent(id)}&ev=PageView&noscript=1`;
  ns.appendChild(img);
  document.body.appendChild(ns);
};

const injectGA4 = (id: string) => {
  if (window.gtag) return;
  const s = document.createElement("script");
  s.async = true;
  s.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(id)}`;
  document.head.appendChild(s);
  window.dataLayer = window.dataLayer || [];
  window.gtag = function gtag() {
    // eslint-disable-next-line prefer-rest-params
    window.dataLayer!.push(arguments);
  };
  window.gtag("js", new Date());
  window.gtag("config", id);
};

const injectGTM = (id: string) => {
  /* eslint-disable */
  ((w: any, d: any, s: any, l: any, i: any) => {
    w[l] = w[l] || [];
    w[l].push({ "gtm.start": new Date().getTime(), event: "gtm.js" });
    const f = d.getElementsByTagName(s)[0];
    const j = d.createElement(s);
    const dl = l !== "dataLayer" ? "&l=" + l : "";
    j.async = true;
    j.src = "https://www.googletagmanager.com/gtm.js?id=" + i + dl;
    f.parentNode.insertBefore(j, f);
  })(window, document, "script", "dataLayer", id);
  /* eslint-enable */
};

const injectTikTok = (id: string) => {
  /* eslint-disable */
  ((w: any, d: any, t: any) => {
    w.TiktokAnalyticsObject = t;
    const ttq: any = (w[t] = w[t] || []);
    ttq.methods = [
      "page",
      "track",
      "identify",
      "instances",
      "debug",
      "on",
      "off",
      "once",
      "ready",
      "alias",
      "group",
      "enableCookie",
      "disableCookie",
    ];
    ttq.setAndDefer = (t: any, e: any) => {
      t[e] = function () {
        t.push([e].concat(Array.prototype.slice.call(arguments, 0)));
      };
    };
    for (let i = 0; i < ttq.methods.length; i++) ttq.setAndDefer(ttq, ttq.methods[i]);
    ttq.instance = (t: any) => {
      const e = ttq._i[t] || [];
      for (let n = 0; n < ttq.methods.length; n++) ttq.setAndDefer(e, ttq.methods[n]);
      return e;
    };
    ttq.load = (e: any, n: any) => {
      const r = "https://analytics.tiktok.com/i18n/pixel/events.js";
      ttq._i = ttq._i || {};
      ttq._i[e] = [];
      ttq._i[e]._u = r;
      ttq._t = ttq._t || {};
      ttq._t[e] = +new Date();
      ttq._o = ttq._o || {};
      ttq._o[e] = n || {};
      const o = d.createElement("script");
      o.type = "text/javascript";
      o.async = !0;
      o.src = r + "?sdkid=" + e + "&lib=" + t;
      const a = d.getElementsByTagName("script")[0];
      a.parentNode.insertBefore(o, a);
    };
    ttq.load(id);
    ttq.page();
  })(window, document, "ttq");
  /* eslint-enable */
};

export async function loadPublicConnectors(): Promise<void> {
  if (loaded || window.__vetmedixConnectorsLoaded) return;
  loaded = true;
  window.__vetmedixConnectorsLoaded = true;

  try {
    const { data, error } = await supabase.rpc("get_public_connectors");
    if (error || !data) return;
    const c = data as unknown as PublicConnectors;

    if (c.meta_pixel_on && c.meta_pixel_id) injectMetaPixel(c.meta_pixel_id);
    if (c.ga4_on && c.ga4_id) injectGA4(c.ga4_id);
    if (c.gtm_on && c.gtm_id) injectGTM(c.gtm_id);
    if (c.tiktok_on && c.tiktok_id) injectTikTok(c.tiktok_id);
    if (c.stripe_pk) window.__stripePk = c.stripe_pk;
  } catch {
    // Silent fail — never break the app over analytics
  }
}
