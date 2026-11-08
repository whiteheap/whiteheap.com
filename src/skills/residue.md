# residue

residue removes a linked Git worktree only when nothing in it would be lost, whichever coding agent left it. Git does the delete, with `git worktree remove`, never `--force`. A pass is not a guarantee, and age alone does not mean inactive.

Use it for worktrees that any tool, or you, left behind. It does not create worktrees and it does not merge branches: Worktrunk does. It needs `git` 2.36 or later, on macOS, Linux or FreeBSD. Windows is not supported.

## Install

```sh
curl -fsSL https://residue.whiteheap.com/install.sh | sh
```

On macOS and Linux this also turns on automatic cleanup, whose removals delete without the trash. To install residue without it: `brew install whiteheap/tap/residue`.

## Check a worktree

`residue scan` and `residue explain PATH` report each linked worktree as `candidate`, `keep`, `unknown` or `stale`, and delete nothing. Only a `candidate`, where every check passed, is ever removed.

## Remove a worktree at the end of a task

Run this from outside the worktree:

```sh
residue remove --yes --json "$WORKTREE"
```

- Exit status 0: the worktree is gone.
- Exit status 3: it is still there, or an expired trash entry of its repository could not be purged. `results[].result` says which. `results[].reason` and `results[].worktree.checks` say why, with stable check ids.

Do not run it on a worktree another session may still use.

Add `--trash` to keep the worktree restorable for `--keep-trash` (default seven days); exit status 0 then means it is in the trash. Without `--trash`, the removal leaves a removal record, `results[].removal_record`, and `residue restore` recreates the worktree from it on its branch and HEAD for `--keep-removed` (default 30 days), without the ignored files the deletion took. The branch, every commit and the stash always stay.

## Each result

| `results[].result` | Meaning |
| --- | --- |
| `removed` | `git worktree remove` removed it |
| `trashed` | It was moved to the trash |
| `refused` | A check did not pass, so residue did not try to remove it |
| `skipped` | residue did not remove it: nobody confirmed, or a check found a change since the plan |
| `failed` | Git refused the removal, or a Git query during the re-check failed; `reason` says what to run |
| `invalid` | The path is not a linked worktree residue may remove, such as the main checkout |
| `not_attempted` | residue stopped before it reached this path |

## Docs

- [README](https://raw.githubusercontent.com/whiteheap/residue-cli/main/README.md): every command, what it deletes and keeps, and its limits.
- [Command and configuration reference](https://raw.githubusercontent.com/whiteheap/residue-cli/main/docs/reference.md): `--json` fields, exit codes and regenerable rules.
- [residue's llms.txt](https://residue.whiteheap.com/llms.txt): every doc, linked as markdown.
- [Source](https://github.com/whiteheap/residue-cli), under the MIT license.
