import { extractInviteTokenFromInput, extractInviteTokenFromUrl } from "./inviteToken";

describe("extractInviteTokenFromInput", () => {
  it("extracts the token from a full invite link", () => {
    expect(
      extractInviteTokenFromInput("https://taskflow-mu-lac.vercel.app/?inviteToken=abc123"),
    ).toBe("abc123");
  });

  it("stops at the next query parameter", () => {
    expect(
      extractInviteTokenFromInput(
        "https://taskflow-mu-lac.vercel.app/?inviteToken=abc123&utm_source=email",
      ),
    ).toBe("abc123");
  });

  it("decodes URI-encoded characters in the token", () => {
    expect(extractInviteTokenFromInput("taskflow://?inviteToken=abc%2Bdef")).toBe("abc+def");
  });

  it("falls back to the trimmed raw input when there is no inviteToken marker", () => {
    expect(extractInviteTokenFromInput("  raw-token-value  ")).toBe("raw-token-value");
  });

  it("returns an empty string for empty input", () => {
    expect(extractInviteTokenFromInput("   ")).toBe("");
  });
});

describe("extractInviteTokenFromUrl", () => {
  it("extracts the token from a deep link URL", () => {
    expect(extractInviteTokenFromUrl("taskflow://?inviteToken=xyz789")).toBe("xyz789");
  });

  it("returns null when the URL has no inviteToken marker", () => {
    expect(extractInviteTokenFromUrl("taskflow://some/other/path")).toBeNull();
  });

  it("returns null for a bare token with no marker, unlike the input variant", () => {
    expect(extractInviteTokenFromUrl("just-a-token")).toBeNull();
  });
});
