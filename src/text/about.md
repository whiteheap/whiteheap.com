Whiteheap builds open-source tools and infrastructure for agents, developers and security teams. Agents now write code, run commands and hold credentials on real machines, but most developer tools were made for a person typing commands, not an agent running them. Whiteheap builds for that shift.

## Who builds it

Whiteheap is built by [Trevor I. Lasn](https://www.trevorlasn.com), who also builds [0xinsider](https://0xinsider.com). The work happens in the open at [github.com/whiteheap](https://github.com/whiteheap): the source of each tool and of this website.

## What we ship

- [residue](https://residue.whiteheap.com): reclaim your storage from Git worktrees, automatically and safely. residue removes a worktree only when nothing in it would be lost, whichever coding agent left it.
- [residue-ui](https://github.com/whiteheap/residue-ui): reclaim your storage from Git worktrees, in a Mac app. Every check, size and removal in its window comes from the residue CLI, and nothing moves to the trash until you confirm the plan residue shows.

## How we build

No tool needs a runtime installed first, and each has as few dependencies as we can manage: residue is one binary that depends on one crate, `libc`, and residue-ui is a Tauri app with residue inside. We measure the CPU and memory a tool uses on each code change before it ships.

Every release carries SHA-256 checksums and a GitHub build-provenance attestation. To check that a release file is what Whiteheap built, run `gh attestation verify` on it; [residue's install guide](https://github.com/whiteheap/residue-cli/blob/main/docs/installation.md#release-archives-and-packages) and [residue-ui's README](https://github.com/whiteheap/residue-ui#check-a-download) have the exact command. The source of both is under the MIT license.

## The name

Whiteheap joins white hat and heap. A white hat is a hacker who finds weaknesses so they can be fixed, and works in the open. The heap is the memory a program asks for while it runs.
