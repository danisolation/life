import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import * as schema from "../src/lib/db/schema.ts";

const DEMO_EMAIL = "demo@lifeadmin.local";
const DEMO_PASSWORD = "demo1234";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.error("DATABASE_URL is not set. Run with: npm run db:seed");
  process.exit(1);
}

const pool = new Pool({ connectionString });
const db = drizzle(pool, { schema });

function atDay(offset: number, hour = 9): Date {
  const d = new Date();
  d.setHours(hour, 0, 0, 0);
  d.setDate(d.getDate() + offset);
  return d;
}

function isoDay(offset: number): string {
  return atDay(offset).toISOString().slice(0, 10);
}

async function main() {
  try {
    await pool.query("select 1");
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`\nCannot reach the database.\n  ${message}\n`);
    console.error("Start it with:");
    console.error(
      "  docker start life-admin-postgres    # or the full docker run from README\n"
    );
    process.exit(1);
  }

  const existing = await db.query.users.findFirst({
    where: eq(schema.users.email, DEMO_EMAIL),
  });

  if (existing) {
    const memberships = await db.query.householdMembers.findMany({
      where: eq(schema.householdMembers.userId, existing.id),
    });
    for (const m of memberships) {
      await db.delete(schema.households).where(eq(schema.households.id, m.householdId));
    }
    await db.delete(schema.users).where(eq(schema.users.id, existing.id));
    console.log("Removed the previous demo account and its data.");
  }

  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 12);

  const [user] = await db
    .insert(schema.users)
    .values({
      email: DEMO_EMAIL,
      name: "Nguyễn Văn An",
      passwordHash,
    })
    .returning();

  const [household] = await db
    .insert(schema.households)
    .values({ name: "Nhà của An", currency: "VND", locale: "vi-VN" })
    .returning();

  await db.insert(schema.householdMembers).values({
    householdId: household.id,
    userId: user.id,
    role: "admin",
  });

  const entityRows = await db
    .insert(schema.entities)
    .values([
      {
        type: "person",
        householdId: household.id,
        name: "Nguyễn Văn An",
        description: "Chủ hộ",
        attributes: { email: "an@example.com", phone: "0912345678", role: "owner" },
        createdBy: user.id,
      },
      {
        type: "person",
        householdId: household.id,
        name: "Trần Thị Bình",
        description: "Vợ",
        attributes: { email: "binh@example.com", phone: "0987654321", role: "member" },
        createdBy: user.id,
      },
      {
        type: "provider",
        householdId: household.id,
        name: "Viettel Telecom",
        attributes: { category: "Internet", hotline: "18008119", accountNumber: "VT-88213004" },
        createdBy: user.id,
      },
      {
        type: "provider",
        householdId: household.id,
        name: "EVN Hà Nội",
        attributes: { category: "Điện", customerCode: "PE12000456789" },
        createdBy: user.id,
      },
      {
        type: "asset",
        householdId: household.id,
        name: "Tủ lạnh Samsung Inverter 320L",
        description: "Mua tại Điện Máy Xanh, tầng 1",
        attributes: {
          brand: "Samsung",
          model: "RT32K5035S8",
          serialNumber: "SM-320-99812",
          purchaseDate: isoDay(-330),
          price: 8990000,
          currency: "VND",
          room: "Bếp",
        },
        createdBy: user.id,
      },
      {
        type: "asset",
        householdId: household.id,
        name: "MacBook Air M2 13 inch",
        attributes: {
          brand: "Apple",
          serialNumber: "C02XK1ABQ6L4",
          purchaseDate: isoDay(-200),
          price: 27990000,
          currency: "VND",
        },
        createdBy: user.id,
      },
      {
        type: "asset",
        householdId: household.id,
        name: "Xe máy Honda Vision",
        attributes: {
          brand: "Honda",
          plateNumber: "29-H1 123.45",
          purchaseDate: isoDay(-700),
          price: 34500000,
          currency: "VND",
        },
        createdBy: user.id,
      },
      {
        type: "subscription",
        householdId: household.id,
        name: "Netflix Premium",
        attributes: {
          amount: 260000,
          currency: "VND",
          billingCycle: "monthly",
          startedAt: isoDay(-410),
          nextBillingDate: isoDay(0),
          account: "an.nguyen@example.com",
        },
        createdBy: user.id,
      },
      {
        type: "subscription",
        householdId: household.id,
        name: "Spotify Family",
        attributes: {
          amount: 179000,
          currency: "VND",
          billingCycle: "monthly",
          startedAt: isoDay(-150),
          nextBillingDate: isoDay(11),
        },
        createdBy: user.id,
      },
      {
        type: "subscription",
        householdId: household.id,
        name: "iCloud+ 200GB",
        attributes: {
          amount: 59000,
          currency: "VND",
          billingCycle: "monthly",
          startedAt: isoDay(-620),
          nextBillingDate: isoDay(7),
        },
        createdBy: user.id,
      },
      {
        type: "subscription",
        householdId: household.id,
        name: "ChatGPT Plus",
        attributes: {
          amount: 500000,
          currency: "VND",
          billingCycle: "monthly",
          startedAt: isoDay(-95),
          nextBillingDate: isoDay(22),
          usage: "low",
        },
        createdBy: user.id,
      },
      {
        type: "warranty",
        householdId: household.id,
        name: "Bảo hành tủ lạnh Samsung",
        description: "24 tháng, bao gồm cả block máy nén",
        attributes: {
          provider: "Samsung Việt Nam",
          startDate: isoDay(-330),
          expiryDate: isoDay(3),
          durationMonths: 24,
          coverage: "parts_and_labor",
        },
        createdBy: user.id,
      },
      {
        type: "warranty",
        householdId: household.id,
        name: "Bảo hành MacBook Air",
        attributes: {
          provider: "Apple Care",
          startDate: isoDay(-200),
          expiryDate: isoDay(75),
          durationMonths: 12,
          coverage: "limited",
        },
        createdBy: user.id,
      },
      {
        type: "contract",
        householdId: household.id,
        name: "Hợp đồng Internet Viettel",
        description: "Gói Net6 Plus, cam kết 24 tháng",
        attributes: {
          contractCode: "VT-NET6-2024-88213",
          monthlyFee: 245000,
          currency: "VND",
          startDate: isoDay(-350),
          expiryDate: isoDay(18),
          autoRenew: true,
        },
        createdBy: user.id,
      },
      {
        type: "bill",
        householdId: household.id,
        name: "Hóa đơn điện tháng 9",
        attributes: {
          amount: 742000,
          currency: "VND",
          period: "2026-09",
          dueDate: isoDay(-2),
          usageKwh: 268,
          status: "unpaid",
        },
        createdBy: user.id,
      },
      {
        type: "bill",
        householdId: household.id,
        name: "Hóa đơn điện tháng 8",
        attributes: {
          amount: 688000,
          currency: "VND",
          period: "2026-08",
          dueDate: isoDay(-32),
          usageKwh: 251,
          status: "paid",
          paidAt: isoDay(-30),
        },
        createdBy: user.id,
      },
      {
        type: "purchase",
        householdId: household.id,
        name: "Mua tủ lạnh Samsung",
        attributes: {
          merchant: "Điện Máy Xanh",
          amount: 8990000,
          currency: "VND",
          purchaseDate: isoDay(-330),
          paymentMethod: "credit_card",
        },
        createdBy: user.id,
      },
    ])
    .returning();

  const byName = new Map(entityRows.map((e) => [e.name, e]));
  const id = (name: string) => {
    const found = byName.get(name);
    if (!found) throw new Error(`Seed bug: missing entity "${name}"`);
    return found.id;
  };

  await db.insert(schema.entityRelations).values([
    { fromEntityId: id("Tủ lạnh Samsung Inverter 320L"), toEntityId: id("Bảo hành tủ lạnh Samsung"), relationType: "HAS_WARRANTY" },
    { fromEntityId: id("Tủ lạnh Samsung Inverter 320L"), toEntityId: id("Mua tủ lạnh Samsung"), relationType: "HAS_RECEIPT" },
    { fromEntityId: id("MacBook Air M2 13 inch"), toEntityId: id("Bảo hành MacBook Air"), relationType: "HAS_WARRANTY" },
    { fromEntityId: id("Hợp đồng Internet Viettel"), toEntityId: id("Viettel Telecom"), relationType: "PROVIDED_BY" },
    { fromEntityId: id("Hóa đơn điện tháng 9"), toEntityId: id("EVN Hà Nội"), relationType: "PROVIDED_BY" },
    { fromEntityId: id("Hóa đơn điện tháng 8"), toEntityId: id("EVN Hà Nội"), relationType: "PROVIDED_BY" },
    { fromEntityId: id("Netflix Premium"), toEntityId: id("Nguyễn Văn An"), relationType: "PAID_BY" },
    { fromEntityId: id("Spotify Family"), toEntityId: id("Nguyễn Văn An"), relationType: "PAID_BY" },
    { fromEntityId: id("Xe máy Honda Vision"), toEntityId: id("Trần Thị Bình"), relationType: "BELONGS_TO" },
    { fromEntityId: id("Hợp đồng Internet Viettel"), toEntityId: id("Hóa đơn điện tháng 9"), relationType: "DEPENDS_ON" },
  ]);

  await db.insert(schema.documents).values([
    {
      entityId: id("Mua tủ lạnh Samsung"),
      householdId: household.id,
      uploadedBy: user.id,
      fileName: "hoa-don-dien-may-xanh.txt",
      fileUrl: "/api/files/hoa-don-dien-may-xanh.txt",
      fileType: "text/plain",
      fileSize: 412,
      extractedData: { merchant: "Điện Máy Xanh", amount: 8990000, purchasedAt: isoDay(-330) },
      confidence: { merchant: 0.97, amount: 0.94, purchasedAt: 0.81 },
      status: "completed",
    },
    {
      entityId: id("Hợp đồng Internet Viettel"),
      householdId: household.id,
      uploadedBy: user.id,
      fileName: "hop-dong-viettel-net6.txt",
      fileUrl: "/api/files/hop-dong-viettel-net6.txt",
      fileType: "text/plain",
      fileSize: 358,
      extractedData: { contractCode: "VT-NET6-2024-88213", monthlyFee: 245000 },
      confidence: { contractCode: 0.92, monthlyFee: 0.68 },
      status: "completed",
    },
    {
      entityId: id("Bảo hành tủ lạnh Samsung"),
      householdId: household.id,
      uploadedBy: user.id,
      fileName: "phieu-bao-hanh-samsung.txt",
      fileUrl: "/api/files/phieu-bao-hanh-samsung.txt",
      fileType: "text/plain",
      fileSize: 296,
      extractedData: { startDate: isoDay(-330), durationMonths: 24 },
      confidence: { startDate: 0.88, durationMonths: 0.55 },
      status: "completed",
    },
    {
      entityId: null,
      householdId: household.id,
      uploadedBy: user.id,
      fileName: "hoa-don-dien-thang-10.txt",
      fileUrl: "/api/files/hoa-don-dien-thang-10.txt",
      fileType: "text/plain",
      fileSize: 244,
      extractedData: {},
      confidence: {},
      status: "pending",
    },
    {
      entityId: null,
      householdId: household.id,
      uploadedBy: user.id,
      fileName: "anh-hoa-don-bi-mo.txt",
      fileUrl: "/api/files/anh-hoa-don-bi-mo.txt",
      fileType: "text/plain",
      fileSize: 198,
      extractedData: {},
      confidence: {},
      status: "failed",
    },
  ]);

  const taskRows = await db
    .insert(schema.tasks)
    .values([
      {
        householdId: household.id,
        entityId: id("Hợp đồng Internet Viettel"),
        title: "Gọi Viettel gia hạn hợp đồng internet",
        description: "Hợp đồng hết hạn sau 18 ngày. Hỏi gói cước tốt hơn trước khi gia hạn.",
        priority: "urgent",
        status: "pending",
        dueDate: atDay(2),
        assigneeId: user.id,
        ownerId: user.id,
        createdBy: user.id,
      },
      {
        householdId: household.id,
        entityId: id("Bảo hành tủ lạnh Samsung"),
        title: "Kiểm tra tủ lạnh trước khi hết bảo hành",
        description: "Bảo hành hết sau 3 ngày. Chạy thử chế độ làm đá và đo nhiệt độ ngăn mát.",
        priority: "high",
        status: "in_progress",
        dueDate: atDay(1),
        assigneeId: user.id,
        ownerId: user.id,
        createdBy: user.id,
      },
      {
        householdId: household.id,
        entityId: id("Netflix Premium"),
        title: "Thanh toán hóa đơn điện tháng 9",
        priority: "high",
        status: "pending",
        dueDate: atDay(-1),
        assigneeId: user.id,
        createdBy: user.id,
      },
      {
        householdId: household.id,
        entityId: id("ChatGPT Plus"),
        title: "So sánh gói Netflix và Spotify để cắt bớt",
        description: "ChatGPT Plus dùng ít. Cân nhắc gộp hoặc hủy.",
        priority: "medium",
        status: "pending",
        dueDate: atDay(9),
        ownerId: user.id,
        createdBy: user.id,
      },
      {
        householdId: household.id,
        title: "Sắp xếp hóa đơn giấy vào bìa hồ sơ",
        priority: "low",
        status: "pending",
        dueDate: atDay(21),
        assigneeId: user.id,
        createdBy: user.id,
      },
      {
        householdId: household.id,
        entityId: id("Hóa đơn điện tháng 8"),
        title: "Thanh toán hóa đơn điện tháng 8",
        priority: "medium",
        status: "completed",
        dueDate: atDay(-32),
        completedAt: atDay(-30),
        ownerId: user.id,
        createdBy: user.id,
      },
      {
        householdId: household.id,
        entityId: id("Spotify Family"),
        title: "Hủy Spotify Family",
        description: "Đổi ý, giữ lại gói gia đình.",
        priority: "low",
        status: "cancelled",
        createdBy: user.id,
      },
    ])
    .returning();

  const taskByName = new Map(taskRows.map((t) => [t.title, t]));

  await db.insert(schema.reminders).values([
    {
      householdId: household.id,
      entityId: id("Xe máy Honda Vision"),
      type: "deadline",
      title: "Bảo hiểm xe máy đã hết hạn",
      message: "Bảo hiểm TNDS bắt buộc hết hạn 5 ngày trước. Đi xe không bảo hiểm bị phạt.",
      triggerAt: atDay(-5),
      status: "scheduled",
    },
    {
      householdId: household.id,
      entityId: id("Hóa đơn điện tháng 9"),
      type: "deadline",
      title: "Hóa đơn điện tháng 9 quá hạn",
      message: "742.000đ, quá hạn 2 ngày. EVN có thể cắt điện sau 10 ngày.",
      triggerAt: atDay(-2),
      status: "scheduled",
    },
    {
      householdId: household.id,
      entityId: id("Netflix Premium"),
      type: "deadline",
      title: "Netflix Premium gia hạn hôm nay",
      message: "260.000đ sẽ được trừ hôm nay. Kiểm tra xem còn dùng không.",
      triggerAt: atDay(0),
      status: "scheduled",
    },
    {
      householdId: household.id,
      entityId: id("Bảo hành tủ lạnh Samsung"),
      type: "preparation",
      title: "Kiểm tra tủ lạnh trước khi hết bảo hành",
      message: "Còn 3 ngày bảo hành. Nếu có lỗi, gọi bảo hành ngay — sau đó sẽ mất phí.",
      triggerAt: atDay(1),
      status: "scheduled",
    },
    {
      householdId: household.id,
      entityId: id("iCloud+ 200GB"),
      type: "deadline",
      title: "iCloud+ 200GB gia hạn",
      message: "59.000đ. Dung lượng đã dùng 168GB — cân nhắc nâng gói.",
      triggerAt: atDay(7),
      status: "scheduled",
    },
    {
      householdId: household.id,
      entityId: id("Hợp đồng Internet Viettel"),
      type: "deadline",
      title: "Hợp đồng internet hết hạn",
      message: "Gói Net6 Plus hết hạn. Tự động gia hạn nếu không hủy trước 3 ngày.",
      triggerAt: atDay(18),
      status: "scheduled",
    },
    {
      householdId: household.id,
      entityId: id("ChatGPT Plus"),
      type: "follow_up",
      title: "Xem lại các gói subscription hàng tháng",
      message: "Tổng chi subscription hiện tại: 998.000đ/tháng.",
      triggerAt: atDay(25),
      status: "scheduled",
    },
    {
      householdId: household.id,
      entityId: id("Bảo hành MacBook Air"),
      type: "deadline",
      title: "Bảo hành MacBook Air hết hạn",
      message: "Apple Care hết hạn. Cân nhắc gia hạn trước ngày này.",
      triggerAt: atDay(75),
      status: "scheduled",
    },
    {
      householdId: household.id,
      entityId: id("Spotify Family"),
      type: "custom",
      title: "Nhắc hủy Spotify (đã bỏ)",
      triggerAt: atDay(4),
      status: "dismissed",
    },
    {
      householdId: household.id,
      taskId: taskByName.get("Gọi Viettel gia hạn hợp đồng internet")?.id ?? null,
      entityId: id("Hợp đồng Internet Viettel"),
      type: "preparation",
      title: "Chuẩn bị giấy tờ cho Viettel",
      message: "CMND/CCCD và hợp đồng cũ.",
      triggerAt: atDay(1, 14),
      status: "scheduled",
    },
  ]);

  await db.insert(schema.auditLogs).values([
    {
      actor: user.email,
      action: "entity.created",
      targetEntity: id("Tủ lạnh Samsung Inverter 320L"),
      targetType: "asset",
      reason: "Xác nhận từ hóa đơn Điện Máy Xanh",
      source: "hoa-don-dien-may-xanh.pdf",
      confidence: 92,
      householdId: household.id,
    },
    {
      actor: "ai",
      action: "extraction.completed",
      targetType: "document",
      reason: "Trích xuất 3 trường với độ tin cậy trung bình 0.88",
      source: "hop-dong-viettel-net6.jpg",
      confidence: 88,
      householdId: household.id,
    },
    {
      actor: user.email,
      action: "reminder.dismissed",
      targetType: "reminder",
      reason: "Đổi ý, giữ Spotify",
      householdId: household.id,
    },
  ]);

  const counts = {
    entities: entityRows.length,
    relations: 10,
    documents: 5,
    tasks: taskRows.length,
    reminders: 10,
    auditLogs: 3,
  };

  console.log("\nDemo data seeded.");
  console.log(`  email     ${DEMO_EMAIL}`);
  console.log(`  password  ${DEMO_PASSWORD}`);
  console.log(`  household ${household.name}`);
  console.log(
    `  seeded    ${Object.entries(counts)
      .map(([k, v]) => `${v} ${k}`)
      .join(", ")}`
  );
  console.log("\nDeadlines span overdue, today, this week, this month, later and dismissed.\n");

  await pool.end();
}

main().catch(async (error) => {
  console.error("\nSeed failed:", error);
  await pool.end();
  process.exit(1);
});
