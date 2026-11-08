/**
 * The copy button beside each install command, after the one on
 * https://residue.whiteheap.com. `data-copy` names the element that holds the
 * command and `data-copy-status` the live region that tells a screen reader
 * what happened. A click copies the command and the button reads "Copied" for
 * two seconds; where the browser refuses the clipboard, it selects the command
 * instead and reads "Selected".
 *
 * Without this script, or without the Clipboard API, the button stays hidden
 * and one click still selects the whole command (`user-select: all`). It loads
 * nothing and stores nothing.
 */
export function wireCopyButtons(): void {
  for (const button of document.querySelectorAll<HTMLButtonElement>("button[data-copy]")) {
    const source = document.getElementById(button.dataset.copy ?? "");
    const status = document.getElementById(button.dataset.copyStatus ?? "");
    const label = button.querySelector<HTMLElement>("[data-copy-label]");
    if (!source || !status || !label || !navigator.clipboard) continue;
    const idle = label.textContent ?? "";
    let reset = 0;
    const show = (text: string, state: "done" | "") => {
      label.textContent = text;
      status.textContent = text;
      button.dataset.state = state;
      window.clearTimeout(reset);
      reset = window.setTimeout(() => {
        label.textContent = idle;
        status.textContent = "";
        button.dataset.state = "";
      }, 2000);
    };
    button.addEventListener("click", () => {
      navigator.clipboard.writeText((source.textContent ?? "").trim()).then(
        () => show("Copied", "done"),
        () => {
          window.getSelection()?.selectAllChildren(source);
          show("Selected", "");
        },
      );
    });
    button.hidden = false;
  }
}
