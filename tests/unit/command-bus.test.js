/**
 * Test Suite: Command Bus Functionality
 */

import { CommandBus } from "../../platform/commands/command-bus.js";

export async function runCommandBusTests() {
  const results = [];
  const bus = new CommandBus();

  // Test 1: Register command
  try {
    bus.register({
      id: "test.edit.action",
      category: "test",
      label: "Thao tác thử nghiệm",
      shortcut: "Ctrl+T",
      isToggle: true
    });
    const def = bus.getDefinition("test.edit.action");
    if (def && def.id === "test.edit.action" && def.label === "Thao tác thử nghiệm") {
      results.push({ name: "CommandBus.register: Lưu đúng định nghĩa", pass: true });
    } else {
      results.push({ name: "CommandBus.register: Lưu sai định nghĩa", pass: false });
    }
  } catch (e) {
    results.push({ name: "CommandBus.register lỗi: " + e.message, pass: false });
  }

  // Test 2: Bind handler and execute
  try {
    let executedWith = null;
    bus.bindHandler("test.edit.action", (args) => {
      executedWith = args;
      return true;
    });

    const res = await bus.execute("test.edit.action", { val: 123 });
    if (res === true && executedWith && executedWith.val === 123) {
      results.push({ name: "CommandBus.execute: Thực thi handler và truyền đúng tham số", pass: true });
    } else {
      results.push({ name: "CommandBus.execute: Không thực thi đúng", pass: false });
    }
  } catch (e) {
    results.push({ name: "CommandBus.execute lỗi: " + e.message, pass: false });
  }

  // Test 3: Disabled command must not execute
  try {
    bus.updateState("test.edit.action", { enabled: false });
    let ranWhenDisabled = false;
    bus.bindHandler("test.edit.action", () => {
      ranWhenDisabled = true;
    });

    const res = await bus.execute("test.edit.action");
    if (res === false && !ranWhenDisabled) {
      results.push({ name: "CommandBus: Lệnh disabled không được phép thực thi", pass: true });
    } else {
      results.push({ name: "CommandBus: Lệnh disabled vẫn bị thực thi", pass: false });
    }
  } catch (e) {
    results.push({ name: "CommandBus disabled test lỗi: " + e.message, pass: false });
  }

  // Test 4: Subscribe listener
  try {
    bus.updateState("test.edit.action", { enabled: true });
    let receivedState = null;
    const unsub = bus.subscribe((cmdId, state) => {
      if (cmdId === "test.edit.action") receivedState = state;
    });

    bus.updateState("test.edit.action", { checked: true });
    unsub();

    if (receivedState && receivedState.checked === true) {
      results.push({ name: "CommandBus.subscribe: Lắng nghe và nhận đúng trạng thái thay đổi", pass: true });
    } else {
      results.push({ name: "CommandBus.subscribe: Không nhận được sự kiện", pass: false });
    }
  } catch (e) {
    results.push({ name: "CommandBus subscribe test lỗi: " + e.message, pass: false });
  }

  return results;
}
