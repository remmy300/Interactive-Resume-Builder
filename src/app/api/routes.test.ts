import { Prisma } from "@prisma/client";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { createEmptyResume } from "@/lib/resume-schema";

const mocks = vi.hoisted(() => ({
  auth: vi.fn(),
  prisma: {
    application: { updateMany: vi.fn(), findFirstOrThrow: vi.fn(), deleteMany: vi.fn(), create: vi.fn() },
    resume: { updateMany: vi.fn(), findFirst: vi.fn(), findFirstOrThrow: vi.fn(), update: vi.fn() },
  },
}));

vi.mock("@/lib/auth", () => ({ auth: mocks.auth }));
vi.mock("@/lib/prisma", () => ({ prisma: mocks.prisma }));

import { DELETE as deleteApplication, PATCH as patchApplication } from "./applications/[id]/route";
import { POST as createApplication } from "./applications/route";
import { PATCH as patchResume } from "./resumes/[id]/route";
import { POST as shareResume } from "./resumes/[id]/share/route";

const ctx = (id: string) => ({ params: Promise.resolve({ id }) });
const jsonRequest = (body: unknown, method = "PATCH") =>
  new Request("http://localhost/api/test", {
    method,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

const resumeBody = (extra: Record<string, unknown> = {}) => ({
  title: "My CV",
  data: createEmptyResume(),
  ...extra,
});

beforeEach(() => {
  vi.clearAllMocks();
  mocks.auth.mockResolvedValue({ user: { id: "user-a", email: "a@example.com" } });
});

describe("authentication", () => {
  it("rejects signed-out requests with 401", async () => {
    mocks.auth.mockResolvedValue(null);
    const response = await patchApplication(jsonRequest({ company: "X" }), ctx("app-1"));
    expect(response.status).toBe(401);
    expect(mocks.prisma.application.updateMany).not.toHaveBeenCalled();
  });
});

describe("ownership", () => {
  it("scopes application updates to the signed-in user", async () => {
    mocks.prisma.application.updateMany.mockResolvedValue({ count: 0 });
    const response = await patchApplication(jsonRequest({ company: "Acme" }), ctx("app-of-b"));
    expect(response.status).toBe(404);
    expect(mocks.prisma.application.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: "app-of-b", userId: "user-a" } }),
    );
  });

  it("scopes application deletes to the signed-in user", async () => {
    mocks.prisma.application.deleteMany.mockResolvedValue({ count: 0 });
    const response = await deleteApplication(jsonRequest({}, "DELETE"), ctx("app-of-b"));
    expect(response.status).toBe(404);
    expect(mocks.prisma.application.deleteMany).toHaveBeenCalledWith({
      where: { id: "app-of-b", userId: "user-a" },
    });
  });

  it("does not let another user's resume be shared", async () => {
    mocks.prisma.resume.findFirst.mockResolvedValue(null);
    const response = await shareResume(jsonRequest({ enabled: true }, "POST"), ctx("resume-of-b"));
    expect(response.status).toBe(404);
    expect(mocks.prisma.resume.update).not.toHaveBeenCalled();
  });
});

describe("application validation", () => {
  it("rejects a non-http link with a specific message", async () => {
    const response = await createApplication(
      jsonRequest({ company: "Acme", role: "Dev", url: "javascript:alert(1)" }, "POST"),
      undefined,
    );
    expect(response.status).toBe(400);
    const body = (await response.json()) as { details: { url: string[] } };
    expect(body.details.url[0]).toMatch(/http/);
    expect(mocks.prisma.application.create).not.toHaveBeenCalled();
  });
});

describe("resume saves", () => {
  it("returns 409 when the resume changed elsewhere", async () => {
    mocks.prisma.resume.updateMany.mockResolvedValue({ count: 0 });
    mocks.prisma.resume.findFirst.mockResolvedValue({ id: "r1" });
    const response = await patchResume(
      jsonRequest(resumeBody({ updatedAt: "2026-01-01T00:00:00.000Z" })),
      ctx("r1"),
    );
    expect(response.status).toBe(409);
  });

  it("returns 404 when the resume does not exist for this user", async () => {
    mocks.prisma.resume.updateMany.mockResolvedValue({ count: 0 });
    mocks.prisma.resume.findFirst.mockResolvedValue(null);
    const response = await patchResume(jsonRequest(resumeBody()), ctx("r1"));
    expect(response.status).toBe(404);
  });

  it("rejects an unparseable updatedAt instead of skipping the conflict check", async () => {
    const response = await patchResume(jsonRequest(resumeBody({ updatedAt: "not-a-date" })), ctx("r1"));
    expect(response.status).toBe(400);
    expect(mocks.prisma.resume.updateMany).not.toHaveBeenCalled();
  });
});

describe("share links", () => {
  const owned = { id: "r1", isPublic: false, publicSlug: null };

  it("retries a slug collision", async () => {
    mocks.prisma.resume.findFirst.mockResolvedValue(owned);
    const collision = new Prisma.PrismaClientKnownRequestError("dup", {
      code: "P2002",
      clientVersion: "test",
    });
    mocks.prisma.resume.update
      .mockRejectedValueOnce(collision)
      .mockResolvedValueOnce({ isPublic: true, publicSlug: "abc" });
    const response = await shareResume(jsonRequest({ enabled: true }, "POST"), ctx("r1"));
    expect(response.status).toBe(200);
    expect(mocks.prisma.resume.update).toHaveBeenCalledTimes(2);
  });

  it("does not retry unrelated database errors", async () => {
    mocks.prisma.resume.findFirst.mockResolvedValue(owned);
    mocks.prisma.resume.update.mockRejectedValue(new Error("connection lost"));
    vi.spyOn(console, "error").mockImplementation(() => {});
    const response = await shareResume(jsonRequest({ enabled: true }, "POST"), ctx("r1"));
    expect(response.status).toBe(500);
    expect(mocks.prisma.resume.update).toHaveBeenCalledTimes(1);
  });
});
