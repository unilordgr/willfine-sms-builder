// Parameter.cfg encoder/decoder — byte-for-byte port of the Save/Load logic in
// "SY_PC Tools-TrailCamera V2.4" (reverse engineered; see PARAMETER_CFG_FORMAT.md).
//
// File layout:
//   0x00 "MMS" | 0x03 modify mask (1=4G/3G tab, 2=Camera tab, 4=Other tab)
//   0x04 device type | 0x05 protocol version | rest of header 0xFF
//   0x10.. index entries [offHi, offLo, len], restarting at 0x100 / 0x180
//   0x200.. packed field data, unused bytes 0xFF
// The file is truncated right after the last field.
(function (root) {
  const DATA_START = 0x200;
  const FILE_NAME = 'Parameter.cfg';

  function ctlKey(f) { return Array.isArray(f.ctl) ? f.ctl[0] : f.ctl; }

  // Windows "Encoding.Default" ≈ cp1252; the camera only understands ASCII anyway.
  function strBytes(s) {
    const out = [];
    for (const ch of String(s)) { const c = ch.charCodeAt(0); out.push(c < 256 ? c : 63); }
    return out;
  }
  function bytesStr(b) {
    let s = '';
    for (const c of b) { if (c === 0xff || c === 0) break; s += String.fromCharCode(c); }
    return s;
  }
  const pad2 = n => String(n).padStart(2, '0');
  function nowStamp(d) {
    d = d || new Date();
    return d.getFullYear() + pad2(d.getMonth() + 1) + pad2(d.getDate()) +
      pad2(d.getHours()) + pad2(d.getMinutes()) + pad2(d.getSeconds());
  }

  // Default settings for a model, matching what the Windows form shows on open.
  function defaults(model) {
    const v = {};
    const d = model.defaults || {};
    for (const f of model.fields) {
      const k = ctlKey(f);
      switch (f.kind) {
        case 'select': v[k] = d[k] != null ? d[k] : 0; break;
        case 'check': v[k] = d[f.ctl] != null ? !!d[f.ctl] : true; break; // ticked "OFF" box
        case 'max': v[k] = { unlimited: d[f.chk] != null ? !!d[f.chk] : true, value: 1 }; break;
        case 'radio': v[k] = 0; break;
        case 'bits': {
          let m = 0; for (let i = 0; i < 5; i++) if (d['PCBit' + i]) m |= 1 << i;
          v[k] = m || 1; break;
        }
        case 'tobyte': {
          const opts = (model.labels[f.ctl] || ['5']);
          v[k] = parseInt(opts[d[f.ctl] || 0], 10) || 5; break;
        }
        case 'nud': v[k] = 5; break;
        case 'tz': v[k] = d.cbTimeZone != null ? d.cbTimeZone : 25; break;
        case 'time': v[k] = /Delay|TimeLapse/.test(f.ctl) ? '000005' : '000000'; break;
        case 'range': v[k] = ['000000', '000000']; break;
        case 'text': v[k] = ''; break;
        case 'now': v[k] = ''; break;
      }
    }
    return v;
  }

  // values: { ctlName: value } ; modify: bitmask of tabs the camera should apply.
  function encode(model, values, modify, opts) {
    opts = opts || {};
    const buf = new Uint8Array(65536).fill(0xff);
    buf[0] = 77; buf[1] = 77; buf[2] = 83;
    buf[3] = modify & 0xff;
    buf[4] = model.devType;
    buf[5] = model.version || 1;
    let idx = 16, off = DATA_START;
    const warnings = [];
    for (const f of model.fields) {
      const k = ctlKey(f);
      const v = values[k];
      let bytes;
      switch (f.kind) {
        case 'select': bytes = [(v | 0) & 0xff]; break;
        case 'check': bytes = [v ? f.checked_value : 1 - f.checked_value]; break;
        case 'max': bytes = [v && v.unlimited ? 0 : ((v && v.value) | 0) & 0xff]; break;
        case 'radio': bytes = [(v | 0) & 0xff]; break;
        case 'bits': {
          const m = (v | 0) & 0x1f;
          // Windows tool: more than just Pic1 is only honoured when the Camera tab is modified
          const sum = m;
          bytes = [sum > 1 && (modify & 2) ? sum : 1];
          break;
        }
        case 'tobyte': bytes = [(v | 0) & 0xff]; break;
        case 'nud': bytes = [((v | 0) - (f.minus || 0)) & 0xff]; break;
        case 'tz': {
          const t = f.values[v | 0];
          bytes = [(t == null ? 0 : t) & 0xff, 0, 0];
          break;
        }
        case 'time': bytes = strBytes(String(v || '000000').padEnd(6, '0').slice(0, 6)); break;
        case 'range': {
          const a = (v && v[0]) || '000000', b = (v && v[1]) || '000000';
          bytes = strBytes(a.slice(0, 6) + '-' + b.slice(0, 6));
          break;
        }
        case 'now': bytes = strBytes(opts.now || nowStamp()); break;
        case 'text': {
          let s = String(v == null ? '' : v);
          if (f.trim) s = s.trim();
          if (k === 'tbPassword') {
            const pwOff = values.cbPassword; // ticked "OFF" box
            if (!pwOff && s.length < 6) { s = ''; warnings.push('Password must be 6 digits — it was cleared.'); }
          }
          if (f.pad_space_min && k === 'tbCameraID' && !values.cbCameraID && s.length < f.pad_space_min) {
            s = s.padEnd(f.pad_space_min, ' ');
          }
          if (s.length > f.len) { warnings.push(`${k} too long — cut to ${f.len} characters.`); s = s.slice(0, f.len); }
          bytes = strBytes(s);
          break;
        }
        default: throw new Error('Unknown field kind ' + f.kind);
      }
      if (f.index_at != null) idx = f.index_at;
      // Stored length can differ from the space reserved (time zone: stores 1, reserves 3).
      const elen = f.elen != null ? f.elen : f.len;
      buf[idx] = (off >> 8) & 0xff; buf[idx + 1] = off & 0xff; buf[idx + 2] = elen;
      for (let i = 0; i < bytes.length && i < elen; i++) buf[off + i] = bytes[i];
      idx += 3; off += f.len;
    }
    return { bytes: buf.slice(0, off), warnings };
  }

  function header(bytes) {
    if (!bytes || bytes.length < 16 || bytes[0] !== 77 || bytes[1] !== 77 || bytes[2] !== 83) return null;
    return { modify: bytes[3], devType: bytes[4], version: bytes[5] };
  }

  // Returns { modify, values } or throws with a readable message.
  function decode(model, bytes) {
    const h = header(bytes);
    if (!h) throw new Error('Not a camera config file (missing "MMS" header).');
    if (h.devType !== model.devType) throw new Error(`This file is for a different camera type (device type ${h.devType}).`);
    if (h.version !== (model.version || 1)) throw new Error(`Protocol version ${h.version} does not match ${model.version || 1}.`);
    const values = {};
    let idx = 16;
    for (const f of model.fields) {
      if (f.index_at != null) idx = f.index_at;
      const off = (bytes[idx] << 8) | bytes[idx + 1];
      const len = bytes[idx + 2];
      idx += 3;
      const raw = Array.from(bytes.slice(off, off + len));
      const b0 = raw[0];
      const k = ctlKey(f);
      switch (f.kind) {
        case 'select': case 'radio': case 'tobyte': values[k] = b0; break;
        case 'check': values[k] = b0 === f.checked_value; break;
        case 'max': values[k] = b0 === 0 ? { unlimited: true, value: 1 } : { unlimited: false, value: b0 }; break;
        case 'bits': values[k] = b0; break;
        case 'nud': values[k] = b0 + (f.minus || 0); break;
        case 'tz': { const i = f.values.indexOf(b0 > 127 ? b0 - 256 : b0); values[k] = i < 0 ? 25 : i; break; }
        case 'time': values[k] = bytesStr(raw) || '000000'; break;
        case 'range': { const s = bytesStr(raw).split('-'); values[k] = [s[0] || '000000', s[1] || '000000']; break; }
        case 'now': values[k] = bytesStr(raw); break;
        case 'text': values[k] = bytesStr(raw); break;
      }
    }
    return { modify: h.modify, values };
  }

  // Which model(s) a file belongs to (4.0CG and 4.8CG share device type 4).
  function modelsFor(models, bytes) {
    const h = header(bytes);
    if (!h) return [];
    return Object.keys(models).filter(k => models[k].devType === h.devType);
  }

  const api = { encode, decode, defaults, header, modelsFor, nowStamp, FILE_NAME, ctlKey };
  if (typeof module !== 'undefined' && module.exports) module.exports = api; else root.WF_CODEC = api;
})(this);
