// Corrections to the camera models generated from the Windows tool, measured on real cameras.
//
// T4.0CG (SigmaStar firmware) — tested on 2026-11-26 by writing a value and reading the camera menu:
//   Photo size: value 2 → 8M, 4 → 32M, 1 → 12M. The firmware keeps the older models' order
//               (24M, 12M, 8M, 5M) and adds 32M as value 4. The Windows tool's list is wrong.
//   PIR:        value 7 → L5, 2 → L0 (invalid). Level = value − 2, so L1–L9 are stored as 3–11.
// Options are listed in the camera's own menu order; `map` gives the value written for each.
(function (root) {
  const MODELS = root.WF_MODELS || require('./models.js');
  const fix = (modelKey, ctl, labels, map, defaultIndex) => {
    const m = MODELS[modelKey]; if (!m) return;
    const f = m.fields.find(x => x.ctl === ctl); if (!f) return;
    m.labels[ctl] = labels; f.map = map;
    if (defaultIndex != null) m.defaults[ctl] = defaultIndex;
  };
  fix('T4.0CG', 'cbImageSize', ['5M', '8M', '12M', '24M', '32M'], [3, 2, 1, 0, 4], 4);
  fix('T4.0CG', 'cbSensitivity', ['L1', 'L2', 'L3', 'L4', 'L5', 'L6', 'L7', 'L8', 'L9'], [3, 4, 5, 6, 7, 8, 9, 10, 11]);
  if (MODELS['T4.0CG']) MODELS['T4.0CG'].fixVersion = 2;
  if (typeof module !== 'undefined' && module.exports) module.exports = MODELS;
})(this);
