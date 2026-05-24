import { NextResponse, type NextRequest } from "next/server";

function normalizePhone(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function getAllowedPhones(): string[] {
  return (process.env.ALLOWED_PHONE_NUMBERS || "")
    .split(",")
    .map((phone) => phone.trim())
    .filter((phone) => phone.length > 0);
}

function getAdminWechat(): string {
  return process.env.ADMIN_WECHAT?.trim() || "管理员";
}

export async function POST(request: NextRequest) {
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, message: "请求体必须是合法 JSON。" }, { status: 400 });
  }

  const phone = normalizePhone((body as { phone?: unknown })?.phone);

  if (!/^1\d{10}$/.test(phone)) {
    return NextResponse.json({ ok: false, message: "请输入正确的 11 位手机号。" }, { status: 400 });
  }

  const allowedPhones = getAllowedPhones();
  const adminWechat = getAdminWechat();

  if (allowedPhones.length === 0) {
    if (process.env.NODE_ENV !== "production") {
      return NextResponse.json({
        ok: true,
        phone,
        message: "当前未配置手机号白名单，本地开发模式已放行。"
      });
    }

    return NextResponse.json(
      { ok: false, message: "当前系统暂未配置开通名单，请联系管理员。" },
      { status: 403 }
    );
  }

  if (!allowedPhones.includes(phone)) {
    return NextResponse.json(
      {
        ok: false,
        message: `当前手机号暂未开通使用权限。如需开通，请联系管理员微信：${adminWechat}`
      },
      { status: 403 }
    );
  }

  return NextResponse.json({ ok: true, phone });
}
