import { fireEvent, render, screen } from "@testing-library/react-native";
import Button from "./Button";
import { ThemeProvider } from "../theme/ThemeContext";

function renderWithTheme(ui: React.ReactElement) {
  return render(<ThemeProvider>{ui}</ThemeProvider>);
}

describe("Button", () => {
  it("renders the given title", async () => {
    await renderWithTheme(<Button title="Kaydet" onPress={() => {}} />);
    expect(screen.getByText("Kaydet")).toBeTruthy();
  });

  it("calls onPress when tapped", async () => {
    const onPress = jest.fn();
    await renderWithTheme(<Button title="Kaydet" onPress={onPress} />);
    fireEvent.press(screen.getByText("Kaydet"));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it("does not call onPress when disabled", async () => {
    const onPress = jest.fn();
    await renderWithTheme(<Button title="Kaydet" onPress={onPress} disabled />);
    fireEvent.press(screen.getByText("Kaydet"));
    expect(onPress).not.toHaveBeenCalled();
  });

  it("shows a loading indicator instead of the title while loading", async () => {
    await renderWithTheme(<Button title="Kaydet" onPress={() => {}} loading />);
    expect(screen.queryByText("Kaydet")).toBeNull();
  });
});
