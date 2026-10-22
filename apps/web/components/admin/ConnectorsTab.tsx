import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Banknote,
  BarChart3,
  CreditCard,
  MessageSquare,
  Truck,
  Wallet,
  Webhook,
} from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { settingsApi } from "@/lib/api/settings";
import { ConnectorCard, ConnectorField } from "./ConnectorCard";

// ------- Types -------
export interface ConnectorsSettings {
  delivery: {
    steadfast: { enabled: boolean; api_key: string; secret_key: string };
    pathao: { enabled: boolean; client_id: string; client_secret: string; base_url: string };
    redx: { enabled: boolean; api_token: string };
    ecourier: { enabled: boolean; user_id: string; token: string };
  };
  payment: {
    cod: { enabled: boolean };
    sslcommerz: { enabled: boolean; store_id: string; store_password: string; sandbox: boolean };
    bkash: {
      enabled: boolean;
      app_key: string;
      app_secret: string;
      username: string;
      password: string;
      sandbox: boolean;
    };
    nagad: {
      enabled: boolean;
      merchant_id: string;
      public_key: string;
      private_key: string;
      sandbox: boolean;
    };
    stripe: { enabled: boolean; publishable_key: string; secret_key: string };
  };
  analytics: {
    meta_pixel: { enabled: boolean; pixel_id: string; capi_token: string };
    ga4: { enabled: boolean; measurement_id: string };
    gtm: { enabled: boolean; container_id: string };
    tiktok: { enabled: boolean; pixel_id: string };
  };
  comms: {
    twilio: { enabled: boolean; account_sid: string; auth_token: string; from_number: string };
    sendgrid: { enabled: boolean; api_key: string; from_email: string };
    webhook: { enabled: boolean; url: string };
  };
}

const DEFAULTS: ConnectorsSettings = {
  delivery: {
    steadfast: { enabled: false, api_key: "", secret_key: "" },
    pathao: {
      enabled: false,
      client_id: "",
      client_secret: "",
      base_url: "https://api-hermes.pathao.com",
    },
    redx: { enabled: false, api_token: "" },
    ecourier: { enabled: false, user_id: "", token: "" },
  },
  payment: {
    cod: { enabled: true },
    sslcommerz: { enabled: false, store_id: "", store_password: "", sandbox: true },
    bkash: {
      enabled: false,
      app_key: "",
      app_secret: "",
      username: "",
      password: "",
      sandbox: true,
    },
    nagad: { enabled: false, merchant_id: "", public_key: "", private_key: "", sandbox: true },
    stripe: { enabled: false, publishable_key: "", secret_key: "" },
  },
  analytics: {
    meta_pixel: { enabled: false, pixel_id: "", capi_token: "" },
    ga4: { enabled: false, measurement_id: "" },
    gtm: { enabled: false, container_id: "" },
    tiktok: { enabled: false, pixel_id: "" },
  },
  comms: {
    twilio: { enabled: false, account_sid: "", auth_token: "", from_number: "" },
    sendgrid: { enabled: false, api_key: "", from_email: "" },
    webhook: { enabled: false, url: "" },
  },
};

// Deep merge so missing keys fall back to defaults
const merge = <T,>(base: T, overlay: Partial<T> | undefined): T => {
  if (!overlay) return base;
  const out = { ...base } as Record<string, unknown>;
  for (const k of Object.keys(overlay)) {
    const bv = (base as Record<string, unknown>)[k];
    const ov = (overlay as Record<string, unknown>)[k];
    if (
      bv &&
      typeof bv === "object" &&
      !Array.isArray(bv) &&
      ov &&
      typeof ov === "object" &&
      !Array.isArray(ov)
    ) {
      out[k] = merge(bv, ov as Record<string, unknown>);
    } else if (ov !== undefined) {
      out[k] = ov;
    }
  }
  return out as T;
};

export type ConnectorGroup = "delivery" | "payment" | "analytics" | "comms";

export const ConnectorsTab = ({
  sections = ["delivery", "payment", "analytics", "comms"] as ConnectorGroup[],
}: {
  sections?: ConnectorGroup[];
}) => {
  const show = (g: ConnectorGroup) => sections.includes(g);
  const queryClient = useQueryClient();
  const [config, setConfig] = useState<ConnectorsSettings>(DEFAULTS);
  const [savingKey, setSavingKey] = useState<string | null>(null);

  const { data } = useQuery({
    queryKey: ["admin-connectors"],
    queryFn: async () => {
      const res = await settingsApi.getKey<Partial<ConnectorsSettings>>("connectors");
      return res.data?.value || null;
    },
  });

  useEffect(() => {
    if (data) setConfig(merge(DEFAULTS, data));
  }, [data]);

  const saveMutation = useMutation({
    mutationFn: async (next: ConnectorsSettings) => {
      await settingsApi.post({ key: "connectors", value: next });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-connectors"] });
      toast.success("Connector saved");
    },
    onError: () => toast.error("Failed to save connector"),
    onSettled: () => setSavingKey(null),
  });

  // Generic helpers — group is "delivery" | "payment" | "analytics" | "comms"
  const updateConnector = <
    G extends keyof ConnectorsSettings,
    K extends keyof ConnectorsSettings[G],
  >(
    group: G,
    name: K,
    patch: Partial<ConnectorsSettings[G][K]>,
  ) => {
    setConfig((prev) => ({
      ...prev,
      [group]: {
        ...prev[group],
        [name]: { ...prev[group][name], ...patch },
      },
    }));
  };

  const save = (id: string) => {
    setSavingKey(id);
    saveMutation.mutate(config);
  };

  // ----- Field definitions -----
  const steadfastFields: ConnectorField[] = [
    { key: "api_key", label: "API Key", secret: true, placeholder: "Steadfast API key" },
    { key: "secret_key", label: "Secret Key", secret: true, placeholder: "Steadfast secret" },
  ];
  const pathaoFields: ConnectorField[] = [
    { key: "client_id", label: "Client ID", placeholder: "Pathao client ID" },
    { key: "client_secret", label: "Client Secret", secret: true },
    { key: "base_url", label: "Base URL", placeholder: "https://api-hermes.pathao.com" },
  ];
  const redxFields: ConnectorField[] = [{ key: "api_token", label: "API Token", secret: true }];
  const ecourierFields: ConnectorField[] = [
    { key: "user_id", label: "User ID" },
    { key: "token", label: "API Token", secret: true },
  ];

  const sslFields: ConnectorField[] = [
    { key: "store_id", label: "Store ID", placeholder: "your_store_id" },
    { key: "store_password", label: "Store Password", secret: true },
    { key: "sandbox", label: "Sandbox / Test mode", type: "switch" },
  ];
  const bkashFields: ConnectorField[] = [
    { key: "app_key", label: "App Key" },
    { key: "app_secret", label: "App Secret", secret: true },
    { key: "username", label: "Username" },
    { key: "password", label: "Password", secret: true },
    { key: "sandbox", label: "Sandbox mode", type: "switch" },
  ];
  const nagadFields: ConnectorField[] = [
    { key: "merchant_id", label: "Merchant ID" },
    { key: "public_key", label: "Public Key", secret: true },
    { key: "private_key", label: "Private Key", secret: true },
    { key: "sandbox", label: "Sandbox mode", type: "switch" },
  ];
  const stripeFields: ConnectorField[] = [
    { key: "publishable_key", label: "Publishable Key", placeholder: "pk_live_..." },
    { key: "secret_key", label: "Secret Key", secret: true, placeholder: "sk_live_..." },
  ];

  const metaFields: ConnectorField[] = [
    { key: "pixel_id", label: "Pixel ID", placeholder: "1234567890" },
    { key: "capi_token", label: "CAPI Access Token (optional)", secret: true },
  ];
  const ga4Fields: ConnectorField[] = [
    { key: "measurement_id", label: "Measurement ID", placeholder: "G-XXXXXXXXXX" },
  ];
  const gtmFields: ConnectorField[] = [
    { key: "container_id", label: "Container ID", placeholder: "GTM-XXXXXXX" },
  ];
  const tiktokFields: ConnectorField[] = [
    { key: "pixel_id", label: "Pixel ID", placeholder: "CXXXXXXXXXXXXXXXXXX" },
  ];

  const twilioFields: ConnectorField[] = [
    { key: "account_sid", label: "Account SID" },
    { key: "auth_token", label: "Auth Token", secret: true },
    { key: "from_number", label: "From Number", placeholder: "+8801XXXXXXXXX" },
  ];
  const sendgridFields: ConnectorField[] = [
    { key: "api_key", label: "API Key", secret: true, placeholder: "SG.xxxx" },
    { key: "from_email", label: "From Email", placeholder: "noreply@vetmedixbd.com" },
  ];
  const webhookFields: ConnectorField[] = [
    { key: "url", label: "Webhook URL", placeholder: "https://hooks.example.com/orders" },
  ];

  const cardProps = <G extends keyof ConnectorsSettings, K extends keyof ConnectorsSettings[G]>(
    group: G,
    name: K,
    fields: ConnectorField[],
  ) => {
    const v = config[group][name] as unknown as Record<string, string | boolean>;
    const id = `${String(group)}.${String(name)}`;
    return {
      enabled: Boolean(v.enabled),
      onEnabledChange: (next: boolean) =>
        updateConnector(group, name, { enabled: next } as unknown as Partial<
          ConnectorsSettings[G][K]
        >),
      fields,
      values: v,
      onChange: (key: string, value: string | boolean) =>
        updateConnector(group, name, { [key]: value } as unknown as Partial<
          ConnectorsSettings[G][K]
        >),
      onSave: () => save(id),
      saving: savingKey === id && saveMutation.isPending,
    };
  };

  return (
    <div className="space-y-6">
      {/* Helper notice */}
      <div className="rounded-xl border border-border/50 bg-muted/30 p-3 sm:p-4 text-xs sm:text-sm text-muted-foreground">
        Credentials are stored securely and only accessible by admins. Turn a service on, fill in
        its details, then press Save.
      </div>

      {/* DELIVERY */}
      {show("delivery") && (
        <section className="space-y-3">
          <div className="flex items-center gap-2 px-1">
            <Truck className="h-4 w-4 text-primary" />
            <h3 className="text-sm sm:text-base font-semibold uppercase tracking-wide">
              Delivery Partners
            </h3>
          </div>
          <ConnectorCard
            icon={Truck}
            title="Steadfast"
            description="Bangladesh courier — currently active in shipment flow"
            badge={
              <Badge variant="secondary" className="text-[10px]">
                In use
              </Badge>
            }
            {...cardProps("delivery", "steadfast", steadfastFields)}
          />
          <ConnectorCard
            icon={Truck}
            title="Pathao Courier"
            description="Same-day delivery across major cities"
            {...cardProps("delivery", "pathao", pathaoFields)}
          />
          <ConnectorCard
            icon={Truck}
            title="RedX"
            description="Nationwide parcel delivery"
            {...cardProps("delivery", "redx", redxFields)}
          />
          <ConnectorCard
            icon={Truck}
            title="eCourier"
            description="Door-to-door delivery service"
            {...cardProps("delivery", "ecourier", ecourierFields)}
          />
        </section>
      )}

      {/* PAYMENT */}
      {show("payment") && (
        <section className="space-y-3">
          <div className="flex items-center gap-2 px-1">
            <CreditCard className="h-4 w-4 text-primary" />
            <h3 className="text-sm sm:text-base font-semibold uppercase tracking-wide">
              Payment Gateways
            </h3>
          </div>

          <Card className="shadow-sm border-border/50">
            <CardHeader className="p-3 sm:p-4 lg:p-5">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3">
                  <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-lg bg-gradient-to-br from-primary/15 to-primary/5 flex items-center justify-center">
                    <Banknote className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
                  </div>
                  <div>
                    <CardTitle className="text-base sm:text-lg flex items-center gap-2">
                      Cash on Delivery
                      <Badge variant="secondary" className="text-[10px]">
                        Default
                      </Badge>
                    </CardTitle>
                    <CardDescription className="text-xs sm:text-sm">
                      No credentials required
                    </CardDescription>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    updateConnector("payment", "cod", { enabled: !config.payment.cod.enabled });
                    setSavingKey("payment.cod");
                    saveMutation.mutate({
                      ...config,
                      payment: { ...config.payment, cod: { enabled: !config.payment.cod.enabled } },
                    });
                  }}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                    config.payment.cod.enabled
                      ? "bg-green-500/15 text-green-700 dark:text-green-400"
                      : "bg-muted text-muted-foreground"
                  }`}
                >
                  {config.payment.cod.enabled ? "Enabled" : "Disabled"}
                </button>
              </div>
            </CardHeader>
          </Card>

          <ConnectorCard
            icon={CreditCard}
            title="SSLCommerz"
            description="Bangladesh's largest payment aggregator (cards, mobile banking, net banking)"
            {...cardProps("payment", "sslcommerz", sslFields)}
          />
          <ConnectorCard
            icon={Wallet}
            title="bKash"
            description="Mobile financial service — direct merchant API"
            {...cardProps("payment", "bkash", bkashFields)}
          />
          <ConnectorCard
            icon={Wallet}
            title="Nagad"
            description="Bangladesh Post mobile payment service"
            {...cardProps("payment", "nagad", nagadFields)}
          />
          <ConnectorCard
            icon={CreditCard}
            title="Stripe"
            description="International card payments"
            {...cardProps("payment", "stripe", stripeFields)}
          />
        </section>
      )}

      {/* ANALYTICS */}
      {show("analytics") && (
        <section className="space-y-3">
          <div className="flex items-center gap-2 px-1">
            <BarChart3 className="h-4 w-4 text-primary" />
            <h3 className="text-sm sm:text-base font-semibold uppercase tracking-wide">
              Analytics & Marketing
            </h3>
          </div>
          <ConnectorCard
            icon={BarChart3}
            title="Meta (Facebook) Pixel"
            description="Track visits, conversions and run retargeting ads on Facebook & Instagram"
            {...cardProps("analytics", "meta_pixel", metaFields)}
          />
          <ConnectorCard
            icon={BarChart3}
            title="Google Analytics 4"
            description="Website traffic and behavior analytics"
            {...cardProps("analytics", "ga4", ga4Fields)}
          />
          <ConnectorCard
            icon={BarChart3}
            title="Google Tag Manager"
            description="Manage all marketing tags in one place"
            {...cardProps("analytics", "gtm", gtmFields)}
          />
          <ConnectorCard
            icon={BarChart3}
            title="TikTok Pixel"
            description="Track conversions for TikTok Ads campaigns"
            {...cardProps("analytics", "tiktok", tiktokFields)}
          />
        </section>
      )}

      {/* COMMS */}
      {show("comms") && (
        <section className="space-y-3">
          <div className="flex items-center gap-2 px-1">
            <MessageSquare className="h-4 w-4 text-primary" />
            <h3 className="text-sm sm:text-base font-semibold uppercase tracking-wide">
              Communication & Webhooks
            </h3>
          </div>
          <ConnectorCard
            icon={MessageSquare}
            title="Twilio SMS"
            description="Send order confirmations and OTPs via SMS"
            {...cardProps("comms", "twilio", twilioFields)}
          />
          <ConnectorCard
            icon={MessageSquare}
            title="SendGrid Email"
            description="Transactional emails (order receipts, password reset)"
            {...cardProps("comms", "sendgrid", sendgridFields)}
          />
          <ConnectorCard
            icon={Webhook}
            title="Custom Webhook"
            description="POST order events to any URL (Zapier, Make.com, your CRM)"
            {...cardProps("comms", "webhook", webhookFields)}
          />
        </section>
      )}
    </div>
  );
};
