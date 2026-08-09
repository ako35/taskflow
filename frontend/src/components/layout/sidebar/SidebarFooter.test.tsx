import React from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import SidebarFooter from "./SidebarFooter";

function renderFooter(
  overrides: Partial<React.ComponentProps<typeof SidebarFooter>> = {},
) {
  return render(
    <SidebarFooter
      viewMode="workspaces"
      settingsMenuOpen
      themeMenuOpen
      themeMode="dark"
      invitationsOverview={{ pending: [], accepted: [] }}
      invitationsLoading={false}
      invitationsError={null}
      settingsInviteEmail=""
      settingsInviteSending={false}
      settingsInviteStatus={null}
      removingMemberUserId={null}
      settingsMenuRef={{ current: null }}
      onSetArchiveView={() => {}}
      onToggleSettingsMenu={() => {}}
      onToggleThemeMenu={() => {}}
      onSetThemeMode={() => {}}
      onOpenMembersPanel={() => {}}
      onSettingsInviteEmailChange={() => {}}
      onSendSettingsInvite={() => {}}
      onRemoveWorkspaceMember={() => {}}
      onSignOut={() => {}}
      {...overrides}
    />,
  );
}

describe("SidebarFooter theme menu", () => {
  it("expands theme options and marks the active one", async () => {
    const user = userEvent.setup();
    renderFooter();

    expect(screen.queryByRole("button", { name: "Açık" })).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /Tema/i }));

    const lightOption = screen.getByRole("button", { name: "Açık" });
    const darkOption = screen.getByRole("button", { name: "Koyu" });

    expect(lightOption).toHaveAttribute("aria-pressed", "false");
    expect(darkOption).toHaveAttribute("aria-pressed", "true");
  });
});
