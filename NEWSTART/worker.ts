import { calculateDamage, getConstants } from "./src/server/calculator.js";

// === 安全防護設定：允許的前端網域清單 (白名單) ===
// 部署前端後，請務必將下方的網址換成你真實的前端網域 (不包含結尾的斜線)
const ALLOWED_ORIGINS = [
  "*"
];

// 動態產生 CORS Headers，根據請求來源動態放行
function getCorsHeaders(requestOrigin: string | null) {
  const isAllowed = ALLOWED_ORIGINS.includes("*") || (requestOrigin && ALLOWED_ORIGINS.includes(requestOrigin));
  return {
    "Access-Control-Allow-Origin": isAllowed ? (requestOrigin || "*") : ALLOWED_ORIGINS[0],
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Max-Age": "86400",
  };
}

export default {
  async fetch(request: Request, env: any, ctx: any): Promise<Response> {
    
    // --- 安全防護：取得請求的來源 (Origin) 或推薦人 (Referer) ---
    const rawOrigin = request.headers.get("Origin") || request.headers.get("Referer");
    let requestOrigin = null;

    if (rawOrigin) {
      try {
        requestOrigin = new URL(rawOrigin).origin;
      } catch (e) {
        requestOrigin = null;
      }
    }

    const corsHeaders = getCorsHeaders(requestOrigin);
    const isAllowed = ALLOWED_ORIGINS.includes("*") || (requestOrigin && ALLOWED_ORIGINS.includes(requestOrigin));

    // --- 1. 處理 OPTIONS 預檢請求 (CORS Preflight) ---
    if (request.method === "OPTIONS") {
      if (!isAllowed) {
        return new Response(null, { status: 403, headers: corsHeaders });
      }
      return new Response(null, {
        status: 204,
        headers: corsHeaders,
      });
    }

    // --- 2. 來源網域檢查 (Origin/Referer Check) 攔截惡意刷 API ---
    if (!isAllowed) {
      console.warn(`Blocked suspicious request from origin: ${requestOrigin}`);
      return new Response(JSON.stringify({ error: "Forbidden: Access Denied" }), {
        status: 403,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    const rawUrl = new URL(request.url);
    const normalizedPath = rawUrl.pathname.replace(/\/+/g, '/');

    try {
      // --- 3. API 路由判斷 (白名單允許後才會執行到這裡) ---

      // 健康檢查 / 測試用
      if (normalizedPath === "/api/health" && request.method === "GET") {
        return new Response(JSON.stringify({ status: "ok" }), {
          headers: { "Content-Type": "application/json", ...corsHeaders },
        });
      }

      // 取得常數與技能、武器資料
      if (normalizedPath === "/api/constants" && request.method === "GET") {
        const constants = getConstants();
        return new Response(JSON.stringify(constants), {
          headers: { "Content-Type": "application/json", ...corsHeaders },
        });
      }

      // 核心傷害計算
      if (normalizedPath === "/api/calculate" && request.method === "POST") {
        const body = await request.json();
        const result = calculateDamage(body);
        return new Response(JSON.stringify(result), {
          headers: { "Content-Type": "application/json", ...corsHeaders },
        });
      }

      // 找不到對應路由 (Fallback 404)
      return new Response(JSON.stringify({ error: "Not Found" }), { 
        status: 404,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });

    } catch (error) {
      // 例外錯誤處理
      console.error("Worker Execution Error:", error);
      return new Response(JSON.stringify({ error: "Internal Server Error" }), {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }
  }
};
