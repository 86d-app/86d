# 86d

## 0.0.43

### Patch Changes

- Clean a Module's distribution directory before compiling. The release pipeline now also validates and cleans every publishable distribution before a forced build that cannot restore cached stale files, so deleted source cannot survive in published output.

- Updated dependencies [[`f616f95`](https://github.com/86d-app/86d/commit/f616f9585a4a717afa5d9517f033e92cffcf84d4)]:
  - @86d-app/registry@0.0.43
