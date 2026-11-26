// Corrections to the camera models generated from the Windows tool, measured on real cameras.
//
// T4.0CG (SigmaStar firmware) — tested on 2026-11-26 by writing a value and reading the camera menu:
//   Photo size: value 2 → 8M, 4 → 32M, 1 → 12M. The firmware keeps the older models' order
//               (24M, 12M, 8M, 5M) and adds 32M as value 4. The Windows tool's list is wrong.
//   PIR:        value 7 → L5, 2 → L0 (invalid). Level = value − 2, so L1–L9 are stored as 3–11.
//   Date Type / Hour System (last two "Other" entries): unchanged for every value written — the
//               firmware only reads the first 17 "Other" entries (same as the 4.0P firmware).
//   Password:   the switch is applied, the 6 digits are not (tested as text and as numbers).
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
  //   Video size: 1 → HD, 2 (WVGA) → camera falls back to FHD. The T only has FHD and HD.
  fix('T4.0CG', 'cbVideoSize', ['FHD', 'HD'], [0, 1]);
  if (MODELS['T4.0CG']) MODELS['T4.0CG'].fixVersion = 3;

  // T4.0CG: show the editor the way the camera's own menu is laid out (from photos of the menu).
  // Items are [setting, name on the camera]. Settings not listed appear under "Not on this camera's menu".
  const ONCAM = 'This camera ignores this setting from the card — set it in the camera menu.';
  if (MODELS['T4.0CG']) {
    MODELS['T4.0CG'].labels.cbPicSize = ['Small', 'Bigger', 'HD'];
    MODELS['T4.0CG'].layout = [
      { title: 'Cam', groups: [{ items: [
        ['cbCameraID', 'Cam ID'], ['cbCameraMode', 'Camera Mode'], ['cbFlashRange', 'Flash Power'],
        ['cbImageSize', 'Photo Size'], ['cbMultiShot', 'Multi Shot'], ['cbVideoSize', 'Video Size'], ['cbVideoLenght', 'Video Length']] }] },
      { title: 'PIR', groups: [{ items: [
        ['cbPIRSwitch', 'PIR Switch'], ['cbSensitivity', 'PIR Sensitivity'], ['cbDelay', 'PIR Delay'],
        ['cbTimeLapse', 'Time Lapse'], ['cbTimer', 'Timer 1'], ['cbTimer2', 'Timer 2']] }] },
      { title: '4G', groups: [
        { items: [['cbSIMAutoMatch', 'SIM Auto Match']] },
        { title: 'Manual Setup', items: [['cbCountry', 'Country'], ['cbOperators', 'Operator'], ['tGPRSAPN', 'APN'], ['tGPRSUserName', 'APN Username'], ['tGPRSPassword', 'APN Password'],
          ['tMMSC', 'MMSC'], ['tMMSAPN', 'MMS APN'], ['tMMSProxy', 'MMS Proxy'], ['tMMSPort', 'MMS Port'], ['tMMSUserName', 'MMS Username'], ['tMMSPassword', 'MMS Password']] },
        { title: 'SMTP', items: [['cbSMTPSwitch', 'SMTP'], ['tSMTPIP', 'Server'], ['tSMTPPort', 'Port'], ['rbEncrypt', 'Encryption'], ['tSMTPAccount', 'Username'], ['tSMTPPassword', 'Password']] },
        { title: 'FTP(S)', items: [['cbFTPSwitch', 'FTP(S)'], ['tFTPIP', 'Server'], ['tFTPPort', 'Port'], ['tFTPAccount', 'Username'], ['tFTPPassword', 'Password']] },
        { title: 'Send To', items: [['tPhone1', 'Phone 1'], ['tPhone2', 'Phone 2'], ['tPhone3', 'Phone 3'], ['tPhone4', 'Phone 4'],
          ['tEmail1', 'Email 1'], ['tEmail2', 'Email 2'], ['tEmail3', 'Email 3'], ['tEmail4', 'Email 4'], ['tSMTPCamName', 'Camera Name']] },
        { title: 'Transfer Mode', items: [['cbTransPhoto', 'Send Photos'], ['cbTransVideo', 'Send Videos']] },
        { title: 'Send Options', items: [['cbPicSize', 'Send Photo Size'], ['PCBit', 'Send Which Shots']] },
        { items: [['nudMMSMax', 'Max Num/Day'], ['cbSMSCtrl', 'SMS Ctrl'], ['cbDailyReport', 'Daily Report'], ['cbGPS', 'GPS']] }] },
      { title: 'Other', groups: [{ items: [
        ['cbLanguage', 'Language'], ['cbDateTime', 'Date Time (set from Mac)'], ['cbTZSwitch', 'Time Zone'],
        ['cbDateType', 'Date Type', ONCAM], ['cbHourSystem', 'Hour System', ONCAM], ['cbStamp', 'Stamp'], ['cbBattery', 'Battery Type'],
        ['cbSDCycle', 'SD Cycle'], ['cbPassword', 'Password', 'The camera turns the password on/off from the card but ignores the digits — enter the digits on the camera.']] }] },
    ];
  }
  if (typeof module !== 'undefined' && module.exports) module.exports = MODELS;
})(this);
