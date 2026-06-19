import "@testing-library/jest-dom";
import { renderHook, act } from "@testing-library/react";
import { useBrowserNotification } from "@/hooks/useBrowserNotification";

const mockRequestPermission = jest.fn();
const MockNotification = jest.fn().mockImplementation((_title: string, _opts?: NotificationOptions) => ({
  onclick: null,
}));
(MockNotification as unknown as { requestPermission: jest.Mock }).requestPermission = mockRequestPermission;

function setupNotification(permission: NotificationPermission) {
  Object.defineProperty(MockNotification, "permission", {
    get: () => permission,
    configurable: true,
  });
  Object.defineProperty(window, "Notification", {
    value: MockNotification,
    writable: true,
    configurable: true,
  });
}

beforeEach(() => {
  jest.clearAllMocks();
});

describe("useBrowserNotification", () => {
  it("chiama requestPermission al mount quando permission è 'default'", () => {
    setupNotification("default");
    mockRequestPermission.mockResolvedValue("granted");
    renderHook(() => useBrowserNotification());
    expect(mockRequestPermission).toHaveBeenCalledTimes(1);
  });

  it("non chiama requestPermission quando permission è già 'granted'", () => {
    setupNotification("granted");
    renderHook(() => useBrowserNotification());
    expect(mockRequestPermission).not.toHaveBeenCalled();
  });

  it("non chiama requestPermission quando permission è 'denied'", () => {
    setupNotification("denied");
    renderHook(() => useBrowserNotification());
    expect(mockRequestPermission).not.toHaveBeenCalled();
  });

  it("notify crea Notification con body 'Distillato pronto' per DONE", () => {
    setupNotification("granted");
    const { result } = renderHook(() => useBrowserNotification());
    act(() => {
      result.current.notify("Energia solare", "DONE", "job-1");
    });
    expect(MockNotification).toHaveBeenCalledWith("Energia solare", {
      body: "Distillato pronto",
      tag: "job-1",
    });
  });

  it("notify crea Notification con body 'Elaborazione fallita' per FAILED", () => {
    setupNotification("granted");
    const { result } = renderHook(() => useBrowserNotification());
    act(() => {
      result.current.notify("Energia solare", "FAILED", "job-2");
    });
    expect(MockNotification).toHaveBeenCalledWith("Energia solare", {
      body: "Elaborazione fallita",
      tag: "job-2",
    });
  });

  it("notify non crea Notification quando permission è 'denied'", () => {
    setupNotification("denied");
    const { result } = renderHook(() => useBrowserNotification());
    act(() => {
      result.current.notify("Energia solare", "DONE", "job-3");
    });
    expect(MockNotification).not.toHaveBeenCalled();
  });

  it("onclick sulla notifica è impostato e chiama window.focus", () => {
    setupNotification("granted");
    let capturedInstance: { onclick: (() => void) | null } | null = null;
    MockNotification.mockImplementationOnce((_title: string, _opts?: NotificationOptions) => {
      capturedInstance = { onclick: null };
      return capturedInstance;
    });

    const focusSpy = jest.spyOn(window, "focus").mockImplementation(() => {});

    const { result } = renderHook(() => useBrowserNotification());
    act(() => {
      result.current.notify("Energia solare", "DONE", "job-onclick");
    });

    expect(capturedInstance).not.toBeNull();
    expect(capturedInstance!.onclick).toBeInstanceOf(Function);
    // jsdom non implementa la navigazione — sopprimi il warning atteso
    const consoleSpy = jest.spyOn(console, "error").mockImplementation(() => {});
    act(() => { capturedInstance!.onclick!(); });
    consoleSpy.mockRestore();
    expect(focusSpy).toHaveBeenCalled();

    focusSpy.mockRestore();
  });
});
