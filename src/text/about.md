Whiteheap builds open-source tools and infrastructure for agents, developers and security teams, all in Rust. Agents now write code, run commands and hold credentials on real machines, and most of the tools around them were built for one person at a keyboard. Whiteheap builds for that shift.

## Who builds it

Whiteheap is built by [Trevor I. Lasn](https://www.trevorlasn.com), who also builds [0xinsider](https://0xinsider.com). The work happens in the open at [github.com/whiteheap](https://github.com/whiteheap): the source of each tool and of this website.

## What we ship

- [residue](https://residue.whiteheap.com): reclaim your storage from Git worktrees, automatically and safely. residue removes a worktree only when nothing in it would be lost, whichever coding agent left it.

## How we build

Each tool is one binary with no runtime to install and as few dependencies as we can manage: residue depends on one crate, `libc`. We measure the CPU and memory a tool uses on each code change before it ships.

Every release carries SHA-256 checksums and a GitHub build-provenance attestation. To check that a release file is what Whiteheap built, run `gh attestation verify` on it with `--repo whiteheap/<tool>`. residue's source is under the MIT license.

## The name

Whiteheap joins white hat and heap. A white hat is a hacker who finds weaknesses so they can be fixed, and works in the open. The heap is the memory a program asks for while it runs.
