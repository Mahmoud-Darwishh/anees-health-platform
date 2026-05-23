type WapilotSendPayload = {
  chatId: string;
  text: string;
  priority?: number;
  sendAt?: string;
};

type WapilotResponseBody = {
  data: unknown;
  rawText: string;
};

export type WapilotSendResult = {
  ok: boolean;
  status: number;
  body: WapilotResponseBody;
};

const DEFAULT_BASE_URL = 'https://api.wapilot.net/api/v2';
const DEFAULT_COUNTRY_CODE = '20';

function readEnv(value: string | undefined): string {
  if (!value) return '';
  const trimmed = value.trim();

  if (
    (trimmed.startsWith('"') && trimmed.endsWith('"'))
    || (trimmed.startsWith("'") && trimmed.endsWith("'"))
  ) {
    return trimmed.slice(1, -1).trim();
  }

  return trimmed;
}

function getConfig() {
  const baseUrl = readEnv(process.env.WAPILOT_BASE_URL);
  const token = readEnv(process.env.WAPILOT_API_TOKEN);
  const instanceId = readEnv(process.env.WAPILOT_INSTANCE_ID);
  const countryCode = readEnv(process.env.WAPILOT_DEFAULT_COUNTRY_CODE);

  return {
    baseUrl: (baseUrl || DEFAULT_BASE_URL).replace(/\/+$/, ''),
    token,
    instanceId,
    defaultCountryCode: (countryCode || DEFAULT_COUNTRY_CODE).replace(/\D/g, ''),
  };
}

function parseBody(rawText: string): unknown {
  if (!rawText.trim()) return null;

  try {
    return JSON.parse(rawText);
  } catch {
    return rawText;
  }
}

function applyCountryCode(rawDigits: string, defaultCountryCode: string): string {
  if (rawDigits.startsWith('00')) return rawDigits.slice(2);
  if (rawDigits.startsWith('0')) return `${defaultCountryCode}${rawDigits.slice(1)}`;
  return rawDigits;
}

export function isWapilotConfigured(): boolean {
  const config = getConfig();
  return Boolean(config.token && config.instanceId);
}

/**
 * Accepts either a WhatsApp chat id (e.g. 201001001001@c.us)
 * or a raw phone number and returns a canonical chat id.
 */
export function normalizeWhatsAppChatId(input: string): string | null {
  const config = getConfig();
  const trimmed = input.trim().toLowerCase();
  if (!trimmed) return null;

  if (trimmed.endsWith('@c.us')) {
    const digits = trimmed.slice(0, -5).replace(/\D/g, '');
    if (digits.length < 8 || digits.length > 15) return null;
    return `${digits}@c.us`;
  }

  const digits = applyCountryCode(trimmed.replace(/\D/g, ''), config.defaultCountryCode || DEFAULT_COUNTRY_CODE);
  if (digits.length < 8 || digits.length > 15) return null;
  return `${digits}@c.us`;
}

export function maskWhatsAppChatId(chatId: string): string {
  const digits = chatId.replace('@c.us', '');
  if (digits.length <= 4) return `***${digits}`;
  return `${'*'.repeat(Math.max(3, digits.length - 4))}${digits.slice(-4)}@c.us`;
}

export async function sendWapilotTextMessage(payload: WapilotSendPayload): Promise<WapilotSendResult> {
  const config = getConfig();

  if (!config.token || !config.instanceId) {
    return {
      ok: false,
      status: 503,
      body: {
        data: { message: 'Wapilot credentials are missing.' },
        rawText: '',
      },
    };
  }

  const endpoint = `${config.baseUrl}/${encodeURIComponent(config.instanceId)}/send-message`;
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      token: config.token,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      chat_id: payload.chatId,
      text: payload.text,
      priority: payload.priority,
      send_at: payload.sendAt,
    }),
    cache: 'no-store',
  });

  const rawText = await response.text();

  return {
    ok: response.ok,
    status: response.status,
    body: {
      data: parseBody(rawText),
      rawText,
    },
  };
}
